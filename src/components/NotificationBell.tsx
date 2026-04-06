import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { approveRoomRequest, declineRoomRequest } from "@/lib/cfclash-service";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  type: "join_request" | "approved" | "declined";
  message: string;
  is_read: boolean;
  metadata?: { request_id?: string };
}

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const fetchNotifications = async () => {
    const { data } = await (supabase as any).from("notifications").select("id, type, message, is_read, metadata").order("created_at", { ascending: false }).limit(20);
    if (data) setItems(data);
  };

  const markAllRead = async () => {
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;
    await (supabase as any).from("notifications").update({ is_read: true }).in("id", unreadIds);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  useEffect(() => {
    fetchNotifications();
    const ch = supabase.channel("notifications-bell").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchNotifications).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="relative">
      <button onClick={() => { const next = !open; setOpen(next); if (next) markAllRead(); }} className="relative p-2 rounded-full border border-border bg-background/50">
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-xs flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 glass-card bg-background/95 border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border text-sm font-medium">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="p-3 border-b border-border/40">
                  <p className="text-sm">{n.message}</p>
                  {n.type === "join_request" && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={async () => { try { await approveRoomRequest(n.metadata?.request_id || ""); toast.success("Approved"); fetchNotifications(); } catch (e: any) { toast.error(e.message || "Failed"); } }} className="text-xs px-2 py-1 rounded bg-[hsl(120,50%,50%)]/20 text-[hsl(120,50%,50%)]">Approve</button>
                      <button onClick={async () => { try { await declineRoomRequest(n.metadata?.request_id || ""); toast.success("Declined"); fetchNotifications(); } catch (e: any) { toast.error(e.message || "Failed"); } }} className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive">Decline</button>
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
