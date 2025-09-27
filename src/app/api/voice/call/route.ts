import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agentPayload = {
      incidentId: body.incidentId ?? body.incident_id,
      fullName: body.fullName ?? body.full_name,
      phoneNumber: body.phoneNumber ?? body.phone_number,
      incidentSummary: body.incidentSummary ?? body.incident_summary,
    };

    if (!agentPayload.incidentId || !agentPayload.fullName || !agentPayload.phoneNumber) {
      return NextResponse.json(
        { error: "incidentId, fullName, and phoneNumber are required." },
        { status: 400 },
      );
    }

    const agentUrl = process.env.AGENT_URL || "http://localhost:9000";
    const response = await fetch(`${agentUrl}/voice/call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agentPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agent voice call failed:", errorText);
      return NextResponse.json(
        { error: "Failed to initiate voice call", details: errorText },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Voice call API error:", error);
    return NextResponse.json(
      { error: "Internal server error during voice call" },
      { status: 500 },
    );
  }
}

