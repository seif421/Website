import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { money, shortDate } from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/returns")({ component: ReturnsPage });

type R = { id: string; return_number: string; order_id: string; status: string; type: string; reason: string | null; refund_amount: number | null; created_at: string };

function ReturnsPage() {
  const [rows, setRows] = useState<R[]>([]);
  async function load() {
    const { data, error } = await supabase.from("returns").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as R[]);
  }
  useEffect(() => { load(); }, []);
  async function setStatus(id: string, status: string) {
    const patch = { status } as { status: string; processed_at?: string };
    if (["approved","rejected","refunded","replaced"].includes(status)) patch.processed_at = new Date().toISOString();
    await supabase.from("returns").update(patch as never).eq("id", id); load();
  }
  return (
    <PageShell title="Returns" description="Approve returns and process refunds."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Returns" }]}>
      <div className="space-y-2">
        {rows.length === 0 && <Card className="p-10 text-center text-sm text-muted-foreground">No return requests yet.</Card>}
        {rows.map((r) => (
          <Card key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-medium">{r.return_number}</p>
              <p className="text-xs text-muted-foreground">{r.type} · {r.reason ?? "no reason"} · {shortDate(r.created_at)} {r.refund_amount ? `· ${money(r.refund_amount)}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
              {r.status === "requested" && <>
                <Button size="sm" onClick={() => setStatus(r.id, "approved")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>Reject</Button>
              </>}
              {r.status === "approved" && <>
                <Button size="sm" onClick={() => setStatus(r.id, "refunded")}>Mark Refunded</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "replaced")}>Mark Replaced</Button>
              </>}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}