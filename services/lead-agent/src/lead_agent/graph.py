"""Grafo LangGraph del lead agent.

    qualify → lookup → draft_reply → propose_actions → approval ⏸ → execute

- qualify / draft_reply / propose_actions: LLM con salida estructurada.
- lookup y execute: llamadas deterministas al servidor MCP del CRM.
- approval: `interrupt()` pausa el grafo (estado guardado en Postgres) hasta que
  un humano aprueba, edita o rechaza las acciones. Nada se escribe antes.
"""

import json
from typing import Any, Literal, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt
from mcp import ClientSession
from pydantic import BaseModel, Field

from lead_agent.config import settings

# Hechos de la tienda que el borrador puede citar (los mismos que las
# políticas del proyecto 1). Fuera de esto, no promete nada.
STORE_FACTS = [
    "Trade-in: iPhone 11 or newer, must power on and be unlocked from iCloud; value confirmed after inspection, applied as store credit.",
    "Interest-free installments (3, 6 or 9 MSI) on purchases over 4,000 MXN with participating credit cards.",
    "Every device has a 12-month warranty. Returns within 30 days.",
    "Same-day shipping if paid before 2 pm; express 1–2 days in CDMX, Guadalajara and Monterrey.",
]

WRITE_TOOLS = ("upsert_contact", "update_stage", "log_activity", "schedule_followup")


class Qualification(BaseModel):
    intent: Literal["buy", "trade_in", "support", "spam", "other"]
    models_of_interest: list[str] = Field(description='Models the customer wants to BUY, e.g. ["iPhone 15 Pro"]. Empty if none.')
    trade_in_device: str | None = Field(description="Device the customer offers as trade-in, if any.")
    budget_mxn: int | None = Field(description="Budget in MXN if stated or clearly implied, else null.")
    urgency: Literal["now", "this_month", "browsing"]
    score: int = Field(description="Likelihood to buy soon, integer from 0 to 100 (e.g. 85 = very likely).")
    summary: str = Field(description="One sentence for the salesperson.")


class Action(BaseModel):
    tool: Literal["upsert_contact", "update_stage", "log_activity", "schedule_followup"]
    args: dict[str, Any] = Field(description="Arguments exactly as the tool schema expects.")
    why: str = Field(description="Short reason shown to the human approver.")


class ActionPlan(BaseModel):
    actions: list[Action]


class LeadState(TypedDict, total=False):
    message: str
    name: str | None
    contact_key: str
    qualification: dict
    existing_contact: dict | None
    inventory: list[dict]
    reply: str
    actions: list[dict]
    decision: dict
    results: list[dict]


def _tool_json(result) -> Any:
    """Contenido de un CallToolResult de MCP como JSON."""
    if result.isError:
        return {"error": "".join(getattr(c, "text", "") for c in result.content)}
    if result.structuredContent is not None:
        sc = result.structuredContent
        return sc.get("result", sc) if isinstance(sc, dict) and set(sc) == {"result"} else sc
    text = "".join(getattr(c, "text", "") for c in result.content)
    try:
        return json.loads(text)
    except ValueError:
        return text


def build_graph(session: ClientSession, write_tool_specs: str, model: str, checkpointer):
    llm = ChatOpenAI(model=model, api_key=settings.openai_api_key, temperature=0.1)

    async def qualify(state: LeadState) -> LeadState:
        q = await llm.with_structured_output(Qualification).ainvoke(
            [
                SystemMessage(
                    "You qualify inbound WhatsApp leads for Volt Mobile, a Mexican store selling refurbished iPhones. "
                    "Extract the fields. Score on a 0–100 scale: clear model + budget + urgency is 70+, vague browsing is under 40, spam is 0."
                ),
                HumanMessage(state["message"]),
            ]
        )
        return {"qualification": q.model_dump()}

    async def lookup(state: LeadState) -> LeadState:
        q = state["qualification"]
        existing = _tool_json(await session.call_tool("find_contact", {"contact_key": state["contact_key"]}))
        inventory: list[dict] = []
        if q["intent"] in ("buy", "trade_in"):
            for m in q["models_of_interest"] or [None]:
                args = {"model": m} if m else {}
                if q["budget_mxn"]:
                    args["max_price_mxn"] = int(q["budget_mxn"] * 1.1)
                hits = _tool_json(await session.call_tool("search_inventory", args))
                inventory += hits if isinstance(hits, list) else []
        return {"existing_contact": existing or None, "inventory": inventory[:8]}

    async def draft_reply(state: LeadState) -> LeadState:
        msg = await llm.ainvoke(
            [
                SystemMessage(
                    "Write the WhatsApp reply a Volt Mobile salesperson would send. Same language as the customer. "
                    "Max 4 short sentences. Use ONLY the inventory and store facts given; never invent prices, stock or policies. "
                    "If nothing matches, say so and offer the closest option or to notify them. End with one question "
                    "that moves the sale forward. If the message is spam, reply with an empty string."
                ),
                HumanMessage(
                    json.dumps(
                        {
                            "customer_message": state["message"],
                            "customer_name": state.get("name"),
                            "qualification": state["qualification"],
                            "inventory": state["inventory"],
                            "store_facts": STORE_FACTS,
                        },
                        ensure_ascii=False,
                    )
                ),
            ]
        )
        return {"reply": str(msg.content).strip()}

    async def propose_actions(state: LeadState) -> LeadState:
        # args es un objeto abierto: el modo strict de structured outputs no lo
        # admite, así que se usa function calling (los args los valida MCP).
        plan = await llm.with_structured_output(ActionPlan, method="function_calling").ainvoke(
            [
                SystemMessage(
                    "Propose the CRM updates for this lead using ONLY these MCP tools:\n"
                    f"{write_tool_specs}\n\n"
                    "Rules: use contact_key exactly as given. Always upsert_contact first (with name, interest, "
                    "budget_mxn and score). Then one update_stage: 'quoted' if the drafted reply mentions a price, "
                    "otherwise 'qualified' when score >= 50; skip it if neither applies. Log the drafted reply with log_activity kind='message'. Schedule a follow-up "
                    "when urgency is not 'browsing'. For spam propose no actions."
                ),
                HumanMessage(
                    json.dumps(
                        {
                            "contact_key": state["contact_key"],
                            "name": state.get("name"),
                            "existing_contact": state["existing_contact"],
                            "qualification": state["qualification"],
                            "drafted_reply": state["reply"],
                        },
                        ensure_ascii=False,
                    )
                ),
            ]
        )
        return {"actions": [a.model_dump() for a in plan.actions]}

    def approval(state: LeadState) -> LeadState:
        # Pausa aquí. Se reanuda con Command(resume={"approved": bool, "actions": [...]}).
        decision = interrupt({"reply": state["reply"], "actions": state["actions"]})
        return {"decision": decision}

    async def execute(state: LeadState) -> LeadState:
        decision = state["decision"]
        if not decision.get("approved"):
            return {"results": []}
        results = []
        for a in decision.get("actions", state["actions"]):
            if a.get("tool") not in WRITE_TOOLS:
                results.append({"tool": a.get("tool"), "error": "Tool not allowed"})
                continue
            out = _tool_json(await session.call_tool(a["tool"], a.get("args", {})))
            results.append({"tool": a["tool"], "args": a.get("args", {}), "result": out})
        return {"results": results}

    g = StateGraph(LeadState)
    for name, fn in [
        ("qualify", qualify),
        ("lookup", lookup),
        ("draft_reply", draft_reply),
        ("propose_actions", propose_actions),
        ("approval", approval),
        ("execute", execute),
    ]:
        g.add_node(name, fn)
    g.add_edge(START, "qualify")
    g.add_edge("qualify", "lookup")
    g.add_edge("lookup", "draft_reply")
    g.add_edge("draft_reply", "propose_actions")
    g.add_edge("propose_actions", "approval")
    g.add_edge("approval", "execute")
    g.add_edge("execute", END)
    return g.compile(checkpointer=checkpointer)
