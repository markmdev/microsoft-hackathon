"""Google Sheets ingestion utilities for the lawyer dashboard."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import os

from dotenv import load_dotenv

from .profile import get_profile

load_dotenv()

# Column keys we expect from the sheet. Values are the normalized keys used in CaseRecord.
EXPECTED_COLUMNS: Tuple[str, ...] = (
    "incident_id",
    "full_name",
    "sex",
    "home_address",
    "phone_number",
    "incident_date",
    "incident_time",
    "location",
    "incident_category",
    "resolution",
    "injury_reported",
    "property_damage",
    "fault_determination",
    "incident_description",
)

BOOLEAN_TRUE_VALUES = {"yes", "true", "y", "1", "t"}


def get_composio_client():
    """Initialize Composio client for direct API calls."""
    try:
        from composio import Composio  # type: ignore

        user_id = os.getenv("COMPOSIO_USER_ID", "default")
        return Composio(), user_id
    except Exception as exc:  # pragma: no cover - defensive logging
        print(f"Failed to initialize Composio client: {exc}")
        return None, None


def get_sheet_names(sheet_id: str) -> Optional[List[str]]:
    """Return the list of sheet tab names for the given spreadsheet."""
    composio, user_id = get_composio_client()
    if not composio or not user_id:
        return None

    try:
        result = composio.tools.execute(
            user_id=user_id,
            slug="GOOGLESHEETS_GET_SPREADSHEET_INFO",
            arguments={"spreadsheet_id": sheet_id},
        )

        if not result or not result.get("successful"):
            return None

        sheet_info = result.get("data", {}).get("response_data", {})
        sheets = sheet_info.get("sheets", [])
        return [s.get("properties", {}).get("title", "Untitled") for s in sheets]

    except Exception as exc:  # pragma: no cover - defensive logging
        print(f"Error getting sheet names: {exc}")
        return None


def get_sheet_data(sheet_id: str, sheet_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetch spreadsheet metadata and rows for the requested tab."""
    composio, user_id = get_composio_client()
    if not composio or not user_id:
        return None

    try:
        info_result = composio.tools.execute(
            user_id=user_id,
            slug="GOOGLESHEETS_GET_SPREADSHEET_INFO",
            arguments={"spreadsheet_id": sheet_id},
        )
        if not info_result or not info_result.get("successful"):
            print(f"Failed to get spreadsheet info: {info_result}")
            return None

        sheet_info = info_result.get("data", {}).get("response_data", {})
        sheets = sheet_info.get("sheets", [])
        if not sheets:
            return None

        if sheet_name:
            selected_sheet = next(
                (s for s in sheets if s.get("properties", {}).get("title") == sheet_name),
                None,
            )
            if selected_sheet is None:
                available = [s.get("properties", {}).get("title", "Untitled") for s in sheets]
                print(f"Sheet '{sheet_name}' not found in spreadsheet. Available: {available}")
                return None
            target_sheet_name = sheet_name
        else:
            selected_sheet = sheets[0]
            target_sheet_name = selected_sheet.get("properties", {}).get("title", "Sheet1")

        values_result = composio.tools.execute(
            user_id=user_id,
            slug="GOOGLESHEETS_BATCH_GET",
            arguments={
                "spreadsheet_id": sheet_id,
                "ranges": [f"{target_sheet_name}!A:Z"],
            },
        )
        if not values_result or not values_result.get("successful"):
            print(f"Failed to get sheet values: {values_result}")
            return None

        values_data = values_result.get("data", {})
        sheet_ranges = values_data.get("valueRanges", [])
        if not sheet_ranges:
            return None

        return {
            "spreadsheet_info": sheet_info,
            "spreadsheet_id": sheet_id,
            "sheet_name": target_sheet_name,
            "rows": sheet_ranges[0].get("values", []),
            "title": sheet_info.get("properties", {}).get("title", "Untitled"),
            "available_sheets": [s.get("properties", {}).get("title", "Untitled") for s in sheets],
        }
    except Exception as exc:  # pragma: no cover - defensive logging
        print(f"Error fetching sheet data: {exc}")
        return None


def normalize_header(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


def parse_boolean(value: Optional[str]) -> bool:
    if value is None:
        return False
    return value.strip().lower() in BOOLEAN_TRUE_VALUES


def normalize_date(value: str) -> str:
    if not value:
        return ""
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return value


def normalize_time(value: str) -> str:
    if not value:
        return ""
    value = value.strip()
    time_formats = ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p", "%I%p")
    for fmt in time_formats:
        try:
            return datetime.strptime(value, fmt).strftime("%H:%M")
        except ValueError:
            continue
    return value


def derive_jurisdiction(incident_id: str, location: str) -> str:
    if incident_id and "-" in incident_id:
        return incident_id.split("-", 1)[0].upper()
    if location:
        return location.split(",")[0].strip()
    return "UNKNOWN"


def standardize_category(value: str) -> str:
    if not value:
        return ""
    return value.strip().title()


def row_to_case(row_values: List[str], headers: List[str]) -> Optional[Dict[str, Any]]:
    # Skip empty rows
    if not row_values or not any(cell.strip() for cell in row_values if isinstance(cell, str)):
        return None

    row_map = {}
    for idx, header in enumerate(headers):
        if idx < len(row_values):
            row_map[header] = str(row_values[idx]).strip()
        else:
            row_map[header] = ""

    incident_id = row_map.get("incident_id")
    if not incident_id:
        return None

    location = row_map.get("location", "")
    incident_category = standardize_category(row_map.get("incident_category", ""))

    return {
        "incidentId": incident_id,
        "fullName": row_map.get("full_name", ""),
        "sex": row_map.get("sex", ""),
        "homeAddress": row_map.get("home_address", ""),
        "phoneNumber": row_map.get("phone_number", ""),
        "incidentDate": normalize_date(row_map.get("incident_date", "")),
        "incidentTime": normalize_time(row_map.get("incident_time", "")),
        "location": location,
        "incidentCategory": incident_category,
        "resolution": row_map.get("resolution", ""),
        "injuryReported": parse_boolean(row_map.get("injury_reported")),
        "propertyDamage": parse_boolean(row_map.get("property_damage")),
        "faultDetermination": row_map.get("fault_determination", ""),
        "incidentDescription": row_map.get("incident_description", ""),
        "jurisdiction": derive_jurisdiction(incident_id, location),
    }


def parse_cases_from_sheet(sheet_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows = sheet_data.get("rows", [])
    if not rows:
        return []

    headers = [normalize_header(cell) for cell in rows[0]] if rows else []
    if headers and set(headers) >= set(EXPECTED_COLUMNS):
        data_rows = rows[1:]
    else:
        # If headers are missing or partial, try to map expected columns in order.
        headers = list(EXPECTED_COLUMNS)
        data_rows = rows

    cases: List[Dict[str, Any]] = []
    for row in data_rows:
        case = row_to_case(row, headers)
        if case:
            cases.append(case)
    return cases


def summarize_cases(cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_injuries = sum(1 for case in cases if case.get("injuryReported"))
    with_property_damage = sum(1 for case in cases if case.get("propertyDamage"))
    by_category: Dict[str, int] = {}
    for case in cases:
        category = case.get("incidentCategory") or "Uncategorized"
        by_category[category] = by_category.get(category, 0) + 1
    return {
        "totalCases": len(cases),
        "injuryCount": total_injuries,
        "propertyDamageCount": with_property_damage,
        "casesByCategory": by_category,
    }


def evaluate_triage(cases: List[Dict[str, Any]], preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not preferences:
        preferences = {}

    categories = {
        value.strip().lower()
        for value in preferences.get("categoriesOfInterest", [])
        if isinstance(value, str) and value.strip()
    }
    cities = {
        value.strip().lower()
        for value in preferences.get("citiesOfInterest", [])
        if isinstance(value, str) and value.strip()
    }
    require_injury = bool(preferences.get("requireInjury", False))
    include_property_damage = bool(preferences.get("includePropertyDamage", True))

    matches: List[Dict[str, Any]] = []
    timestamp = datetime.utcnow().isoformat()

    for case in cases:
        category = (case.get("incidentCategory") or "").lower()
        jurisdiction = (case.get("jurisdiction") or "").lower()
        city_in_location = (case.get("location") or "").lower()

        if categories and category not in categories:
            continue

        if cities:
            if jurisdiction not in cities and not any(city in city_in_location for city in cities):
                continue

        if require_injury and not case.get("injuryReported"):
            continue

        if not include_property_damage and case.get("propertyDamage") and not case.get("injuryReported"):
            continue

        matches.append(
            {
                "id": f"triage-{case['incidentId']}",
                "incidentId": case["incidentId"],
                "createdAt": timestamp,
                "message": (
                    f"{case.get('incidentCategory', 'Incident')} at {case.get('location', 'unknown location')} "
                    f"on {case.get('incidentDate', 'unknown date')} involving {case.get('fullName', 'unknown party')}"
                ),
                "acknowledged": False,
            }
        )

    return matches


def import_cases_from_sheet(
    sheet_id: str,
    sheet_name: Optional[str] = None,
    *,
    visible_case_limit: int = 97,
    triage_preferences: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    sheet_data = get_sheet_data(sheet_id, sheet_name)
    if not sheet_data:
        return {
            "success": False,
            "error": "Failed to load Google Sheet. Ensure the sheet ID and permissions are correct.",
        }

    cases = parse_cases_from_sheet(sheet_data)
    visible = cases[:visible_case_limit]
    queued = cases[visible_case_limit:]

    profile = get_profile()
    preferences = triage_preferences or profile.get("triagePreferences", {})
    triage_matches = evaluate_triage(cases, preferences)

    return {
        "success": True,
        "cases": visible,
        "queuedCases": queued,
        "sheet": {
            "sheetId": sheet_data.get("spreadsheet_id", sheet_id),
            "sheetName": sheet_data.get("sheet_name"),
            "lastSyncedAt": datetime.utcnow().isoformat(),
            "title": sheet_data.get("title"),
            "availableSheets": sheet_data.get("available_sheets", []),
        },
        "profile": profile,
        "notifications": triage_matches,
        "metrics": summarize_cases(cases),
        "totalCases": len(cases),
    }
