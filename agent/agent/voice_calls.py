from __future__ import annotations

import os
import re
from typing import Any, Dict, Optional

import httpx


class VoiceCallConfigurationError(RuntimeError):
    """Raised when voice call configuration is incomplete."""


class VoiceCallRequestError(ValueError):
    """Raised when a voice call request payload is invalid."""


def _normalize_phone_number(raw_number: str) -> str:
    """Convert a phone number into E.164 format (US fallback) for Vapi."""

    if not raw_number:
        raise VoiceCallRequestError("Phone number is required for a voice call.")

    sanitized = raw_number.strip()
    if sanitized.startswith("+"):
        digits = re.sub(r"[^0-9]", "", sanitized)
        if len(digits) < 8:
            raise VoiceCallRequestError("Phone number appears incomplete.")
        return "+" + digits

    digits_only = re.sub(r"[^0-9]", "", sanitized)
    if len(digits_only) == 11 and digits_only.startswith("1"):
        return f"+{digits_only}"
    if len(digits_only) == 10:
        return f"+1{digits_only}"

    raise VoiceCallRequestError("Unable to normalize phone number to E.164 format.")


async def start_voice_call(
    *,
    incident_id: str,
    full_name: str,
    phone_number: str,
    incident_summary: Optional[str] = None,
) -> Dict[str, Any]:
    """Initiate an outbound phone call via Vapi."""

    api_key = os.getenv("VAPI_API_KEY")
    assistant_id = os.getenv("VAPI_ASSISTANT_ID")
    phone_number_id = os.getenv("VAPI_PHONE_NUMBER_ID")
    phone_number_override = os.getenv("VAPI_PHONE_NUMBER")
    base_url = os.getenv("VAPI_API_BASE_URL", "https://api.vapi.ai").rstrip("/")

    if not api_key:
        raise VoiceCallConfigurationError("VAPI_API_KEY is not configured.")
    if not assistant_id:
        raise VoiceCallConfigurationError("VAPI_ASSISTANT_ID is not configured.")

    override_customer_number = os.getenv("VAPI_TARGET_PHONE_NUMBER", "+19195196442")
    try:
        customer_number = _normalize_phone_number(override_customer_number)
    except VoiceCallRequestError:
        customer_number = _normalize_phone_number(phone_number)

    payload: Dict[str, Any] = {
        "assistantId": assistant_id,
        "customer": {
            "number": customer_number,
            "name": full_name,
        },
        "metadata": {
            "incidentId": incident_id,
            "originalPhoneNumber": phone_number,
            "dialedPhoneNumber": customer_number,
        },
    }

    if phone_number_id:
        payload["phoneNumberId"] = phone_number_id
    elif phone_number_override:
        payload["phoneNumber"] = _normalize_phone_number(phone_number_override)
    else:
        raise VoiceCallConfigurationError(
            "Configure VAPI_PHONE_NUMBER_ID or VAPI_PHONE_NUMBER to place calls."
        )

    if incident_summary:
        payload["metadata"]["incidentSummary"] = incident_summary[:500]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(base_url=base_url, timeout=15.0) as client:
        response = await client.post("/call", json=payload, headers=headers)

    if response.status_code >= 400:
        detail = response.text
        raise VoiceCallRequestError(
            f"Vapi call failed with status {response.status_code}: {detail}"
        )

    data = response.json()
    call_id = data.get("id") or data.get("call", {}).get("id")

    return {
        "success": True,
        "callId": call_id,
        "payload": data,
        "message": f"Initiated voice call to {customer_number}",
    }
