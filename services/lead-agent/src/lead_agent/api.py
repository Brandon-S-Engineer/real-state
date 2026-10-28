"""API del lead agent (FastAPI).

POST /leads                  corre el grafo hasta la aprobación; NDJSON en vivo
POST /leads/{id}/decision    aprueba/edita/rechaza y ejecuta vía MCP; NDJSON
GET  /crm                    pipeline del CRM para el kanban
GET  /health                 también sirve para despertar el servicio
"""

import json
import os
import sys
import time
import uuid
from collections import defaultdict
from contextlib import AsyncExitStack, asynccontextmanager
from pathlib import Path
from typing import Any

import psycopg
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.types import Command
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

from lead_agent.config import settings
from lead_agent.graph import WRITE_TOOLS, build_graph
from lead_agent.seed import SEED_CONTACTS

STATE: dict[str, Any] = {}


def _ckpt_url() -> str:
    sep = "&" if "?" in settings.database_url else "?"
    return f"{settings.database_url}{sep}options=-csearch_path%3Dlead_agent_ckpt"


def _setup_db() -> None:
    with psycopg.connect(settings.database_url, autocommit=True) as conn:
        conn.execute((Path(__file__).parent / "schema.sql").read_text())
        # Los leads de visitantes se borran a las 24 h; los de ejemplo se quedan.
        conn.execute("DELETE FROM lead_agent.contacts WHERE NOT is_seed AND created_at < now() - interval '24 hours'")
        if not conn.execute("SELECT 1 FROM lead_agent.contacts WHERE is_seed LIMIT 1").fetchone():
            for c in SEED_CONTACTS:
                row = conn.execute(
                    """INSERT INTO lead_agent.contacts (contact_key, name, interest, budget_mxn, score, stage, is_seed)
                       VALUES (%s,%s,%s,%s,%s,%s,true) RETURNING id""",
                    (c["contact_key"], c["name"], c["interest"], c["budget_mxn"], c["score"], c["stage"]),
                ).fetchone()
                conn.execute(
                    "INSERT INTO lead_agent.activities (contact_id, kind, note) VALUES (%s, 'note', %s)",
                    (row[0], c["note"]),
                )


@asynccontextmanager
async def lifespan(_: FastAPI):
    _setup_db()
    async with AsyncExitStack() as stack:
        # El servidor MCP corre como subproceso y se habla con él por stdio.
        params = StdioServerParameters(command=sys.executable, args=["-m", "lead_agent.crm_mcp"], env=dict(os.environ))
        read, write = await stack.enter_async_context(stdio_client(params))
        session = await stack.enter_async_context(ClientSession(read, write))
        await session.initialize()
        tools = (await session.list_tools()).tools
        write_specs = "\n".join(
            json.dumps({"name": t.name, "description": t.description, "input_schema": t.inputSchema})
            for t in tools
            if t.name in WRITE_TOOLS
        )

        checkpointer = await stack.enter_async_context(AsyncPostgresSaver.from_conn_string(_ckpt_url()))
        await checkpointer.setup()

        STATE["graph"] = build_graph(session, write_specs, settings.model, checkpointer)
        STATE["tools"] = [t.name for t in tools]
        yield


app = FastAPI(title="Volt Mobile lead agent", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

_hits: dict[str, list[float]] = defaultdict(list)


def _check_rate(req: Request) -> None:
    ip = (req.headers.get("x-forwarded-for") or (req.client.host if req.client else "local")).split(",")[0].strip()
    now = time.time()
    _hits[ip] = [t for t in _hits[ip] if now - t < 3600]
    if len(_hits[ip]) >= settings.runs_per_hour:
        raise HTTPException(429, "Demo limit reached for this hour.")
    _hits[ip].append(now)


def _ndjson(event: dict) -> bytes:
    return (json.dumps(event, ensure_ascii=False, default=str) + "\n").encode()


async def _stream(graph_input, thread_id: str):
    graph = STATE["graph"]
    config = {"configurable": {"thread_id": thread_id}}
    started = time.perf_counter()
    try:
        async for mode, chunk in graph.astream(graph_input, config, stream_mode=["updates", "messages"]):
            if mode == "messages":
                msg, meta = chunk
                if meta.get("langgraph_node") == "draft_reply" and getattr(msg, "content", ""):
                    yield _ndjson({"type": "token", "text": msg.content})
                continue
            for node, update in chunk.items():
                if node == "__interrupt__":
                    yield _ndjson({"type": "awaiting_approval", "thread_id": thread_id, **update[0].value})
                else:
                    yield _ndjson({"type": "node", "node": node, "data": update, "ms": round((time.perf_counter() - started) * 1000)})
        yield _ndjson({"type": "end", "ms": round((time.perf_counter() - started) * 1000)})
    except Exception as e:  # noqa: BLE001 — se reporta al cliente y al log
        print(f"[lead-agent] {e!r}", flush=True)
        yield _ndjson({"type": "error", "message": "The agent failed. Please try again."})


class LeadIn(BaseModel):
    message: str = Field(min_length=3, max_length=800)
    name: str | None = Field(default=None, max_length=80)
    contact_key: str = Field(min_length=5, max_length=120, description="Email or phone")


class DecisionIn(BaseModel):
    approved: bool
    actions: list[dict] | None = None


@app.get("/health")
async def health():
    return {"ok": True, "model": settings.model, "mcp_tools": STATE.get("tools", [])}


@app.post("/leads")
async def run_lead(body: LeadIn, req: Request):
    _check_rate(req)
    thread_id = str(uuid.uuid4())
    graph_input = {"message": body.message, "name": body.name, "contact_key": body.contact_key.strip().lower()}

    async def gen():
        yield _ndjson({"type": "thread", "thread_id": thread_id, "model": settings.model})
        async for line in _stream(graph_input, thread_id):
            yield line

    return StreamingResponse(gen(), media_type="application/x-ndjson")


@app.post("/leads/{thread_id}/decision")
async def decide(thread_id: str, body: DecisionIn):
    graph = STATE["graph"]
    snapshot = await graph.aget_state({"configurable": {"thread_id": thread_id}})
    if not snapshot.next or snapshot.next[0] != "approval":
        raise HTTPException(409, "This lead is not waiting for approval.")
    resume = {"approved": body.approved, **({"actions": body.actions} if body.actions is not None else {})}
    return StreamingResponse(_stream(Command(resume=resume), thread_id), media_type="application/x-ndjson")


@app.get("/crm")
async def crm():
    async with await psycopg.AsyncConnection.connect(settings.database_url, row_factory=dict_row) as conn:
        contacts = await (
            await conn.execute(
                """SELECT id, contact_key, name, interest, budget_mxn, score, stage, is_seed, updated_at
                   FROM lead_agent.contacts ORDER BY updated_at DESC LIMIT 60"""
            )
        ).fetchall()
        activities = await (
            await conn.execute(
                """SELECT a.kind, a.note, a.due_at, a.created_at, c.name, c.contact_key
                   FROM lead_agent.activities a JOIN lead_agent.contacts c ON c.id = a.contact_id
                   ORDER BY a.created_at DESC LIMIT 12"""
            )
        ).fetchall()
    return {"contacts": contacts, "activities": activities}
