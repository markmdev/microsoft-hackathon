import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sheetId,
      sheet_id,
      sheetName,
      sheet_name,
      visibleCaseLimit,
      triagePreferences,
    } = body;

    const effectiveSheetId = sheetId ?? sheet_id;
    const effectiveSheetName = sheetName ?? sheet_name;

    if (!effectiveSheetId) {
      return NextResponse.json(
        { error: "Sheet ID is required" },
        { status: 400 }
      );
    }

    // Make request to Python agent's import endpoint
    const agentUrl = process.env.AGENT_URL || 'http://localhost:9000';
    const response = await fetch(`${agentUrl}/sheets/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sheet_id: effectiveSheetId,
        sheet_name: effectiveSheetName,
        visible_case_limit: visibleCaseLimit ?? 97,
        triage_preferences: triagePreferences,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agent import failed:', errorText);
      return NextResponse.json(
        { error: "Failed to import from Google Sheets", details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: "Internal server error during import" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Sheets import API endpoint" });
}
