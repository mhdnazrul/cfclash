import { useEffect, useMemo, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { approveRoomRequest, declineRoomRequest } from "@/lib/cfclash-service";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationRow {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  metadata?: { request_id?: string; room_id?: string };
}

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, message, is_read, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setItems(data as NotificationRow[]);
    setLoading(false);
  }, [user?.id]);

  const markVisibleRead = async () => {
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { message?: string };
            if (row?.message) toast.message(row.message);
          }
          fetchNotifications();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, fetchNotifications]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void markVisibleRead();
        }}
        className="relative p-2 rounded-full border border-border bg-background/50 hover:bg-muted/30 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-cyan-500 text-background text-xs font-semibold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] glass-card bg-background/95 border border-border rounded-xl shadow-2xl overflow-hidden z-[60]">
          <div className="px-4 py-3 border-b border-border text-sm font-medium">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : items.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">You&apos;re all caught up.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="p-3 border-b border-border/40 last:border-0">
                  <p className="text-sm text-foreground">{n.message}</p>
                  {n.type === "join_request" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const rid = n.metadata?.request_id;
                          if (!rid) return;
                          try {
                            await approveRoomRequest(rid);
                            toast.success("Approved");
                            fetchNotifications();
                          } catch (e: unknown) {
                            toast.error(supabaseErrorMessage(e, "Failed to approve"));
                          }
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 font-medium"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const rid = n.metadata?.request_id;
                          if (!rid) return;
                          try {
                            await declineRoomRequest(rid);
                            toast.success("Rejected");
                            fetchNotifications();
                          } catch (e: unknown) {
                            toast.error(supabaseErrorMessage(e, "Failed to reject"));
                          }
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-destructive/15 text-destructive font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
