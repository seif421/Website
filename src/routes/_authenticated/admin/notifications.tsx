import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/notifications")({ component: NotificationsPage });

type N = { id: string; type: string; title: string; message: string | null; link: string | null; is_read: boolean; created_at: string };

function NotificationsPage() {
  const [rows, setRows] = useState<N[]>([]);
  async function load() {
    const { data } = await supabase.from("notifications").select("*").eq("audience", "staff").order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as N[]);
  }
  useEffect(() => { load(); }, []);
  async function markRead(id: string) { await supabase.from("notifications").update({ is_read: true }).eq("id", id); load(); }
  async function markAll() { await supabase.from("notifications").update({ is_read: true }).eq("audience", "staff").eq("is_read", false); load(); }
  async function del(id: string) { await supabase.from("notifications").delete().eq("id", id); load(); }
  return (
    <PageShell title="Notifications" description="Staff notifications and alerts."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Notifications" }]}
      actions={<Button variant="outline" size="sm" onClick={markAll}><Check className="size-4" /> Mark all read</Button>}>
      <div className="space-y-2">
        {rows.length === 0 && <Card className="p-10 text-center text-sm text-muted-foreground">You're all caught up.</Card>}
        {rows.map((n) => (
          <Card key={n.id} className={`p-4 flex items-start justify-between gap-3 ${n.is_read ? "opacity-70" : ""}`}>
            <div>
              <p className="text-sm font-medium">{n.title} {!n.is_read && <Badge className="ml-1">New</Badge>}</p>
              {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{n.type} · {relativeTime(n.created_at)}</p>
            </div>
            <div className="flex gap-1">
              {!n.is_read && <Button size="icon" variant="ghost" onClick={() => markRead(n.id)}><Check className="size-4" /></Button>}
              <Button size="icon" variant="ghost" onClick={() => del(n.id)}><Trash2 className="size-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}