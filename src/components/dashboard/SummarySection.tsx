import type { DashboardMetrics, SheetBinding, CaseRecord } from "@/lib/dashboard/types";

interface SummarySectionProps {
  metrics: DashboardMetrics;
  sheet: SheetBinding & { title?: string };
  cases: CaseRecord[];
}

const summaryCardStyle =
  "flex flex-1 flex-col gap-1 rounded-lg border border-border bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-sm hover:shadow-md transition-all duration-200";

export function SummarySection({ metrics, sheet, cases }: SummarySectionProps) {
  // Calculate actual counts from visible cases
  const visibleCasesCount = cases.length;
  const visibleInjuryCount = cases.filter(c => c.injuryReported).length;
  const visiblePropertyDamageCount = cases.filter(c => c.propertyDamage).length;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Live Docket Overview</h2>
        <p className="text-sm text-muted-foreground">
          Snapshot of imported incidents sourced from Google Sheets.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={`${summaryCardStyle} relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
          <p className="text-sm text-muted-foreground">Cases currently visible</p>
          <p className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{visibleCasesCount}</p>
          <p className="text-xs text-muted-foreground">
            Live feed showing real-time data
          </p>
        </div>

        <div className={`${summaryCardStyle} relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-pink-400"></div>
          <p className="text-sm text-muted-foreground">Injury reports</p>
          <p className="text-3xl font-semibold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">{visibleInjuryCount}</p>
          <p className="text-xs text-emerald-500">
            {visibleInjuryCount > 0 ? "Action required" : "No injuries flagged"}
          </p>
        </div>

        <div className={`${summaryCardStyle} relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-yellow-400"></div>
          <p className="text-sm text-muted-foreground">Property damage</p>
          <p className="text-3xl font-semibold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">{visiblePropertyDamageCount}</p>
          <p className="text-xs text-muted-foreground">
            Includes vehicles, infrastructure, and on-site assets.
          </p>
        </div>
      </div>
    </section>
  );
}
