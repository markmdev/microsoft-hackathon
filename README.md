# Personal Lawyer Live Docket

Hackathon-ready Copilot experience for personal injury lawyers. The app ingests police-report data from Google Sheets, stages it in a flashy dashboard, and surfaces triage alerts, legal follow-ups, and AI-assisted summaries via CopilotKit + LlamaIndex.

## Stack Overview
- **UI**: Next.js (App Router), Tailwind, CopilotKit React UI, AG-UI interaction patterns
- **Agent**: Python FastAPI service (`agent/`) running LlamaIndex with Composio MCP tooling
- **Data Source**: Google Sheets (read via Composio) – lawyer teammate uploads CSV data to a single tab
- **Notifications & Preferences**: In-memory profile store on the Python agent with UI controls for triage filters
- **Outbound Hooks**: Resend (email) placeholder wired in UI, outbound voice button reserved for teammate integration

## Feature Highlights
- Google Sheet ingestion with column normalization (`incident_id`, `full_name`, `incident_category`, etc.)
- Live incident feed that reveals queued reports every few seconds to mimic real-time intake
- Summary metrics (injury count, property damage count, per-category totals)
- Triage preference panel (categories, jurisdictions, injury/property toggles) stored server-side
- Alert panel listing incidents matching the profile; dismissable in UI
- Copilot chat (CopilotKit + LlamaIndex) grounded on shared dashboard state for natural language queries

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.10+
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/) (for Python deps)
- OpenAI API key (`agent/.env`)
- Composio API key & Google Sheets auth config (`agent/.env`)

### Install & Run
```bash
# Install (installs Node + Python deps)
pnpm install
# or npm install / yarn install / bun install

# Start both Next.js UI and Python agent
yarn dev
# or pnpm dev / npm run dev / bun run dev

# UI: http://localhost:3000
# Agent: http://localhost:9000
```

Configure secrets in `agent/.env` (copy from `agent/.env.example`) and optional frontend keys in `.env.local`.

## Importing Google Sheet Data
1. Prepare a Google Sheet tab with the following headers (case-insensitive):
   ```
   incident_id, full_name, sex, home_address, phone_number,
   incident_date, incident_time, location, incident_category,
   resolution, injury_reported, property_damage,
   fault_determination, incident_description
   ```
2. Launch the app and open the **Google Sheets Connection** card.
3. Paste the sheet ID (from the Sheets URL) and optional tab name, then click **Import cases**.
4. The first N cases (default 4) populate instantly; the rest stream into the live feed every 5 seconds.

## Triage Preferences & Alerts
- Update categories or jurisdictions to monitor from the **Triage Preferences** form. Preferences persist on the backend (`/profile/triage`).
- Toggle **Alert only when an injury is reported** to focus on more severe incidents.
- Disable property-damage-only alerts by unchecking **Include property-damage-only incidents**.
- Matching incidents appear in the **Triage Alerts** panel; dismissing hides them client-side while the backend keeps historical matches for re-imports.

## Copilot Chat
`<CopilotChat />` (from CopilotKit) is embedded at the bottom of the dashboard. It uses the shared `DashboardState` and LlamaIndex agent instructions defined in `agent/agent/agent.py`. Use it to:
- Summarize newest incidents (the model reads `cases` + `queuedCases`)
- Ask for follow-up tasks or email drafts (Resend integration stub)
- Confirm triage configuration and next steps

## Project Structure
```
.
├── agent/
│   ├── agent.py               # LlamaIndex agent + system prompt + shared state
│   ├── server.py              # FastAPI endpoints (/sheets/sync, /profile, ...)
│   ├── sheets_integration.py  # Google Sheets ingestion + triage evaluation
│   └── profile.py             # Backend profile store for triage prefs
├── src/
│   ├── app/page.tsx           # Next.js dashboard (live feed, metrics, chat)
│   ├── app/api/               # Next.js API routes proxying to Python agent
│   ├── components/dashboard/  # Dashboard UI building blocks
│   └── lib/dashboard/         # Shared types + API helpers
└── docs/                      # Source schema example + LLM doc links
```

## Development Tips
- Live feed cadence (`intervalMs`) and streaming toggle live in shared state (`DashboardState.liveFeed`). Adjust via `useCoAgent` or Python initial state.
- To re-run triage after editing preferences, simply save the form—the UI calls `/profile/triage` then re-imports the sheet.
- The Resend + voice call actions are currently console stubs. Wire actual APIs by extending `onSendEmail` / `onTriggerVoiceCall` in `page.tsx`.

## Roadmap
- Hook Resend SDK for real outbound notifications
- Swap voice-call button to teammate’s integration endpoint
- Persist profile + notifications to a durable store (Redis/Postgres) if required
- Add richer charts (Recharts already installed) for category trends and response SLAs
- Expand case workflow with tasks / notes for CRM-style functionality once MVP is locked
