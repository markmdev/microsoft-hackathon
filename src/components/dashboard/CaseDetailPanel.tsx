"use client";

import { useEffect, useState, type ReactNode } from "react";

import type { CaseRecord } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CaseDetailPanelProps {
  caseRecord?: CaseRecord;
  onSendEmail?: (caseRecord: CaseRecord) => void;
  onTriggerVoiceCall?: (caseRecord: CaseRecord) => void;
  isVoiceCallPending?: boolean;
}

export function CaseDetailPanel({
  caseRecord,
  onSendEmail,
  onTriggerVoiceCall,
  isVoiceCallPending = false,
}: CaseDetailPanelProps) {
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(false);

  useEffect(() => {
    setIsNarrativeExpanded(false);
  }, [caseRecord?.incidentId]);

  if (!caseRecord) {
    return (
      <section className="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        Select a case from the feed to review full details.
      </section>
    );
  }

  const injuryText = caseRecord.injuryReported ? "Injury reported" : "No injury noted";
  const damageText = caseRecord.propertyDamage ? "Property damage" : "No property damage";
  const clientName = caseRecord.sex
    ? `${caseRecord.fullName} (${caseRecord.sex})`
    : caseRecord.fullName;
  const narrative = caseRecord.incidentDescription?.trim() ?? "";
  const hasNarrative = narrative.length > 0;
  const canTriggerVoiceCall = Boolean(onTriggerVoiceCall && caseRecord.phoneNumber?.trim());

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {caseRecord.incidentId}
            </p>
            <h2 className="text-xl font-semibold leading-tight">{caseRecord.incidentCategory}</h2>
            <p className="text-xs text-muted-foreground leading-tight">
              {caseRecord.location} • {caseRecord.incidentDate} at {caseRecord.incidentTime}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!canTriggerVoiceCall || isVoiceCallPending}
              onClick={() => caseRecord && onTriggerVoiceCall?.(caseRecord)}
            >
              {isVoiceCallPending ? "Calling..." : "Voice Call"}
            </Button>
            <Button size="sm" onClick={() => caseRecord && onSendEmail?.(caseRecord)}>
              Send Email
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {caseRecord.jurisdiction && (
            <StatusPill tone="neutral">Jurisdiction • {caseRecord.jurisdiction}</StatusPill>
          )}
          <StatusPill tone={caseRecord.injuryReported ? "critical" : "neutral"}>
            {injuryText}
          </StatusPill>
          <StatusPill tone={caseRecord.propertyDamage ? "warning" : "neutral"}>
            {damageText}
          </StatusPill>
          {(caseRecord.faultDetermination ?? "").trim().length > 0 && (
            <StatusPill tone="info">Fault • {caseRecord.faultDetermination}</StatusPill>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <DetailField label="Client" value={clientName} />
        <DetailField label="Phone" value={caseRecord.phoneNumber} />
        <DetailField label="Address" value={caseRecord.homeAddress} className="sm:col-span-2" />
        <DetailField label="Resolution" value={caseRecord.resolution || "Pending"} />
        <DetailField
          label="Injury Reported"
          value={caseRecord.injuryReported ? "Yes" : "No"}
          highlight={caseRecord.injuryReported}
        />
        <DetailField
          label="Property Damage"
          value={caseRecord.propertyDamage ? "Yes" : "No"}
          highlight={caseRecord.propertyDamage}
        />
      </div>

      <div className="space-y-2 rounded-lg border border-dashed border-border/60 bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Narrative
          </h3>
          {hasNarrative && (
            <button
              type="button"
              onClick={() => setIsNarrativeExpanded((prev) => !prev)}
              className="text-xs font-medium text-primary transition hover:underline"
            >
              {isNarrativeExpanded ? "Show less" : "Expand"}
            </button>
          )}
        </div>
        <p
          className={cn(
            "whitespace-pre-wrap text-sm leading-snug text-muted-foreground",
            hasNarrative && !isNarrativeExpanded && "line-clamp-5"
          )}
        >
          {hasNarrative ? narrative : "No narrative provided."}
        </p>
      </div>
    </section>
  );
}

interface DetailFieldProps {
  label: string;
  value?: string;
  highlight?: boolean;
  className?: string;
}

function DetailField({ label, value, highlight = false, className }: DetailFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-medium leading-snug",
          highlight ? "text-emerald-600" : "text-foreground"
        )}
      >
        {value?.trim() ? value : "—"}
      </span>
    </div>
  );
}

interface StatusPillProps {
  tone: "critical" | "warning" | "info" | "neutral";
  children: ReactNode;
}

function StatusPill({ tone, children }: StatusPillProps) {
  const tones: Record<StatusPillProps["tone"], string> = {
    critical: "bg-rose-100 text-rose-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-sky-100 text-sky-700",
    neutral: "bg-slate-100 text-slate-600 border border-slate-200",
  };

  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-medium leading-tight", tones[tone])}>
      {children}
    </span>
  );
}
