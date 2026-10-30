import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Search as SearchIcon } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { money, shortDate, toCsv, downloadBlob } from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/customers/")({
  component: CustomersPage,
});

type Row = {
  id: string; email: string | null; full_name: string | null; phone: string | null;
  created_at: string; orders: number; ltv: number; last_order: string | null;
};
type Segment = "all" | "vip" | "new" | "returning" | "inactive" | "high_value";

function CustomersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<Segment>("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [pRes, oRes] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,phone,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("orders").select("user_id,total,created_at,status").is("archived_at", null),
    ]);
    if (pRes.error) toast.error(pRes.error.message);
    const profiles = (pRes.data ?? []) as { id: string; email: string | null; full_name: string | null; phone: string | null; created_at: string }[];
    const orders = (oRes.data ?? []) as { user_id: string; total: number; created_at: string; status: string }[];
    const map = new Map<string, { orders: number; ltv: number; last_order: string | null }>();
    for (const o of orders) {
      if (["cancelled", "failed_payment"].includes(o.status)) continue;
      const cur = map.get(o.user_id) ?? { orders: 0, ltv: 0, last_order: null };
      cur.orders += 1;
      cur.ltv += Number(o.total ?? 0);
      if (!cur.last_order || o.created_at > cur.last_order) cur.last_order = o.created_at;
      map.set(o.user_id, cur);
    }
    setRows(profiles.map((p) => ({ ...p, ...(map.get(p.id) ?? { orders: 0, ltv: 0, last_order: null }) })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const now = Date.now();
  const filtered = useMemo(() => rows.filter((r) => {
    if (q) {
      const s = q.toLowerCase();
      if (!(r.email ?? "").toLowerCase().includes(s) && !(r.full_name ?? "").toLowerCase().includes(s)) return false;
    }
    const isNew = now - new Date(r.created_at).getTime() < 30 * 86400_000;
    const daysSince = r.last_order ? (now - new Date(r.last_order).getTime()) / 86400_000 : Infinity;
    switch (seg) {
      case "vip": return r.ltv >= 1000;
      case "new": return isNew;
      case "returning": return r.orders >= 2;
      case "inactive": return daysSince > 90;
      case "high_value": return r.ltv >= 500;
      default: return true;
    }
  }), [rows, q, seg, now]);

  function exportCsv() {
    downloadBlob(`customers-${Date.now()}.csv`, toCsv(filtered as never, ["email","full_name","phone","orders","ltv","last_order","created_at"] as never));
  }

  const segCounts = useMemo(() => {
    const c = { all: rows.length, vip: 0, new: 0, returning: 0, inactive: 0, high_value: 0 };
    for (const r of rows) {
      if (r.ltv >= 1000) c.vip++;
      if (now - new Date(r.created_at).getTime() < 30 * 86400_000) c.new++;
      if (r.orders >= 2) c.returning++;
      if (r.last_order && (now - new Date(r.last_order).getTime()) / 86400_000 > 90) c.inactive++;
      if (r.ltv >= 500) c.high_value++;
    }
    return c;
  }, [rows, now]);

  return (
    <PageShell title="Customers" description="Manage customers, tags, and lifetime value."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Customers" }]}
      actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-4" /> Export</Button>}>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {(["all","vip","new","returning","inactive","high_value"] as const).map((k) => (
          <button key={k} onClick={() => setSeg(k)}
            className={`rounded-lg border p-3 text-left transition ${seg === k ? "border-brand bg-brand/5" : "hover:bg-muted/40"}`}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.replace("_"," ")}</p>
            <p className="mt-1 text-xl font-bold">{segCounts[k]}</p>
          </button>
        ))}
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="pl-8" />
          </div>
          <Select value={seg} onValueChange={(v) => setSeg(v as Segment)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              <SelectItem value="vip">VIP (≥$1k LTV)</SelectItem>
              <SelectItem value="new">New (last 30d)</SelectItem>
              <SelectItem value="returning">Returning (2+ orders)</SelectItem>
              <SelectItem value="inactive">Inactive (90d+)</SelectItem>
              <SelectItem value="high_value">High value (≥$500)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Customer</TableHead><TableHead>Email</TableHead><TableHead>Orders</TableHead>
            <TableHead>LTV</TableHead><TableHead>Last Order</TableHead><TableHead>Joined</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No customers found.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Link to="/admin/customers/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.full_name ?? "Unnamed"}</Link>
                  {r.ltv >= 1000 && <Badge className="ml-2" variant="default">VIP</Badge>}
                </TableCell>
                <TableCell className="text-sm">{r.email}</TableCell>
                <TableCell>{r.orders}</TableCell>
                <TableCell className="font-medium">{money(r.ltv)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.last_order ? shortDate(r.last_order) : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{shortDate(r.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}