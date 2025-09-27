import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, preferences } = body;

    if (!preferences) {
      return NextResponse.json(
        { error: "Preferences payload is required" },
        { status: 400 },
      );
    }

    const agentUrl = process.env.AGENT_URL || "http://localhost:9000";
    const response = await fetch(`${agentUrl}/profile/triage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_id: profileId ?? "default",
        preferences,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agent triage update failed:", errorText);
      return NextResponse.json(
        { error: "Failed to update triage preferences", details: errorText },
        { status: 500 },
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Triage update error:", error);
    return NextResponse.json(
      { error: "Internal server error during triage update" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Profile triage API endpoint" });
}
