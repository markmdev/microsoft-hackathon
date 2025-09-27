import type { CaseRecord } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";

interface CaseDetailPanelProps {
  caseRecord?: CaseRecord;
  onSendEmail?: (caseRecord: CaseRecord) => void;
  onTriggerVoiceCall?: (caseRecord: CaseRecord) => void;
}

export function CaseDetailPanel({
  caseRecord,
  onSendEmail,
  onTriggerVoiceCall,
}: CaseDetailPanelProps) {
  if (!caseRecord) {
    return (
      <section className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Select a case from the feed to review full details.
      </section>
    );
  }

  const injuryText = caseRecord.injuryReported ? "Yes" : "No";
  const damageText = caseRecord.propertyDamage ? "Yes" : "No";

  return (
    <section className="flex h-full flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{caseRecord.incidentId}</p>
          <h2 className="text-2xl font-semibold">{caseRecord.incidentCategory}</h2>
          <p className="text-sm text-muted-foreground">
            {caseRecord.location} • {caseRecord.incidentDate} at {caseRecord.incidentTime}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            disabled
            onClick={() => caseRecord && onTriggerVoiceCall?.(caseRecord)}
          >
            Voice Call (coming soon)
          </Button>
          <Button
            onClick={() => caseRecord && onSendEmail?.(caseRecord)}
          >
            Send Email via Resend
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailField label="Client" value={`${caseRecord.fullName} (${caseRecord.sex || ""})`} />
        <DetailField label="Phone" value={caseRecord.phoneNumber} />
        <DetailField label="Address" value={caseRecord.homeAddress} />
        <DetailField label="Resolution" value={caseRecord.resolution || "Pending"} />
        <DetailField label="Injury Reported" value={injuryText} highlight={caseRecord.injuryReported} />
        <DetailField label="Property Damage" value={damageText} highlight={caseRecord.propertyDamage} />
        <DetailField label="Fault Determination" value={caseRecord.faultDetermination || "Undetermined"} />
        <DetailField label="Jurisdiction" value={caseRecord.jurisdiction} />
      </div>

      <div className="rounded-lg bg-muted/40 p-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Narrative</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {caseRecord.incidentDescription || "No narrative provided."}
        </p>
      </div>
    </section>
  );
}

interface DetailFieldProps {
  label: string;
  value?: string;
  highlight?: boolean;
}

function DetailField({ label, value, highlight = false }: DetailFieldProps) {
  return (
    <div className="flex flex-col gap-1 rounded border border-border/60 bg-background/60 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-emerald-600" : "text-foreground"}`}>
        {value || "—"}
      </p>
    </div>
  );
}
