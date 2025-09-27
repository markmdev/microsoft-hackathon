import type { ReactNode } from "react";

import type { CaseRecord } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

interface CaseFeedProps {
  cases: CaseRecord[];
  queuedCount: number;
  activeCaseId?: string;
  onSelectCase: (incidentId: string) => void;
}

const baseCardStyles =
  "flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md";

export function CaseFeed({ cases, queuedCount, activeCaseId, onSelectCase }: CaseFeedProps) {
  return (
    <section className="flex flex-1 flex-col gap-3">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Live Incident Feed</h2>
          <p className="text-sm text-muted-foreground">
            New reports appear automatically. Click to inspect full details.
          </p>
        </div>
        <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          {queuedCount > 0 ? `${queuedCount} awaiting processing` : "Fully synced"}
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {cases.map((caseRecord) => {
          const isActive = caseRecord.incidentId === activeCaseId;
          return (
            <article
              key={caseRecord.incidentId}
              className={cn(
                baseCardStyles,
                isActive && "border-primary bg-primary/5 shadow-lg",
              )}
              onClick={() => onSelectCase(caseRecord.incidentId)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {caseRecord.incidentId}
                  </p>
                  <h3 className="text-lg font-semibold">{caseRecord.incidentCategory}</h3>
                </div>
                <span className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                  {caseRecord.jurisdiction}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                {caseRecord.location} • {caseRecord.incidentDate} at {caseRecord.incidentTime}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge intent={caseRecord.injuryReported ? "critical" : "neutral"}>
                  {caseRecord.injuryReported ? "Injury reported" : "No injury reported"}
                </Badge>
                <Badge intent={caseRecord.propertyDamage ? "warning" : "neutral"}>
                  {caseRecord.propertyDamage ? "Property damage" : "No property damage"}
                </Badge>
                <Badge intent="outline">Fault: {caseRecord.faultDetermination || "Pending"}</Badge>
              </div>

              <p className="line-clamp-3 text-sm text-muted-foreground">
                {caseRecord.incidentDescription}
              </p>
            </article>
          );
        })}
        {cases.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Import a Google Sheet to populate the live feed.
          </div>
        )}
      </div>
    </section>
  );
}

interface BadgeProps {
  intent: "critical" | "warning" | "neutral" | "outline";
  children: ReactNode;
}

function Badge({ intent, children }: BadgeProps) {
  const styles: Record<BadgeProps["intent"], string> = {
    critical: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    neutral: "bg-muted text-muted-foreground",
    outline: "border border-border text-muted-foreground",
  };

  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", styles[intent])}>
      {children}
    </span>
  );
}
