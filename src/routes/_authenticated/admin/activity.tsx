import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: ActivityPage,
});

type Row = {
  id: string; user_id: string | null; action: string;
  entity_type: string | null; entity_id: string | null;
  metadata: unknown; ip_address: string | null; created_at: string;
};

function ActivityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("id,user_id,action,entity_type,entity_id,metadata,ip_address,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  return (
    <PageShell
      title="Activity Logs"
      description="Audit trail of admin actions."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Activity" }]}
    >
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No activity yet.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs font-mono">{r.user_id?.slice(0, 8) ?? "system"}</TableCell>
                <TableCell><span className="text-sm font-medium">{r.action}</span></TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.entity_type ?? "—"}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}</TableCell>
                <TableCell className="text-xs font-mono max-w-xs truncate">{r.metadata ? JSON.stringify(r.metadata) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}