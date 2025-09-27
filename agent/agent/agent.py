from typing import Any, Dict, List, Optional
import os
from dotenv import load_dotenv

from llama_index.llms.openai import OpenAI
from llama_index.core.tools import FunctionTool, ToolOutput
from llama_index.core.workflow import Context
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

DEFAULT_FEED_FILTER: Dict[str, Any] = {
    "summary": "",
    "searchText": "",
    "categories": [],
    "jurisdictions": [],
    "injury": None,
    "propertyDamage": None,
    "incidentIds": [],
}


INITIAL_STATE: Dict[str, Any] = {
    "cases": [],
    "queuedCases": [],
    "activeCaseId": None,
    "feedFilter": dict(DEFAULT_FEED_FILTER),
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
# Feed filter utilities
# ---------------------------------------------------------------------------- #

SEARCHABLE_FIELDS: List[str] = [
    "incidentId",
    "incidentCategory",
    "incidentDescription",
    "location",
    "fullName",
    "resolution",
    "faultDetermination",
]


def _trimmed_unique(values: Optional[List[str]]) -> List[str]:
    if not values:
        return []

    seen: set[str] = set()
    result: List[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        trimmed = value.strip()
        if not trimmed:
            continue
        key = trimmed.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(trimmed)
    return result


def _normalize_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip().lower()
    return ""


def _map_injury_preference(value: Optional[str]) -> Optional[bool]:
    normalized = _normalize_text(value)
    if normalized in {"requires_injury", "require_injury", "injury_required", "only_injury"}:
        return True
    if normalized in {"exclude_injury", "no_injury", "without_injury"}:
        return False
    return None


def _map_property_preference(value: Optional[str]) -> Optional[bool]:
    normalized = _normalize_text(value)
    if normalized in {"requires_damage", "require_damage", "damage_required"}:
        return True
    if normalized in {"exclude_damage", "no_damage", "without_damage"}:
        return False
    return None


def _apply_feed_filter_to_cases(
    cases: List[Dict[str, Any]], feed_filter: Dict[str, Any]
) -> List[Dict[str, Any]]:
    if not cases:
        return []

    tokens = [token for token in _normalize_text(feed_filter.get("searchText", "")).split() if token]
    category_match = {
        _normalize_text(category)
        for category in feed_filter.get("categories", [])
        if isinstance(category, str)
    }
    jurisdiction_match = {
        _normalize_text(jurisdiction)
        for jurisdiction in feed_filter.get("jurisdictions", [])
        if isinstance(jurisdiction, str)
    }
    incident_id_match = {
        _normalize_text(incident_id)
        for incident_id in feed_filter.get("incidentIds", [])
        if isinstance(incident_id, str)
    }

    injury_preference = feed_filter.get("injury")
    property_preference = feed_filter.get("propertyDamage")

    filtered: List[Dict[str, Any]] = []
    for case in cases:
        incident_id = _normalize_text(case.get("incidentId"))
        if incident_id_match and incident_id not in incident_id_match:
            continue

        category = _normalize_text(case.get("incidentCategory"))
        if category_match and category not in category_match:
            continue

        jurisdiction = _normalize_text(case.get("jurisdiction"))
        if jurisdiction_match and jurisdiction not in jurisdiction_match:
            continue

        if injury_preference is not None:
            if bool(case.get("injuryReported")) != bool(injury_preference):
                continue

        if property_preference is not None:
            if bool(case.get("propertyDamage")) != bool(property_preference):
                continue

        if tokens:
            haystack = " ".join(_normalize_text(case.get(field, "")) for field in SEARCHABLE_FIELDS)
            if not all(token in haystack for token in tokens):
                continue

        filtered.append(case)

    return filtered


def _summarize_feed_filter(filter_state: Dict[str, Any]) -> str:
    if not filter_state:
        return ""

    summary = (filter_state.get("summary") or "").strip()
    if summary:
        return summary

    parts: List[str] = []

    categories = _trimmed_unique(filter_state.get("categories"))
    if categories:
        parts.append(f"Categories: {', '.join(categories)}")

    jurisdictions = _trimmed_unique(filter_state.get("jurisdictions"))
    if jurisdictions:
        parts.append(f"Jurisdictions: {', '.join(jurisdictions)}")

    injury_pref = filter_state.get("injury")
    if injury_pref is True:
        parts.append("Requires injury")
    elif injury_pref is False:
        parts.append("Exclude injury cases")

    property_pref = filter_state.get("propertyDamage")
    if property_pref is True:
        parts.append("Requires property damage")
    elif property_pref is False:
        parts.append("Exclude property damage cases")

    incident_ids = _trimmed_unique(filter_state.get("incidentIds"))
    if incident_ids:
        parts.append(f"Incident IDs: {', '.join(incident_ids)}")

    search_text = (filter_state.get("searchText") or "").strip()
    if search_text:
        parts.append(f'Text contains "{search_text}"')

    return " • ".join(parts) if parts else "Custom filter"


async def filter_live_feed_cases_tool(
    ctx: Context,
    intent: str = "apply",
    summary: Optional[str] = None,
    searchText: Optional[str] = None,
    categories: Optional[List[str]] = None,
    jurisdictions: Optional[List[str]] = None,
    injury: Optional[str] = None,
    propertyDamage: Optional[str] = None,
    incidentIds: Optional[List[str]] = None,
) -> ToolOutput:
    """Adjust the live incident feed filter.

    :param intent: Use "apply" to set a filter or "clear" to reset to defaults.
    :param summary: Optional description to display in the dashboard filter banner.
    :param searchText: Free text that must appear in incident descriptions, locations, or categories.
    :param categories: Incident categories to include.
    :param jurisdictions: Jurisdictions (e.g., SF) to include.
    :param injury: "requires_injury" to require injury cases, "exclude_injury" to reject them, "any" otherwise.
    :param propertyDamage: "requires_damage" to require property damage, "exclude_damage" to reject it, "any" otherwise.
    :param incidentIds: Restrict results to specific incident IDs.
    """

    raw_input = {
        "intent": intent,
        "summary": summary,
        "searchText": searchText,
        "categories": categories,
        "jurisdictions": jurisdictions,
        "injury": injury,
        "propertyDamage": propertyDamage,
        "incidentIds": incidentIds,
    }

    state = await ctx.store.get("state", default={})
    if not isinstance(state, dict):
        state = {}
    state = {**state}

    cases = state.get("cases") or []
    if not isinstance(cases, list):
        cases = []

    intent_value = (intent or "apply").strip().lower()

    if intent_value == "clear":
        state["feedFilter"] = dict(DEFAULT_FEED_FILTER)
        matching_ids = [case.get("incidentId") for case in cases if case.get("incidentId")]
        state["activeCaseId"] = matching_ids[0] if matching_ids else None
        state["lastAction"] = "Cleared live feed filter"

        await ctx.store.set("state", state)

        return ToolOutput(
            tool_name="filter_live_feed_cases",
            content="Cleared the live incident feed filter.",
            raw_input=raw_input,
            raw_output={
                "matchingIncidentIds": matching_ids,
                "matchingCount": len(matching_ids),
                "feedFilter": state["feedFilter"],
            },
        )

    new_filter = {
        "summary": (summary or "").strip(),
        "searchText": (searchText or "").strip(),
        "categories": _trimmed_unique(categories),
        "jurisdictions": _trimmed_unique(jurisdictions),
        "injury": _map_injury_preference(injury),
        "propertyDamage": _map_property_preference(propertyDamage),
        "incidentIds": _trimmed_unique(incidentIds),
    }

    filtered_cases = _apply_feed_filter_to_cases(cases, new_filter)
    matching_ids = [case.get("incidentId") for case in filtered_cases if case.get("incidentId")]

    state["feedFilter"] = new_filter

    current_active = state.get("activeCaseId")
    if matching_ids:
        if current_active not in matching_ids:
            state["activeCaseId"] = matching_ids[0]
    else:
        state["activeCaseId"] = None

    summary_text = _summarize_feed_filter(new_filter)
    state["lastAction"] = (
        f"Applied live feed filter: {summary_text}"
        if summary_text
        else "Applied live feed filter"
    )

    await ctx.store.set("state", state)

    message = (
        f"Filtered live feed to {summary_text} ({len(filtered_cases)} matches)."
        if summary_text
        else f"Filtered live feed ({len(filtered_cases)} matches)."
    )

    return ToolOutput(
        tool_name="filter_live_feed_cases",
        content=message,
        raw_input=raw_input,
        raw_output={
            "matchingIncidentIds": matching_ids,
            "matchingCount": len(filtered_cases),
            "feedFilter": new_filter,
            "summary": summary_text,
        },
    )


_filter_live_feed_tool = FunctionTool.from_defaults(
    async_fn=filter_live_feed_cases_tool,
    name="filter_live_feed_cases",
    description=(
        "Apply or clear filters on the live incident feed. Use the 'intent' parameter "
        "('apply' or 'clear') along with optional fields like summary, searchText, "
        "categories, jurisdictions, injury, propertyDamage, and incidentIds."
    ),
)


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
    "- feedFilter: Criteria constraining which cases appear in the live feed (summary, search text, injury/property toggles, etc.).\n"
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
    "5. When the lawyer wants to narrow, expand, or clear the live incident feed, call the tool\n"
    "   `filter_live_feed_cases` with an \"intent\" of either 'apply' or 'clear' and fill in the\n"
    "   appropriate filter arguments (summary, categories, jurisdictions, injury/property toggles,\n"
    "   etc.). The UI reads feedFilter to determine which cases to display. Example payload:\n"
    "   {\"intent\": \"apply\", \"categories\": [\"Bicycle vs Vehicle\"], \"jurisdictions\": [\"SF\"]}.\n"
    "6. Provide concise, actionable responses optimized for legal review workflows.\n"
)


# ---------------------------------------------------------------------------- #
# Router configuration
# ---------------------------------------------------------------------------- #

_backend_tools: List[Any] = _load_composio_tools()
_backend_tools.append(_sheet_list_tool)
_backend_tools.append(_filter_live_feed_tool)
print(f"Backend tools loaded: {len(_backend_tools)} tools")

agentic_chat_router = get_ag_ui_workflow_router(
    llm=OpenAI(model="gpt-4.1"),
    backend_tools=_backend_tools,
    system_prompt=SYSTEM_PROMPT,
    initial_state=INITIAL_STATE,
)
