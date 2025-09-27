## Description

Hackathon legal ops copilot built on Next.js + CopilotKit + LlamaIndex. The dashboard ingests police-report data from Google Sheets, stages it in a live feed, and equips personal-injury lawyers with triage alerts, case summaries, and quick follow-up actions (voice/email hooks).

## Architecture

- **UI**: Next.js (App Router), CopilotKit React SDK, AG-UI patterns
- **Agent Runtime**: Python FastAPI + LlamaIndex (`agent/agent/agent.py`)
- **Data Source**: Google Sheets via Composio MCP (read-only for now)
- **Notifications**: In-memory triage evaluation (server) + UI toasts/banners
- **Comms hooks**: Resend (emails) placeholder; outbound voice call triggers Vapi assistant via FastAPI proxy

## Data Source & Schema

We now rely exclusively on a single Google Sheet tab uploaded by the teammate. Required headers (case-insensitive):

```
incident_id, full_name, sex, home_address, phone_number,
incident_date, incident_time, location, incident_category,
resolution, injury_reported, property_damage,
fault_determination, incident_description
```

`incident_id` prefixes (e.g., `SF-`) double as jurisdiction codes. Injury/property columns expect `Yes/No` text.

## Current Implementation Highlights

- **Shared state** lives in `src/lib/dashboard/types.ts` (frontend) and `agent/agent/agent.py` (Python). Shape includes `cases`, `queuedCases`, `profile.triagePreferences`, `notifications`, `metrics`, and sheet binding metadata.
- **Google Sheets ingestion** handled by `agent/agent/sheets_integration.py#import_cases_from_sheet`, which
  - fetches rows via Composio tools
  - normalizes them into `CaseRecord` objects
  - computes summary metrics + triage notifications
  - splits cases into visible vs. queued to enable the live-feed animation.
- **FastAPI endpoints** (`agent/agent/server.py`)
  - `POST /sheets/sync`: ingest sheet + return dashboard payload
  - `POST /sheets/list`: enumerate tab names
  - `GET /profile`, `POST /profile/triage`: load/update backend triage profile
- **Next.js dashboard** (`src/app/page.tsx`) now renders modular sections: gradient summary metrics, live feed list with streaming animation, case detail panel, triage preferences form, notifications, and a persistent Copilot chat rail.
- **Simulation**: queued cases surface into the live feed every 5 seconds (configurable via shared state).

## Usage Notes

1. Populate the shared Google Sheet (ID `1Dam-5BADE3dYCib1uFdhSNJ8aGkUMJCOEwYCQifsfbk`) with the schema above.
2. The dashboard auto-syncs on load; the first six rows display instantly and the rest stream in to mimic real-time ingestion.
3. Update triage preferences (categories, jurisdictions, injury/property toggles) from the profile panel. Saving persists to the backend profile store and re-runs triage evaluation against the sheet.
4. Notifications banner surfaces incidents matching the profile. Dismissing removes them locally while keeping history server-side for re-imports.
5. "Voice Call" dials the selected prospect through Vapi using your configured assistant. "Send Email" remains a placeholder hook for Resend integration.

### Voice Call Configuration

Before placing calls set the following environment variables (repo or agent `.env` files):

- `VAPI_API_KEY` – provided key for authenticating server-side requests
- `VAPI_ASSISTANT_ID` – identifier of the Vapi assistant that should handle calls
- `VAPI_PHONE_NUMBER_ID` (optional) – specific Vapi phone number ID to originate calls
- `VAPI_PHONE_NUMBER` (optional) – fallback outbound caller number if you don't have an ID
- `VAPI_TARGET_PHONE_NUMBER` (optional) – override destination; defaults to `+19195196442`
- `VAPI_API_BASE_URL` (optional) – override for non-default Vapi endpoints

## Next Steps / Open Items

- Connect Resend API & email templates for real outreach.
- Expand case workflow (status columns, follow-up tasks, notes) if time allows.
- Add chart visualizations for `metrics.casesByCategory` (bar chart) and injury trends.
- Persist triage/profile + notifications to durable store (Redis/Postgres) if session reset becomes an issue.
