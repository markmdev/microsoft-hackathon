from typing import Any, Dict, List, Optional
import os
from dotenv import load_dotenv

from llama_index.llms.openai import OpenAI
from llama_index.core.tools import FunctionTool
from llama_index.protocols.ag_ui.router import get_ag_ui_workflow_router

# Load environment variables early to support local development via .env
load_dotenv()


# ---------------------------------------------------------------------------- #
# Composio helper utilities
# ---------------------------------------------------------------------------- #

def _load_composio_tools() -> List[Any]:
    """Dynamically load Composio tools for LlamaIndex if configured.

    Reads the following environment variables:
    - COMPOSIO_TOOL_IDS: comma-separated list of tool identifiers to enable
    - COMPOSIO_USER_ID: user/entity id to scope tools (defaults to "default")
    - COMPOSIO_API_KEY: required by Composio client; read implicitly by SDK

    Returns an empty list if not configured or if dependencies are missing.
    """
    tool_ids_str = os.getenv("COMPOSIO_TOOL_IDS", "").strip()
    if not tool_ids_str:
        return []

    # Import lazily to avoid hard runtime dependency if not used
    try:
        from composio import Composio  # type: ignore
        from composio_llamaindex import LlamaIndexProvider  # type: ignore
    except Exception as e:
        print(f"Failed to import Composio: {e}")
        return []

    user_id = os.getenv("COMPOSIO_USER_ID", "default")
    tool_ids = [t.strip() for t in tool_ids_str.split(",") if t.strip()]
    if not tool_ids:
        return []
    try:
        print(f"Loading Composio tools: {tool_ids} for user: {user_id}")
        composio = Composio(provider=LlamaIndexProvider())
        tools = composio.tools.get(user_id=user_id, tools=tool_ids)
        print(f"Successfully loaded {len(tools) if tools else 0} tools")
        # "tools" should be a list of LlamaIndex-compatible Tool objects
        return list(tools) if tools is not None else []
    except Exception as e:
        # Fail closed; backend tools remain empty if configuration is invalid
        print(f"Failed to load Composio tools: {e}")
        return []


# ---------------------------------------------------------------------------- #
# Backend tools (server-side)
# ---------------------------------------------------------------------------- #

def list_sheet_names(sheet_id: str) -> str:
    """List all available sheet names in a Google Spreadsheet."""
    try:
        from .sheets_integration import get_sheet_names

        sheet_names = get_sheet_names(sheet_id)
        if not sheet_names:
            return (
                f"Failed to get sheet names from {sheet_id}. Please check the ID and ensure the sheet is accessible."
            )

        return "Available sheets in spreadsheet:\n" + "\n".join(f"- {name}" for name in sheet_names)

    except Exception as e:
        return f"Error listing sheets from {sheet_id}: {str(e)}"


_sheet_list_tool = FunctionTool.from_defaults(
    fn=list_sheet_names,
    name="list_sheet_names",
    description="List all available sheet names in a Google Spreadsheet.",
)


# ---------------------------------------------------------------------------- #
# Shared dashboard state structure
# ---------------------------------------------------------------------------- #

INITIAL_STATE: Dict[str, Any] = {
    "cases": [],
    "queuedCases": [],
    "activeCaseId": None,
    "profile": {
        "id": "default",
        "displayName": "Trial Lawyer",
        "triagePreferences": {
            "categoriesOfInterest": [],
            "requireInjury": False,
            "includePropertyDamage": True,
            "citiesOfInterest": [],
        },
    },
    "notifications": [],
    "liveFeed": {
        "enabled": True,
        "nextCaseIndex": 0,
        "intervalMs": 5000,
    },
    "sheet": {
        "sheetId": "",
        "sheetName": None,
        "lastSyncedAt": None,
    },
    "lastAction": "",
    "metrics": {
        "totalCases": 0,
        "injuryCount": 0,
        "propertyDamageCount": 0,
        "casesByCategory": {},
    },
}


# ---------------------------------------------------------------------------- #
# System prompt (LLM instructions)
# ---------------------------------------------------------------------------- #

SYSTEM_PROMPT = (
    "You are Legal Copilot, assisting personal injury lawyers with a real-time "
    "dashboard of police reports.\n"
    "Shared state schema (DashboardState):\n"
    "- cases: Array of CaseRecord objects sourced from Google Sheets.\n"
    "- queuedCases: Array of CaseRecord objects waiting to appear in the live feed.\n"
    "- activeCaseId: incidentId of the case currently opened by the lawyer.\n"
    "- profile: Lawyer profile with triagePreferences (categoriesOfInterest, "
    "requireInjury, includePropertyDamage, citiesOfInterest).\n"
    "- notifications: Alerts previously raised for new incidents.\n"
    "- liveFeed: Controls the simulated real-time stream (enabled, nextCaseIndex, intervalMs).\n"
    "- sheet: Metadata about the connected Google Sheet.\n"
    "- metrics: Summary statistics derived from the current cases.\n"
    "- lastAction: Free-form string describing the latest significant update.\n\n"
    "Guidelines:\n"
    "1. Treat Google Sheets as the source of truth for case data.\n"
    "2. Reference shared state when summarizing or filtering cases—do not hallucinate fields.\n"
    "3. When the user requests data refreshes or sheet discovery, prefer the available backend tools\n"
    "   (e.g., list_sheet_names) or defer to the UI controls if a tool is unavailable.\n"
    "4. If the lawyer references triage preferences, reflect the values in profile.triagePreferences\n"
    "   and explain how alerts are generated based on those settings.\n"
    "5. Provide concise, actionable responses optimized for legal review workflows.\n"
)


# ---------------------------------------------------------------------------- #
# Router configuration
# ---------------------------------------------------------------------------- #

_backend_tools: List[Any] = _load_composio_tools()
_backend_tools.append(_sheet_list_tool)
print(f"Backend tools loaded: {len(_backend_tools)} tools")

agentic_chat_router = get_ag_ui_workflow_router(
    llm=OpenAI(model="gpt-4.1"),
    frontend_tools=[],
    backend_tools=_backend_tools,
    system_prompt=SYSTEM_PROMPT,
    initial_state=INITIAL_STATE,
)
