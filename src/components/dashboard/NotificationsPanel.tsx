import type { NotificationEntry } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";

interface NotificationsPanelProps {
  notifications: NotificationEntry[];
  onDismiss: (notificationId: string) => void;
}

export function NotificationsPanel({ notifications, onDismiss }: NotificationsPanelProps) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Triage Alerts</h2>
          <p className="text-sm text-muted-foreground">
            Alerts are generated when new incidents match your profile preferences.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {notifications.length} active
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {notifications.length === 0 && (
          <div className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No active alerts. Update your triage preferences to monitor specific matters.
          </div>
        )}

        {notifications.map((notification) => (
          <article
            key={notification.id}
            className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-emerald-700">
                {notification.message}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDismiss(notification.id)}
              >
                Dismiss
              </Button>
            </div>
            <p className="text-xs text-emerald-600">
              Incident {notification.incidentId} • notified {new Date(notification.createdAt).toLocaleString()}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
