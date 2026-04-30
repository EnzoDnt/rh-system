import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { useNotifications } from "@/lib/queries.js";
import { useMarkNotificationRead, useMarkAllNotificationsRead } from "@/lib/mutations.js";

const SEVERITY_BADGE: Record<string, string> = {
  error: "bg-red-100 text-red-700",
  warn: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

function NotificationRow({ notif }: { notif: any }) {
  const [expanded, setExpanded] = useState(false);
  const markRead = useMarkNotificationRead(notif.id);
  const isUnread = notif.lue_at === null;

  return (
    <div
      className={`border border-border rounded-[4px] p-4 space-y-2 cursor-pointer transition-colors ${isUnread ? "bg-surface" : "bg-bg opacity-70"}`}
      onClick={() => {
        setExpanded((v) => !v);
        if (isUnread) markRead.mutate();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isUnread && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
          <div className="min-w-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SEVERITY_BADGE[notif.severity] ?? "bg-gray-100 text-gray-700"}`}>
              {notif.type}
            </span>
            <p className="text-sm font-medium text-dark truncate mt-1">{notif.titre}</p>
            <p className="text-xs text-text-muted truncate">{notif.message}</p>
          </div>
        </div>
        <span className="text-[11px] text-text-muted whitespace-nowrap flex-shrink-0">
          {new Date(notif.created_at).toLocaleString("fr-FR")}
        </span>
      </div>
      {expanded && notif.contexte && (
        <pre className="text-[11px] bg-bg border border-border rounded p-3 overflow-auto max-h-48">
          {JSON.stringify(notif.contexte, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data: notifs = [], isLoading } = useNotifications(filter === "unread");
  const markAll = useMarkAllNotificationsRead();

  const unreadCount = notifs.filter((n: any) => n.lue_at === null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark">Notifications</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 border border-border rounded-[4px] overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm ${filter === "all" ? "bg-[var(--color-primary)] text-white" : "bg-surface text-text-secondary hover:bg-bg"}`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-sm ${filter === "unread" ? "bg-[var(--color-primary)] text-white" : "bg-surface text-text-secondary hover:bg-bg"}`}
            >
              Non-lues {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || unreadCount === 0}
          >
            Tout marquer lu
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-text-muted text-sm">Chargement…</p>}
      {!isLoading && notifs.length === 0 && (
        <div className="border border-border rounded-[4px] p-8 text-center text-text-muted">
          <p className="text-sm">{filter === "unread" ? "Aucune notification non-lue." : "Aucune notification."}</p>
        </div>
      )}

      <div className="space-y-2">
        {notifs.map((n: any) => (
          <NotificationRow key={n.id} notif={n} />
        ))}
      </div>
    </div>
  );
}
