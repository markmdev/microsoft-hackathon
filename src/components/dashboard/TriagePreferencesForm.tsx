import { useEffect, useState } from "react";

import type { TriagePreferences } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";

interface TriagePreferencesFormProps {
  value: TriagePreferences;
  onSave: (preferences: TriagePreferences) => Promise<void> | void;
  onReset?: () => void;
  isSaving?: boolean;
}

export function TriagePreferencesForm({ value, onSave, onReset, isSaving }: TriagePreferencesFormProps) {
  const [formState, setFormState] = useState<TriagePreferences>(value);

  useEffect(() => {
    setFormState(value);
  }, [value]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave(formState);
  };

  const updateField = <K extends keyof TriagePreferences>(key: K, newValue: TriagePreferences[K]) => {
    setFormState((prev) => ({ ...prev, [key]: newValue }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Triage Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Control which incidents trigger alerts. Updates are persisted on the backend profile.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onReset}>
            Reset
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Incident categories</span>
          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Vehicle Collision, Slip and Fall, ..."
            value={formState.categoriesOfInterest.join(", ")}
            onChange={(event) =>
              updateField(
                "categoriesOfInterest",
                event.target.value
                  .split(",")
                  .map((entry) => entry.trim())
                  .filter(Boolean),
              )
            }
          />
          <span className="text-xs text-muted-foreground">
            Comma-separated; match the incident category wording in your sheet.
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Cities / jurisdictions</span>
          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="San Francisco, Oakland, ..."
            value={formState.citiesOfInterest.join(", ")}
            onChange={(event) =>
              updateField(
                "citiesOfInterest",
                event.target.value
                  .split(",")
                  .map((entry) => entry.trim())
                  .filter(Boolean),
              )
            }
          />
          <span className="text-xs text-muted-foreground">
            Match against jurisdiction code or location text.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formState.requireInjury}
            onChange={(event) => updateField("requireInjury", event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span>Alert only when an injury is reported</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formState.includePropertyDamage}
            onChange={(event) => updateField("includePropertyDamage", event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span>Include property-damage-only incidents</span>
        </label>
      </div>
    </form>
  );
}
