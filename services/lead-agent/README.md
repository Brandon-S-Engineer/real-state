# Volt Mobile lead agent

Python service behind **Project 02** on [brandon-s-engineer.com](https://brandon-s-engineer.com).

An inbound WhatsApp lead goes through a LangGraph state machine:

```
qualify → lookup → draft_reply → propose_actions → approval ⏸ → execute
```

- **qualify / draft_reply / propose_actions** — OpenAI with structured output. The reply may only use inventory and store facts it was given.
- **lookup / execute** — calls to a custom **MCP server** (`crm_mcp.py`, FastMCP over stdio). It is the agent's only door into the CRM: `find_contact`, `search_inventory`, `upsert_contact`, `update_stage`, `log_activity`, `schedule_followup`.
- **approval** — `interrupt()` pauses the graph; state is checkpointed in Postgres (`AsyncPostgresSaver`), so a human can approve, deselect or reject actions later. Nothing is written before approval, and only allow-listed write tools can run.

## API

| Method | Path | |
|---|---|---|
| POST | `/leads` | Run a lead until approval. Streams NDJSON: node updates, reply tokens, `awaiting_approval`. |
| POST | `/leads/{thread_id}/decision` | `{approved, actions?}` — resume the graph and execute through MCP. |
| GET | `/crm` | Pipeline and recent activity. |
| GET | `/health` | Liveness + MCP tools discovered. |

## Run locally

```bash
uv sync
DATABASE_URL=... OPENAI_API_KEY=... uv run uvicorn lead_agent.api:app --reload
```

The schema (`lead_agent`, `lead_agent_ckpt`) is created on startup. Inventory is read from `agent_demo.products` (Project 01). Visitor leads are deleted after 24 h; seed contacts stay.

Stack: Python 3.12 · FastAPI · LangGraph · MCP Python SDK · psycopg 3 · Postgres (Neon) · Render.
