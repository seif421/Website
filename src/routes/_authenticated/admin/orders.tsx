import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Search as SearchIcon, Trash2, Archive } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS,
  money, shortDate, toCsv, downloadBlob, addOrderTimeline,
} from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

type Row = {
  id: string; order_number: string; email: string; total: number;
  status: string; payment_status: string; created_at: string;
  archived_at: string | null; tracking_number: string | null;
};

function OrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [payment, setPayment] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase.from("orders").select(
      "id,order_number,email,total,status,payment_status,created_at,archived_at,tracking_number",
    ).order("created_at", { ascending: false }).limit(500);
    if (!showArchived) query = query.is("archived_at", null);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showArchived]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (payment !== "all" && r.payment_status !== payment) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!r.order_number.toLowerCase().includes(s) && !r.email.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [rows, status, payment, q]);

  const toggle = (id: string) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => setSelected((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id)));

  async function bulkStatus(newStatus: string) {
    if (!selected.size) return;
    const ids = [...selected];
    const { error } = await supabase.from("orders").update({ status: newStatus as never }).in("id", ids);
    if (error) return toast.error(error.message);
    await Promise.all(ids.map((id) => addOrderTimeline(id, `status_${newStatus}`, `Bulk set to ${newStatus}`)));
    toast.success(`${ids.length} orders updated`);
    setSelected(new Set()); load();
  }
  async function bulkArchive() {
    if (!selected.size) return;
    const { error } = await supabase.from("orders").update({ archived_at: new Date().toISOString() }).in("id", [...selected]);
    if (error) return toast.error(error.message);
    toast.success(`Archived ${selected.size}`); setSelected(new Set()); load();
  }
  async function bulkDelete() {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} orders? This cannot be undone.`)) return;
    const { error } = await supabase.from("orders").delete().in("id", [...selected]);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); setSelected(new Set()); load();
  }
  function exportCsv() {
    const cols = ["order_number","email","total","status","payment_status","tracking_number","created_at"] as const;
    downloadBlob(`orders-${Date.now()}.csv`, toCsv(filtered as never, cols as never));
  }

  return (
    <PageShell title="Orders" description="Manage every customer order."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Orders" }]}
      actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-4" /> Export CSV</Button>}>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order # or email" className="pl-8" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={payment} onValueChange={setPayment}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} /> Show archived
          </label>
        </div>

        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Select onValueChange={bulkStatus}>
              <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="Set status…" /></SelectTrigger>
              <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={bulkArchive}><Archive className="size-4" /> Archive</Button>
            <Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="size-4" /> Delete</Button>
          </div>
        )}
      </Card>

      <Card className="mt-4 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No orders match your filters.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} /></TableCell>
                <TableCell><Link to="/admin/orders/$id" params={{ id: r.id }} className="font-mono text-xs font-medium hover:underline">{r.order_number}</Link></TableCell>
                <TableCell className="text-sm">{r.email}</TableCell>
                <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${ORDER_STATUS_CLASS[r.status] ?? "bg-muted"}`}>{ORDER_STATUS_LABEL[r.status] ?? r.status}</span></TableCell>
                <TableCell><Badge variant={r.payment_status === "paid" ? "default" : "secondary"}>{r.payment_status}</Badge></TableCell>
                <TableCell className="text-right font-medium">{money(r.total)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{shortDate(r.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}