# Agent Smith Platform

**A sovereign AI‑powered GovTech stack** that fuses advanced language models, blockchain immutability and modular organisational tooling to streamline public‑sector workflows and citizen engagement.

---

## ✨ Key Capabilities

| Module                  | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| 🏛 **Organisation**     | Build ministries → departments → roles with drag‑and‑drop editing.       |
| 🤖 **AI Agents**        | Configure task‑specific agents (LLM + RAG) and export them as templates. |
| 📝 **Citizen Requests** | Auto‑classify, route and answer incoming tickets.                        |
| 🎙 **Meeting Minutes**  | Record → transcribe → summarise and extract actions.                     |
| 🔄 **Translator**       | Real‑time KK / RU / EN speech‑to‑text and document translation.          |
| 📊 **Analytics**        | Live dashboards, AI‑generated insights, trend lines.                     |
| 📚 **Documents**        | Store, analyse and notarise files on Hyperledger Besu.                   |
| 📋 **Task Board**       | Kanban with status tracking and performance metrics.                     |
| 🗳 **DAO Voting**       | Blockchain‑verified proposals & ballots.                                 |
| 📱 **Responsive UI**    | Works seamlessly on desktop, tablet and mobile.                          |

---

## 🚀 Why It Matters

* **60–80 % bureaucracy reduction** through automated triage and responses.
* **Blockchain certainty** – every decision and document hash is logged immutably.
* **Instant multilingual service** – citizens switch languages on the fly.
* **Composable agents** – adapt intelligence to any government function.
* **Full transparency** – end‑to‑end audit trail & on‑chain governance.
* **Templates & export** – clone configurations across deployments.

---

## 🔧 Tech Stack

### Front‑end

* React + TypeScript
* Wouter (routing)
* TanStack Query
* shadcn/ui & Radix UI
* Tailwind CSS
* Zod + React Hook Form
* Recharts
* Lucide React

### Back‑end

* Node.js + Express (ESM, TypeScript)
* PostgreSQL (Neon serverless option)
* Drizzle ORM + drizzle‑zod
* WebSockets, Multer, Vite, Swagger

### AI Integrations

* OpenAI GPT‑4o
* Anthropic Claude
* Retrieval Augmented Generation (RAG)

### Blockchain

* Hyperledger Besu
* Moralis API

### Storage

* Memory / PostgreSQL / Supabase (switchable)

---

## 🏁 Getting Started

### Prerequisites

* Node.js v20+
* PostgreSQL 15+ **or** Neon Database account
* API keys for OpenAI, Anthropic, Moralis (optional)

### Installation

```bash
git clone https://github.com/<your‑org>/agent-smith-platform.git
cd agent-smith-platform
npm install

# copy environment template
cp .env.example .env   # edit with your keys

# push schema to database
npm run db:push

# start dev mode
npm run dev   # → http://localhost:5000
```

---

## 🤖 Configuring AI Agents

| Agent                | Function                                 |
| -------------------- | ---------------------------------------- |
| **CitizenAssistant** | Triage & respond to citizen tickets.     |
| **ProtocolMaster**   | Parse meeting minutes & extract actions. |
| **TranslatorAI**     | Real‑time speech / document translation. |
| **KnowledgeAgent**   | RAG answer engine on internal docs.      |
| **AppealTracker**    | Monitor and chase unresolved appeals.    |

Create or edit agents via **Admin → AI Agents**. Use **Export** to save a template JSON for reuse elsewhere.

---

## ⬆ Export / Import

Easily move the following between instances:

* AI‑agent configurations
* Organisational hierarchies
* Task‑routing rules
* System settings

Ideal for staging → production promotion or multi‑tenant rollout.

---

## 🛠 Development Guidelines

* **Add a new agent** – extend `storage.ts` and `agent-service.ts`.
* **Add front‑end features** – build components in `client/src/components/` and pages in `client/src/pages/`.
* **Add API routes** – register endpoints in `server/routes.ts`.
* Code must pass `npm run lint` and `npm run test` before merge.

---

## 📜 License
under development ---

## 💌 Contact & Support
* Email: [azrail@obscura.kz](mailto:azrail@obscura.kz)
* Website: [https://qosi.kz](https://qosi.kz)

* Made with ❤️ by the Maxat Bekes
