from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Load environment variables from .env/.env.local (repo root or agent dir) if present
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    load_dotenv = None


def _load_env_files() -> None:
    if load_dotenv is None:
        return
    here = Path(__file__).resolve()
    candidates = [
        here.parents[2] / ".env.local",  # repo root/.env.local
        here.parents[2] / ".env",  # repo root/.env
        here.parents[1] / ".env.local",  # agent/.env.local
        here.parents[1] / ".env",  # agent/.env
    ]
    for path in candidates:
        if path.exists():
            load_dotenv(path, override=False)


_load_env_files()

from .agent import agentic_chat_router
from .profile import get_profile, update_triage_preferences
from .sheets_integration import get_sheet_names, import_cases_from_sheet

app = FastAPI()
app.include_router(agentic_chat_router)


class TriagePreferencesModel(BaseModel):
    categoriesOfInterest: list[str] = Field(default_factory=list)
    requireInjury: bool = False
    includePropertyDamage: bool = True
    citiesOfInterest: list[str] = Field(default_factory=list)


class SheetSyncRequest(BaseModel):
    sheet_id: str = Field(alias="sheet_id")
    sheet_name: Optional[str] = Field(default=None, alias="sheet_name")
    visible_case_limit: int = Field(default=97, alias="visible_case_limit")
    triage_preferences: Optional[TriagePreferencesModel] = Field(
        default=None, alias="triage_preferences"
    )

    class Config:
        populate_by_name = True


class TriageUpdateRequest(BaseModel):
    profile_id: str = Field(default="default", alias="profile_id")
    preferences: TriagePreferencesModel

    class Config:
        populate_by_name = True


@app.post("/sheets/sync")
async def sync_sheets(request: SheetSyncRequest):
    """Import cases from Google Sheets and structure them for the dashboard."""
    try:
        print(
            "Syncing sheet:",
            request.sheet_id,
            "sheet:",
            request.sheet_name or "(default)",
        )

        prefs = request.triage_preferences.dict() if request.triage_preferences else None
        result = import_cases_from_sheet(
            request.sheet_id,
            request.sheet_name,
            visible_case_limit=request.visible_case_limit,
            triage_preferences=prefs,
        )

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Import failed"))

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive logging
        print(f"Error in sheets sync: {exc}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {exc}")


@app.post("/sheets/list")
async def list_sheet_names_endpoint(request: SheetSyncRequest):
    """List available sheet names in a Google Spreadsheet."""
    try:
        print(f"Listing sheets in: {request.sheet_id}")
        sheet_names = get_sheet_names(request.sheet_id)
        if not sheet_names:
            raise HTTPException(
                status_code=400,
                detail="Failed to get sheet names. Please check the sheet ID and ensure it's accessible.",
            )

        return JSONResponse(
            content={
                "success": True,
                "sheetNames": sheet_names,
                "count": len(sheet_names),
            }
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive logging
        print(f"Error in sheet listing: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {exc}",
        )


@app.get("/profile")
async def profile_endpoint():
    """Return the current lawyer profile."""
    try:
        profile = get_profile()
        return JSONResponse(content={"success": True, "profile": profile})
    except Exception as exc:  # pragma: no cover - defensive logging
        raise HTTPException(status_code=500, detail=f"Failed to load profile: {exc}")


@app.post("/profile/triage")
async def update_triage(request: TriageUpdateRequest):
    """Update triage preferences stored on the backend."""
    try:
        updated_profile = update_triage_preferences(request.preferences.dict())
        return JSONResponse(
            content={
                "success": True,
                "profile": updated_profile,
                "message": "Triage preferences updated.",
            }
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        raise HTTPException(status_code=500, detail=f"Failed to update triage preferences: {exc}")
