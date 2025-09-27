import type { DashboardMetrics, SheetBinding } from "@/lib/dashboard/types";

interface SummarySectionProps {
  metrics: DashboardMetrics;
  sheet: SheetBinding & { title?: string };
}

const summaryCardStyle =
  "flex flex-1 flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm";

export function SummarySection({ metrics, sheet }: SummarySectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Live Docket Overview</h2>
        <p className="text-sm text-muted-foreground">
          Snapshot of imported incidents sourced from Google Sheets.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={summaryCardStyle}>
          <p className="text-sm text-muted-foreground">Total cases ingested</p>
          <p className="text-3xl font-semibold">{metrics.totalCases}</p>
          <p className="text-xs text-muted-foreground">
            {sheet.sheetName ? `Sheet: ${sheet.sheetName}` : "Awaiting sheet selection"}
          </p>
        </div>

        <div className={summaryCardStyle}>
          <p className="text-sm text-muted-foreground">Injury reports</p>
          <p className="text-3xl font-semibold">{metrics.injuryCount}</p>
          <p className="text-xs text-emerald-500">
            {metrics.injuryCount > 0 ? "Action required" : "No injuries flagged"}
          </p>
        </div>

        <div className={summaryCardStyle}>
          <p className="text-sm text-muted-foreground">Property damage</p>
          <p className="text-3xl font-semibold">{metrics.propertyDamageCount}</p>
          <p className="text-xs text-muted-foreground">
            Includes vehicles, infrastructure, and on-site assets.
          </p>
        </div>
      </div>
    </section>
  );
}
