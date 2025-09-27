"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCoAgent } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";

import { CaseDetailPanel } from "@/components/dashboard/CaseDetailPanel";
import { CaseFeed } from "@/components/dashboard/CaseFeed";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { SummarySection } from "@/components/dashboard/SummarySection";
import { TriagePreferencesForm } from "@/components/dashboard/TriagePreferencesForm";
import type { DashboardState, NotificationEntry, TriagePreferences } from "@/lib/dashboard/types";
import { initialDashboardState } from "@/lib/dashboard/types";
import { fetchProfile, importCases, updateTriagePreferences } from "@/lib/dashboard/api";
import { cn } from "@/lib/utils";
const HARDCODED_SHEET_ID = "1Dam-5BADE3dYCib1uFdhSNJ8aGkUMJCOEwYCQifsfbk";

function mergeNotifications(
  existing: NotificationEntry[],
  incoming: NotificationEntry[]
): NotificationEntry[] {
  const map = new Map(existing.map((item) => [item.id, item]));

  incoming.forEach((notification) => {
    const previous = map.get(notification.id);
    if (previous?.acknowledged) {
      map.set(notification.id, { ...notification, acknowledged: true });
    } else {
      map.set(notification.id, notification);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function LawyerDashboardPage() {
  const { state, setState } = useCoAgent<DashboardState>({
    name: "lawyer_copilot",
    initialState: initialDashboardState,
  });

  const viewState = state ?? initialDashboardState;

  const [isImporting, setIsImporting] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"neutral" | "success" | "error">("neutral");
  const hasFetchedProfileRef = useRef(false);

  const activeCase = useMemo(
    () => viewState.cases.find((entry) => entry.incidentId === viewState.activeCaseId),
    [viewState.cases, viewState.activeCaseId]
  );

  const handleSelectCase = useCallback(
    (incidentId: string) => {
      setState((previous) => ({
        ...(previous || initialDashboardState),
        activeCaseId: incidentId,
      }));
    },
    [setState]
  );

  const handleDismissNotification = useCallback(
    (notificationId: string) => {
      setState((previous) => {
        const current = previous || initialDashboardState;
        return {
          ...current,
          notifications: current.notifications
            .map((notification) =>
              notification.id === notificationId
                ? { ...notification, acknowledged: true }
                : notification
            )
            .filter((notification) => notification.id !== notificationId),
        };
      });
    },
    [setState]
  );

  const handleImportCases = useCallback(
    async ({ sheetId, sheetName }: { sheetId: string; sheetName?: string }) => {
      setIsImporting(true);
      setStatusMessage(null);
      try {
        const response = await importCases({
          sheetId,
          sheetName,
          triagePreferences: viewState.profile.triagePreferences,
          visibleCaseLimit: Math.max(viewState.liveFeed.nextCaseIndex, 97),
        });

        setState((previous) => {
          const current = previous || initialDashboardState;
          return {
            ...current,
            cases: response.cases,
            queuedCases: response.queuedCases,
            activeCaseId: response.cases[0]?.incidentId ?? current.activeCaseId,
            profile: response.profile,
            sheet: {
              sheetId: response.sheet.sheetId,
              sheetName: response.sheet.sheetName,
              lastSyncedAt: response.sheet.lastSyncedAt,
            },
            notifications: mergeNotifications(current.notifications, response.notifications),
            metrics: response.metrics,
            liveFeed: {
              ...current.liveFeed,
              nextCaseIndex: response.cases.length,
            },
            lastAction: `Imported ${response.totalCases} cases from Google Sheets`,
          };
        });

        setStatusTone("success");
        setStatusMessage(`Imported ${response.totalCases} cases from Google Sheets.`);
      } catch (error) {
        console.error(error);
        setStatusTone("error");
        setStatusMessage("Failed to import cases. Check console for details.");
      } finally {
        setIsImporting(false);
      }
    },
    [setState, viewState.liveFeed.nextCaseIndex, viewState.profile.triagePreferences]
  );

  useEffect(() => {
    if (hasFetchedProfileRef.current) {
      return;
    }
    hasFetchedProfileRef.current = true;

    const syncProfile = async () => {
      try {
        const response = await fetchProfile();
        if (response?.profile) {
          setState((previous) => ({
            ...(previous || initialDashboardState),
            profile: response.profile,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };

    void syncProfile();
  }, [setState]);

  // Auto-import from hardcoded sheet ID when profile is loaded and no cases exist
  useEffect(() => {
    if (viewState.profile.displayName && viewState.cases.length === 0 && !isImporting) {
      handleImportCases({
        sheetId: HARDCODED_SHEET_ID,
      }).catch((error) => {
        console.error("Failed to auto-import cases", error);
      });
    }
  }, [viewState.profile.displayName, viewState.cases.length, isImporting, handleImportCases]);

  const handleSavePreferences = useCallback(
    async (preferences: TriagePreferences) => {
      setIsSavingPreferences(true);
      setStatusMessage(null);
      try {
        await updateTriagePreferences({ preferences });

        setState((previous) => {
          const current = previous || initialDashboardState;
          return {
            ...current,
            profile: {
              ...current.profile,
              triagePreferences: preferences,
            },
            lastAction: "Updated triage preferences",
          };
        });

        setStatusTone("success");
        setStatusMessage("Triage preferences saved.");

        if (viewState.sheet.sheetId) {
          await handleImportCases({
            sheetId: viewState.sheet.sheetId,
            sheetName: viewState.sheet.sheetName,
          });
        }
      } catch (error) {
        console.error(error);
        setStatusTone("error");
        setStatusMessage("Failed to save triage preferences.");
      } finally {
        setIsSavingPreferences(false);
      }
    },
    [handleImportCases, setState, viewState.sheet.sheetId, viewState.sheet.sheetName]
  );

  const handleResetPreferences = useCallback(async () => {
    try {
      const profileResponse = await fetchProfile();
      setState((previous) => ({
        ...(previous || initialDashboardState),
        profile: profileResponse.profile,
      }));
      setStatusTone("neutral");
      setStatusMessage("Restored profile defaults.");
    } catch (error) {
      console.error(error);
      setStatusTone("error");
      setStatusMessage("Failed to reset preferences.");
    }
  }, [setState]);

  const handleSendEmail = useCallback(
    (caseRecord: NonNullable<typeof activeCase>) => {
      console.log("Trigger email via Resend", caseRecord);
      setStatusTone("neutral");
      setStatusMessage(`Prepared email payload for ${caseRecord.fullName}.`);
    },
    [setStatusMessage, setStatusTone]
  );

  useEffect(() => {
    if (!viewState.liveFeed.enabled) return;
    if (viewState.queuedCases.length === 0) return;

    const interval = setInterval(() => {
      setState((previous) => {
        const current = previous || initialDashboardState;
        if (!current.liveFeed.enabled || current.queuedCases.length === 0) {
          return current;
        }

        const [nextCase, ...remainingQueue] = current.queuedCases;
        const nextCases = [nextCase, ...current.cases];

        return {
          ...current,
          cases: nextCases,
          queuedCases: remainingQueue,
          activeCaseId: current.activeCaseId ?? nextCase.incidentId,
          liveFeed: {
            ...current.liveFeed,
            nextCaseIndex: current.liveFeed.nextCaseIndex + 1,
          },
          lastAction: `Live feed received case ${nextCase.incidentId}`,
        };
      });
    }, viewState.liveFeed.intervalMs);

    return () => clearInterval(interval);
  }, [
    setState,
    viewState.liveFeed.enabled,
    viewState.liveFeed.intervalMs,
    viewState.queuedCases.length,
  ]);

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-foreground">
      {/* 3-Column Layout: Chat | Main Content | Case Details */}
      <div className="flex h-screen">
        {/* Left Column: Chat */}
        <aside className="w-80 flex flex-col p-4 pl-4 pr-0 border-r border-border bg-white/80 backdrop-blur-sm">
          <div className="h-full flex flex-col w-full shadow-lg rounded-2xl border border-border overflow-hidden">
            <CopilotChat
              className="flex-1 overflow-auto w-full"
              instructions="Browse synced police reports, triage new matters, and request follow-up actions."
              labels={{
                title: "Legal Ops Assistant",
                initial: "👋 Browse synced police reports, triage new matters, and request follow-up actions.",
              }}
            />
          </div>
        </aside>

        {/* Main Column: Primary Content */}
        <div className="flex-1 flex flex-col gap-6 px-8 py-6 overflow-auto">
          <header className="flex flex-col gap-2 border-b border-border pb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 rounded-lg -mx-4 -my-2"></div>
            <h1 className="text-3xl font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent relative z-10">
              Legal Ops Control Center
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Import police report data, monitor live case intake, and coordinate follow-up actions
              with Copilot assistance.
            </p>
            <div className="text-xs text-muted-foreground">
              {viewState.sheet.sheetId ? (
                <span>
                  Connected to sheet <span className="font-medium">{viewState.sheet.sheetId}</span>
                  {viewState.sheet.sheetName ? ` • tab ${viewState.sheet.sheetName}` : ""}
                  {viewState.sheet.lastSyncedAt
                    ? ` • synced ${new Date(viewState.sheet.lastSyncedAt).toLocaleTimeString()}`
                    : ""}
                </span>
              ) : (
                <span>No sheet connected yet.</span>
              )}
            </div>
            {statusMessage && (
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs",
                  statusTone === "success" && "bg-emerald-100 text-emerald-700",
                  statusTone === "error" && "bg-red-100 text-red-700",
                  statusTone === "neutral" && "bg-muted text-muted-foreground"
                )}
              >
                {statusMessage}
              </div>
            )}
          </header>

          <div className="grid gap-6">
            <SummarySection
              metrics={viewState.metrics}
              sheet={viewState.sheet}
              cases={viewState.cases}
            />

            {/* Main content: Live Feed */}
            <CaseFeed
              cases={viewState.cases}
              queuedCount={viewState.queuedCases.length}
              activeCaseId={viewState.activeCaseId}
              onSelectCase={handleSelectCase}
            />

            {/* Notifications Panel - full width in main column */}
            <div className="h-96">
              <NotificationsPanel
                notifications={viewState.notifications}
                onDismiss={handleDismissNotification}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Case Details */}
        <div className="w-96 border-l border-border bg-white/80 backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <CaseDetailPanel
              caseRecord={activeCase}
              onSendEmail={handleSendEmail}
              onTriggerVoiceCall={(record) =>
                console.log("Voice call integration placeholder", record)
              }
            />
          </div>

          <div className="border-t border-border p-6 flex-shrink-0">
            <TriagePreferencesForm
              value={viewState.profile.triagePreferences}
              onSave={handleSavePreferences}
              onReset={handleResetPreferences}
              isSaving={isSavingPreferences}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
