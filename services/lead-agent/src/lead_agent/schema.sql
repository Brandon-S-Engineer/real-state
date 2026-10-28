-- CRM de demo de Volt Mobile. Vive en su propio schema; el inventario se lee de
-- agent_demo.products (proyecto 1). Los checkpoints de LangGraph van en
-- lead_agent_ckpt.

CREATE SCHEMA IF NOT EXISTS lead_agent;
CREATE SCHEMA IF NOT EXISTS lead_agent_ckpt;

CREATE TABLE IF NOT EXISTS lead_agent.contacts (
  id          serial PRIMARY KEY,
  contact_key text UNIQUE NOT NULL,          -- email o teléfono
  name        text,
  source      text NOT NULL DEFAULT 'whatsapp',
  interest    text,
  budget_mxn  int,
  score       int,
  stage       text NOT NULL DEFAULT 'new'
              CHECK (stage IN ('new', 'qualified', 'quoted', 'won', 'lost')),
  is_seed     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_agent.activities (
  id          serial PRIMARY KEY,
  contact_id  int NOT NULL REFERENCES lead_agent.contacts(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('note', 'message', 'followup', 'stage_change')),
  note        text NOT NULL,
  due_at      timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
