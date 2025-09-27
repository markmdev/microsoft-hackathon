"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCoAgent } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";

import {
  CaseDetailPanel,
} from "@/components/dashboard/CaseDetailPanel";
import { CaseFeed } from "@/components/dashboard/CaseFeed";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { SheetImportForm } from "@/components/dashboard/SheetImportForm";
import { SummarySection } from "@/components/dashboard/SummarySection";
import { TriagePreferencesForm } from "@/components/dashboard/TriagePreferencesForm";
import type {
  DashboardState,
  NotificationEntry,
  TriagePreferences,
} from "@/lib/dashboard/types";
import {
  initialDashboardState,
} from "@/lib/dashboard/types";
import {
  fetchProfile,
  importCases,
  updateTriagePreferences,
} from "@/lib/dashboard/api";
import { cn } from "@/lib/utils";

function mergeNotifications(
  existing: NotificationEntry[],
  incoming: NotificationEntry[],
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

  return Array.from(map.values()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
    [viewState.cases, viewState.activeCaseId],
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
            ...previous,
            profile: response.profile,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };

    void syncProfile();
  }, [setState]);

  const handleSelectCase = useCallback(
    (incidentId: string) => {
      setState((previous) => ({
        ...previous,
        activeCaseId: incidentId,
      }));
    },
    [setState],
  );

  const handleDismissNotification = useCallback(
    (notificationId: string) => {
      setState((previous) => ({
        ...previous,
        notifications: previous.notifications
          .map((notification) =>
            notification.id === notificationId
              ? { ...notification, acknowledged: true }
              : notification,
          )
          .filter((notification) => notification.id !== notificationId),
      }));
    },
    [setState],
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
          visibleCaseLimit: Math.max(viewState.liveFeed.nextCaseIndex, 4),
        });

        setState((previous) => ({
          ...previous,
          cases: response.cases,
          queuedCases: response.queuedCases,
          activeCaseId: response.cases[0]?.incidentId ?? previous.activeCaseId,
          profile: response.profile,
          sheet: {
            sheetId: response.sheet.sheetId,
            sheetName: response.sheet.sheetName,
            lastSyncedAt: response.sheet.lastSyncedAt,
          },
          notifications: mergeNotifications(previous.notifications, response.notifications),
          metrics: response.metrics,
          liveFeed: {
            ...previous.liveFeed,
            nextCaseIndex: response.cases.length,
          },
          lastAction: `Imported ${response.totalCases} cases from Google Sheets`,
        }));

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
    [setState, viewState.liveFeed.nextCaseIndex, viewState.profile.triagePreferences],
  );

  const handleListSheets = useCallback(async (sheetId: string) => {
    const response = await fetch("/api/sheets/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetId }),
    });

    if (!response.ok) {
      throw new Error("Failed to list sheets");
    }

    const result = await response.json();
    return (result.sheetNames ?? result.sheet_names ?? []) as string[];
  }, []);

  const handleSavePreferences = useCallback(
    async (preferences: TriagePreferences) => {
      setIsSavingPreferences(true);
      setStatusMessage(null);
      try {
        await updateTriagePreferences({ preferences });

        setState((previous) => ({
          ...previous,
          profile: {
            ...previous.profile,
            triagePreferences: preferences,
          },
          lastAction: "Updated triage preferences",
        }));

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
    [handleImportCases, setState, viewState.sheet.sheetId, viewState.sheet.sheetName],
  );

  const handleResetPreferences = useCallback(async () => {
    try {
      const profileResponse = await fetchProfile();
      setState((previous) => ({
        ...previous,
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

  const handleSendEmail = useCallback((caseRecord: NonNullable<typeof activeCase>) => {
    console.log("Trigger email via Resend", caseRecord);
    setStatusTone("neutral");
    setStatusMessage(`Prepared email payload for ${caseRecord.fullName}.`);
  }, [setStatusMessage, setStatusTone]);

  useEffect(() => {
    if (!viewState.liveFeed.enabled) return;
    if (viewState.queuedCases.length === 0) return;

    const interval = setInterval(() => {
      setState((previous) => {
        if (!previous.liveFeed.enabled || previous.queuedCases.length === 0) {
          return previous;
        }

        const [nextCase, ...remainingQueue] = previous.queuedCases;
        const nextCases = [nextCase, ...previous.cases];

        return {
          ...previous,
          cases: nextCases,
          queuedCases: remainingQueue,
          activeCaseId: previous.activeCaseId ?? nextCase.incidentId,
          liveFeed: {
            ...previous.liveFeed,
            nextCaseIndex: previous.liveFeed.nextCaseIndex + 1,
          },
          lastAction: `Live feed received case ${nextCase.incidentId}`,
        };
      });
    }, viewState.liveFeed.intervalMs);

    return () => clearInterval(interval);
  }, [setState, viewState.liveFeed.enabled, viewState.liveFeed.intervalMs, viewState.queuedCases.length]);

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <CopilotSidebar
        defaultOpen
        hitEscapeToClose
        className="z-40"
        instructions="Browse synced police reports, triage new matters, and request follow-up actions."
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:pr-80">
        <header className="flex flex-col gap-2 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold">Legal Ops Control Center</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Import police report data, monitor live case intake, and coordinate follow-up actions with Copilot assistance.
          </p>
          <div className="text-xs text-muted-foreground">
            {viewState.sheet.sheetId ? (
              <span>
                Connected to sheet <span className="font-medium">{viewState.sheet.sheetId}</span>
                {viewState.sheet.sheetName ? ` • tab ${viewState.sheet.sheetName}` : ""}
                {viewState.sheet.lastSyncedAt ? ` • synced ${new Date(viewState.sheet.lastSyncedAt).toLocaleTimeString()}` : ""}
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
                statusTone === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              {statusMessage}
            </div>
          )}
        </header>

        <div className="grid gap-6">
          <SheetImportForm
            sheetId={viewState.sheet.sheetId}
            sheetName={viewState.sheet.sheetName}
            isImporting={isImporting}
            onImport={handleImportCases}
            onListSheets={handleListSheets}
          />

          <SummarySection metrics={viewState.metrics} sheet={viewState.sheet} />

          <div className="grid gap-6 lg:grid-cols-[2fr_1.1fr]">
            <CaseFeed
              cases={viewState.cases}
              queuedCount={viewState.queuedCases.length}
              activeCaseId={viewState.activeCaseId}
              onSelectCase={handleSelectCase}
            />
            <CaseDetailPanel
              caseRecord={activeCase}
              onSendEmail={handleSendEmail}
              onTriggerVoiceCall={(record) =>
                console.log("Voice call integration placeholder", record)
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <NotificationsPanel
              notifications={viewState.notifications}
              onDismiss={handleDismissNotification}
            />
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
