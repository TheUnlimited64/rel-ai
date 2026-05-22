# 🔁 rel-ai — The LLM Relay

**rel-ai** (pronounced *"rel-ay"*, from French *relais* = relay) is your **private, self-hosted AI proxy**. Route requests to any LLM provider through one OpenAI-compatible endpoint — with automatic fallback, virtual models, and a slick admin dashboard.

```
  Your tools (agents, chatbots, IDEs)
         │
         ▼
    ┌────────────────┐
    │    rel-ai     │  ← single endpoint, auth, routing
    │  (the relay)   │
    └──┬─────┬─────┬─┘
       │     │     │
       ▼     ▼     ▼
    OpenAI Anthropic Custom...
```

## ✨ Features

- **🔌 Universal API** — expose one OpenAI-compatible endpoint, route to any provider
- **🔄 Auto-fallback** — if OpenAI rate-limits you, rel-ai tries Anthropic, then your local LLM
- **🧠 Virtual Models** — create fallback chains (try A → B → C) or tuned models (override `thinking_effort`, `temperature`, etc.)
- **🔐 Key Vault** — API keys encrypted at rest (AES-256-GCM)
- **📊 Request Logging** — per-request token counts, latency, status — filterable in the dashboard
- **🎛️ Admin UI** — manage providers, models, endpoints, tokens — all from your browser
- **🛡️ Token Auth** — separate admin tokens and per-endpoint bearer tokens
- **🧑‍💻 First-Run Wizard** — guided setup: add provider → add model → create endpoint → start proxying
- **🐳 Single Container** — one `docker compose up` and you're done

## 🚀 Quick Start

```bash
git clone https://github.com/your-org/rel-ai.git
cd rel-ai
cp .env.example .env
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
docker compose up -d
```

Open **http://localhost:3000** — check the server logs for your auto-generated admin token.

```bash
docker logs rel-ai 2>&1 | grep "Admin token"
```

## 📖 Walkthrough

1. **Add a provider** — OpenAI, Anthropic, or any OpenAI-compatible API
2. **Add a model** — real (maps to a provider model), virtual fallback (chain), or virtual tuned (overrides)
3. **Create an endpoint** — gives you a URL like `http://localhost:3000/v1/my-agents/chat/completions` with its own bearer token
4. **Point your tools at it** — any OpenAI-compatible client works

## ⚙️ Configuration

| Variable | Default | Required | What it does |
|---|---|---|---|
| `ENCRYPTION_KEY` | auto-generated | recommended | AES-256-GCM key for encrypting API keys |
| `PORT` | `3000` | no | Server port |
| `DATABASE_URL` | `./data/rel-ai.db` | no | SQLite database path |
| `DATA_DIR` | `./data` | no | Directory for key file |

No other config — everything else is managed through the UI.

## 🏗️ Architecture

```
packages/
├── backend/     Bun + Hono server (tRPC API + OpenAI proxy)
├── frontend/    React SPA (shadcn/ui + Tailwind)
└── shared/      Zod schemas + types (shared between frontend & backend)
```

- **Database**: SQLite (embedded, zero-config, WAL mode)
- **Proxy**: OpenAI-compatible SSE streaming — works with any OpenAI SDK
- **Adapters**: Modular provider interface — add a new provider in ~50 lines

## 🧪 Stack

| Layer | Tech |
|---|---|
| Runtime | Bun |
| Backend | Hono + tRPC + Zod |
| Frontend | React 19 + React Router 7 + TanStack Query |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | SQLite via Drizzle ORM |
| Tests | Vitest + Playwright |

## 🐳 Deploy Anywhere

**Railway / Fly.io / Self-hosted VPS:**

Set `ENCRYPTION_KEY`, bind a volume for persistence, and you're live.

```yaml
services:
  rel-ai:
    image: ghcr.io/your-org/rel-ai:latest
    ports:
      - "3000:3000"
    environment:
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    volumes:
      - rel-ai-data:/app/data
```

## 🤔 Why "rel-ai"?

*Relais* is French for **relay** — a device that passes a signal forward. rel-ai sits between your tools and LLM providers, relaying requests with intelligence: routing, fallback, encryption, and observability. The "AI" part is self-explanatory. 😉

---

*Built for homelabs, designed for production.*
