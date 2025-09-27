export interface CaseRecord {
  incidentId: string;
  fullName: string;
  sex: string;
  homeAddress: string;
  phoneNumber: string;
  incidentDate: string; // ISO date (YYYY-MM-DD)
  incidentTime: string; // HH:mm in 24h format
  location: string;
  incidentCategory: string;
  resolution: string;
  injuryReported: boolean;
  propertyDamage: boolean;
  faultDetermination: string;
  incidentDescription: string;
  jurisdiction: string;
}

export interface TriagePreferences {
  categoriesOfInterest: string[];
  requireInjury: boolean;
  includePropertyDamage: boolean;
  citiesOfInterest: string[];
}

export interface LawyerProfile {
  id: string;
  displayName: string;
  email?: string;
  triagePreferences: TriagePreferences;
}

export interface LiveFeedState {
  enabled: boolean;
  nextCaseIndex: number;
  intervalMs: number;
}

export interface NotificationEntry {
  id: string;
  incidentId: string;
  createdAt: string;
  message: string;
  acknowledged: boolean;
}

export interface SheetBinding {
  sheetId: string;
  sheetName?: string;
  lastSyncedAt?: string;
}

export interface DashboardMetrics {
  totalCases: number;
  injuryCount: number;
  propertyDamageCount: number;
  casesByCategory: Record<string, number>;
}

export interface DashboardState {
  cases: CaseRecord[];
  queuedCases: CaseRecord[];
  activeCaseId?: string;
  profile: LawyerProfile;
  notifications: NotificationEntry[];
  liveFeed: LiveFeedState;
  sheet: SheetBinding;
  lastAction?: string;
  metrics: DashboardMetrics;
}

export const defaultTriagePreferences: TriagePreferences = {
  categoriesOfInterest: [],
  requireInjury: false,
  includePropertyDamage: true,
  citiesOfInterest: [],
};

export const defaultProfile: LawyerProfile = {
  id: "default",
  displayName: "Trial Lawyer",
  triagePreferences: { ...defaultTriagePreferences },
};

export const initialDashboardState: DashboardState = {
  cases: [],
  queuedCases: [],
  activeCaseId: undefined,
  profile: { ...defaultProfile },
  notifications: [],
  liveFeed: {
    enabled: true,
    nextCaseIndex: 0,
    intervalMs: 5000,
  },
  sheet: {
    sheetId: "",
    sheetName: undefined,
    lastSyncedAt: undefined,
  },
  lastAction: "",
  metrics: {
    totalCases: 0,
    injuryCount: 0,
    propertyDamageCount: 0,
    casesByCategory: {},
  },
};
