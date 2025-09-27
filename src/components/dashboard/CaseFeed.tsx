import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

import type { CaseRecord } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

interface CaseFeedProps {
  cases: CaseRecord[];
  queuedCount: number;
  activeCaseId?: string;
  onSelectCase: (incidentId: string) => void;
}

const baseListItemStyles =
  "flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-gradient-to-r from-white via-white to-slate-50/50 p-4 transition-all duration-200 hover:from-blue-50/50 hover:to-purple-50/50 hover:shadow-md";

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
        <div className="rounded-full bg-gradient-to-r from-emerald-100 to-green-100 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
          {queuedCount > 0 ? `${queuedCount} more incoming` : "Live feed active"}
        </div>
      </header>

      <div className="h-[600px] overflow-y-auto space-y-3">
        <AnimatePresence mode="popLayout">
          {cases.map((caseRecord) => {
            const isActive = caseRecord.incidentId === activeCaseId;
            return (
              <motion.article
                key={caseRecord.incidentId}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                  duration: 0.3
                }}
                className={cn(
                  baseListItemStyles,
                  isActive && "border-purple-400 bg-gradient-to-r from-purple-50 to-blue-50 shadow-lg ring-1 ring-purple-200",
                )}
                onClick={() => onSelectCase(caseRecord.incidentId)}
              >
              <div className="flex-shrink-0 w-24">
                <p className="text-xs font-medium text-muted-foreground">
                  {caseRecord.incidentId}
                </p>
                <span className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                  {caseRecord.jurisdiction}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold truncate">{caseRecord.incidentCategory}</h3>
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
                    <Badge intent={caseRecord.injuryReported ? "critical" : "neutral"}>
                      {caseRecord.injuryReported ? "Injury" : "No injury"}
                    </Badge>
                    <Badge intent={caseRecord.propertyDamage ? "warning" : "neutral"}>
                      {caseRecord.propertyDamage ? "Damage" : "No damage"}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground truncate">
                  {caseRecord.location} • {caseRecord.incidentDate} at {caseRecord.incidentTime}
                </p>

                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {caseRecord.incidentDescription}
                </p>
              </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
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
