"""Servidor MCP del CRM de Volt Mobile.

Es la única puerta del agente al CRM: lecturas (find_contact, search_inventory)
y escrituras (upsert_contact, update_stage, log_activity, schedule_followup).
El agente lo consume como cliente MCP por stdio; las escrituras solo se
ejecutan después de que un humano las aprueba en el grafo.

    python -m lead_agent.crm_mcp
"""

from datetime import datetime, timedelta, timezone
from typing import Literal

import psycopg
from mcp.server.fastmcp import FastMCP
from psycopg.rows import dict_row

from lead_agent.config import settings

mcp = FastMCP("volt-crm")

Stage = Literal["new", "qualified", "quoted", "won", "lost"]


def _conn() -> psycopg.Connection:
    return psycopg.connect(settings.database_url, row_factory=dict_row, autocommit=True)


def _contact_id(cur: psycopg.Cursor, contact_key: str) -> int:
    cur.execute("SELECT id FROM lead_agent.contacts WHERE contact_key = %s", (contact_key.strip().lower(),))
    row = cur.fetchone()
    if not row:
        raise ValueError(f"No contact with key {contact_key!r}. Call upsert_contact first.")
    return row["id"]


def _jsonable(row: dict) -> dict:
    return {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}


@mcp.tool()
def find_contact(contact_key: str) -> dict | None:
    """Look up an existing CRM contact by email or phone, with its last 5 activities."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, contact_key, name, interest, budget_mxn, score, stage FROM lead_agent.contacts WHERE contact_key = %s",
            (contact_key.strip().lower(),),
        )
        contact = cur.fetchone()
        if not contact:
            return None
        cur.execute(
            "SELECT kind, note, due_at, created_at FROM lead_agent.activities WHERE contact_id = %s ORDER BY created_at DESC LIMIT 5",
            (contact["id"],),
        )
        return {**contact, "activities": [_jsonable(a) for a in cur.fetchall()]}


@mcp.tool()
def search_inventory(model: str | None = None, max_price_mxn: int | None = None) -> list[dict]:
    """Search devices in stock. Both filters are optional. Prices are in MXN."""
    where, params = ["stock > 0"], []
    if model:
        where.append("model ILIKE %s")
        params.append(f"%{model}%")
    if max_price_mxn:
        where.append("price_mxn <= %s")
        params.append(max_price_mxn)
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"SELECT sku, model, storage_gb, grade, color, price_mxn, stock FROM agent_demo.products WHERE {' AND '.join(where)} ORDER BY price_mxn LIMIT 6",
            params,
        )
        return cur.fetchall()


@mcp.tool()
def upsert_contact(
    contact_key: str,
    name: str | None = None,
    interest: str | None = None,
    budget_mxn: int | None = None,
    score: int | None = None,
    source: str = "whatsapp",
) -> dict:
    """Create a contact, or update it if one with this email/phone already exists. Returns the contact."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO lead_agent.contacts (contact_key, name, interest, budget_mxn, score, source)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON CONFLICT (contact_key) DO UPDATE SET
                 name = COALESCE(EXCLUDED.name, contacts.name),
                 interest = COALESCE(EXCLUDED.interest, contacts.interest),
                 budget_mxn = COALESCE(EXCLUDED.budget_mxn, contacts.budget_mxn),
                 score = COALESCE(EXCLUDED.score, contacts.score),
                 updated_at = now()
               RETURNING id, contact_key, name, interest, budget_mxn, score, stage""",
            (contact_key.strip().lower(), name, interest, budget_mxn, score, source),
        )
        return cur.fetchone()


@mcp.tool()
def update_stage(contact_key: str, stage: Stage, reason: str) -> dict:
    """Move a contact to another pipeline stage and log why."""
    with _conn() as conn, conn.cursor() as cur:
        cid = _contact_id(cur, contact_key)
        cur.execute("UPDATE lead_agent.contacts SET stage = %s, updated_at = now() WHERE id = %s", (stage, cid))
        cur.execute(
            "INSERT INTO lead_agent.activities (contact_id, kind, note) VALUES (%s, 'stage_change', %s)",
            (cid, f"→ {stage}: {reason}"),
        )
        return {"contact_key": contact_key, "stage": stage}


@mcp.tool()
def log_activity(contact_key: str, note: str, kind: Literal["note", "message"] = "note") -> dict:
    """Add a note or a sent message to the contact's timeline."""
    with _conn() as conn, conn.cursor() as cur:
        cid = _contact_id(cur, contact_key)
        cur.execute(
            "INSERT INTO lead_agent.activities (contact_id, kind, note) VALUES (%s, %s, %s) RETURNING id",
            (cid, kind, note),
        )
        return {"activity_id": cur.fetchone()["id"]}


@mcp.tool()
def schedule_followup(contact_key: str, due_in_hours: int, note: str) -> dict:
    """Schedule a follow-up task for a salesperson, due in N hours (1–168)."""
    hours = max(1, min(due_in_hours, 168))
    due = datetime.now(timezone.utc) + timedelta(hours=hours)
    with _conn() as conn, conn.cursor() as cur:
        cid = _contact_id(cur, contact_key)
        cur.execute(
            "INSERT INTO lead_agent.activities (contact_id, kind, note, due_at) VALUES (%s, 'followup', %s, %s)",
            (cid, note, due),
        )
        return {"due_at": due.isoformat()}


if __name__ == "__main__":
    mcp.run("stdio")
