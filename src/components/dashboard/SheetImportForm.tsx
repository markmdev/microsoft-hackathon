import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface SheetImportFormProps {
  sheetId: string;
  sheetName?: string;
  isImporting?: boolean;
  onImport: (payload: { sheetId: string; sheetName?: string }) => Promise<void>;
  onListSheets?: (sheetId: string) => Promise<string[]>;
}

export function SheetImportForm({
  sheetId,
  sheetName,
  isImporting,
  onImport,
  onListSheets,
}: SheetImportFormProps) {
  const [localSheetId, setLocalSheetId] = useState(sheetId);
  const [localSheetName, setLocalSheetName] = useState(sheetName ?? "");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [isListing, setIsListing] = useState(false);

  useEffect(() => {
    setLocalSheetId(sheetId);
  }, [sheetId]);

  useEffect(() => {
    setLocalSheetName(sheetName ?? "");
  }, [sheetName]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onImport({ sheetId: localSheetId, sheetName: localSheetName || undefined });
  };

  const handleListSheets = async () => {
    if (!onListSheets || !localSheetId) return;
    setIsListing(true);
    try {
      const sheets = await onListSheets(localSheetId);
      setAvailableSheets(sheets);
    } finally {
      setIsListing(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Google Sheets Connection</h2>
        <p className="text-sm text-muted-foreground">
          Enter the sheet ID (from the URL) and optional tab name. The dashboard will ingest and stage data automatically.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Sheet ID</span>
          <input
            required
            value={localSheetId}
            onChange={(event) => setLocalSheetId(event.target.value)}
            placeholder="1A2B3C..."
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Tab name (optional)</span>
          <input
            value={localSheetName}
            onChange={(event) => setLocalSheetName(event.target.value)}
            placeholder="Accident Feed"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isImporting}>
          {isImporting ? "Importing..." : "Import cases"}
        </Button>
        {onListSheets && (
          <Button
            type="button"
            variant="outline"
            disabled={isListing || !localSheetId}
            onClick={handleListSheets}
          >
            {isListing ? "Checking tabs..." : "List tabs"}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          We&apos;ll use the first tab if no name is provided.
        </p>
      </div>

      {availableSheets.length > 0 && (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium">Available tabs:</p>
          <ul className="mt-1 list-disc pl-4">
            {availableSheets.map((sheet) => (
              <li key={sheet}>
                <button
                  type="button"
                  className="text-primary underline hover:no-underline"
                  onClick={() => setLocalSheetName(sheet)}
                >
                  {sheet}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
