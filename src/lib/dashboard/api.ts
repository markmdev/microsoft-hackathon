import type {
  CaseRecord,
  DashboardMetrics,
  LawyerProfile,
  NotificationEntry,
  SheetBinding,
  TriagePreferences,
} from "@/lib/dashboard/types";

export interface SheetMetadata extends SheetBinding {
  title?: string;
  availableSheets?: string[];
}

export interface ImportCasesPayload {
  sheetId: string;
  sheetName?: string;
  visibleCaseLimit?: number;
  triagePreferences?: TriagePreferences;
}

export interface ImportCasesResponse {
  success: boolean;
  cases: CaseRecord[];
  queuedCases: CaseRecord[];
  sheet: SheetMetadata;
  profile: LawyerProfile;
  notifications: NotificationEntry[];
  metrics: DashboardMetrics;
  totalCases: number;
  error?: string;
}

export async function importCases(payload: ImportCasesPayload): Promise<ImportCasesResponse> {
  const response = await fetch("/api/sheets/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sheetId: payload.sheetId,
      sheetName: payload.sheetName,
      visibleCaseLimit: payload.visibleCaseLimit ?? 97,
      triagePreferences: payload.triagePreferences,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to import cases", errorText);
    throw new Error("Failed to import cases");
  }

  return (await response.json()) as ImportCasesResponse;
}

export interface UpdateTriagePayload {
  profileId?: string;
  preferences: TriagePreferences;
}

export interface UpdateTriageResponse {
  success: boolean;
  profile: LawyerProfile;
  message?: string;
}

export async function updateTriagePreferences(
  payload: UpdateTriagePayload,
): Promise<UpdateTriageResponse> {
  const response = await fetch("/api/profile/triage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profileId: payload.profileId ?? "default",
      preferences: payload.preferences,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to update triage preferences", errorText);
    throw new Error("Failed to update triage preferences");
  }

  return (await response.json()) as UpdateTriageResponse;
}

export interface ProfileResponse {
  success: boolean;
  profile: LawyerProfile;
}

export async function fetchProfile(): Promise<ProfileResponse> {
  const response = await fetch("/api/profile", { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to load profile");
  }
  return (await response.json()) as ProfileResponse;
}
