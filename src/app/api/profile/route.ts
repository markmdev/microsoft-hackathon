import { NextResponse } from "next/server";

export async function GET() {
  try {
    const agentUrl = process.env.AGENT_URL || "http://localhost:9000";
    const response = await fetch(`${agentUrl}/profile`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agent profile fetch failed:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch lawyer profile", details: errorText },
        { status: 500 },
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error during profile fetch" },
      { status: 500 },
    );
  }
}
