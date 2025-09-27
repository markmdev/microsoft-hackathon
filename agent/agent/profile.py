from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Dict, List

DEFAULT_TRIAGE_PREFERENCES: Dict[str, object] = {
    "categoriesOfInterest": [],
    "requireInjury": False,
    "includePropertyDamage": True,
    "citiesOfInterest": [],
}

DEFAULT_PROFILE: Dict[str, object] = {
    "id": "default",
    "displayName": "Trial Lawyer",
    "triagePreferences": deepcopy(DEFAULT_TRIAGE_PREFERENCES),
    "email": None,
    "updatedAt": datetime.utcnow().isoformat(),
}

_current_profile: Dict[str, object] = deepcopy(DEFAULT_PROFILE)


def get_profile() -> Dict[str, object]:
    """Return a copy of the current lawyer profile."""
    return deepcopy(_current_profile)


def update_triage_preferences(preferences: Dict[str, object]) -> Dict[str, object]:
    """Update triage preferences and return the new profile."""
    global _current_profile

    merged_preferences = deepcopy(_current_profile.get("triagePreferences", {}))

    for key, value in preferences.items():
        if key in merged_preferences:
            merged_preferences[key] = value

    _current_profile["triagePreferences"] = merged_preferences
    _current_profile["updatedAt"] = datetime.utcnow().isoformat()
    return get_profile()


def reset_profile() -> Dict[str, object]:
    """Reset to the default profile and return it."""
    global _current_profile
    _current_profile = deepcopy(DEFAULT_PROFILE)
    return get_profile()

