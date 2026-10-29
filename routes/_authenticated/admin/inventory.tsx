import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, Search, Plus, Minus, PackageCheck, PackageX, PackageOpen,
  History, ArrowUpRight, ArrowDownRight, AlertTriangle, Boxes,
} from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logAdminActivity } from "@/lib/admin/products-helpers";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: InventoryPage,
});

type Row = {
  product_id: string; product_name: string; product_slug: string;
  sku: string | null; stock: number; reserved: number; incoming: number;
  low_stock_threshold: number; location: string | null;
  allow_backorder: boolean; allow_preorder: boolean;
  price: number | null;
};

type HistoryRow = {
  id: string; created_at: string; change: number; new_stock: number;
  reason: string | null; location: string | null;
  product?: { name: string } | null;
};

function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [adjust, setAdjust] = useState<Row | null>(null);
  const [adjChange, setAdjChange] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjLocation, setAdjLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState<"stock" | "history">("stock");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("inventory")
      .select("product_id,stock,reserved,incoming,low_stock_threshold,location,allow_backorder,allow_preorder,product:products(name,slug,sku,price,deleted_at)")
      .order("stock");
    if (error) toast.error("Failed to load", { description: error.message });
    const mapped: Row[] = (data ?? [])
      .filter((r: any) => r.product && !r.product.deleted_at)
      .map((r: any) => ({
        product_id: r.product_id,
        product_name: r.product.name,
        product_slug: r.product.slug,
        sku: r.product.sku,
        stock: r.stock, reserved: r.reserved, incoming: r.incoming,
        low_stock_threshold: r.low_stock_threshold,
        location: r.location,
        allow_backorder: r.allow_backorder,
        allow_preorder: r.allow_preorder,
        price: r.product.price,
      }));
    setRows(mapped);
    setLoading(false);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data } = await supabase.from("inventory_history")
      .select("id,created_at,change,new_stock,reason,location,product:products(name)")
      .order("created_at", { ascending: false }).limit(100);
    setHistory((data ?? []) as unknown as HistoryRow[]);
    setHistoryLoading(false);
  };

  useEffect(() => { load(); loadHistory(); }, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.location) set.add(r.location); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (q && !(r.product_name.toLowerCase().includes(q) || (r.sku ?? "").toLowerCase().includes(q))) return false;
    const available = r.stock - r.reserved;
    if (stockFilter === "in" && available <= r.low_stock_threshold) return false;
    if (stockFilter === "low" && !(available > 0 && available <= r.low_stock_threshold)) return false;
    if (stockFilter === "out" && available > 0) return false;
    if (locationFilter !== "all" && (r.location ?? "") !== locationFilter) return false;
    return true;
  });

  const stats = useMemo(() => {
    let inStock = 0, low = 0, out = 0, incoming = 0;
    rows.forEach((r) => {
      const a = r.stock - r.reserved;
      if (a <= 0) out++;
      else if (a <= r.low_stock_threshold) low++;
      else inStock++;
      incoming += r.incoming;
    });
    return { inStock, low, out, incoming, total: rows.length };
  }, [rows]);

  const openAdjust = (r: Row) => {
    setAdjust(r);
    setAdjChange("");
    setAdjReason("");
    setAdjLocation(r.location ?? "");
  };

  const saveAdjust = async () => {
    if (!adjust) return;
    const change = Number(adjChange);
    if (!Number.isFinite(change) || change === 0) return toast.error("Enter a non-zero change");
    const newStock = Math.max(0, adjust.stock + change);
    setSaving(true);
    try {
      const { error } = await supabase.from("inventory").update({
        stock: newStock,
        location: adjLocation || null,
      } as never).eq("product_id", adjust.product_id);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("inventory_history").insert({
        product_id: adjust.product_id,
        change, new_stock: newStock, reason: adjReason || null,
        location: adjLocation || null, user_id: user?.id ?? null,
      } as never);
      await logAdminActivity(change > 0 ? "restocked" : "deducted", "product", adjust.product_id, { change, new_stock: newStock });
      toast.success("Stock updated", { description: `${adjust.product_name}: ${adjust.stock} → ${newStock}` });
      setAdjust(null);
      load(); loadHistory();
    } catch (e: any) { toast.error("Update failed", { description: e.message }); }
    finally { setSaving(false); }
  };

  const badge = (r: Row) => {
    const a = r.stock - r.reserved;
    if (a <= 0) return <Badge className="bg-red-500/15 text-red-700 dark:text-red-300">Out</Badge>;
    if (a <= r.low_stock_threshold) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Low</Badge>;
    return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">In stock</Badge>;
  };

  return (
    <PageShell
      title="Inventory"
      description="Track stock, adjustments, warehouses, and low-stock alerts."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Inventory" }]}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Boxes} label="SKUs" value={stats.total} tone="default" />
        <StatCard icon={PackageCheck} label="In stock" value={stats.inStock} tone="ok" />
        <StatCard icon={AlertTriangle} label="Low stock" value={stats.low} tone="warn" />
        <StatCard icon={PackageX} label="Out of stock" value={stats.out} tone="bad" />
        <StatCard icon={PackageOpen} label="Incoming units" value={stats.incoming} tone="info" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="stock">Stock levels</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-1 size-4" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search product or SKU" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as any)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="in">In stock</SelectItem>
                <SelectItem value="low">Low stock</SelectItem>
                <SelectItem value="out">Out of stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Warehouse" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Incoming</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-right">Adjust</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No products match the filter.</TableCell></TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.product_id}>
                      <TableCell className="font-medium">
                        <Link to="/admin/products/$id" params={{ id: r.product_id }} className="hover:underline">{r.product_name}</Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.sku ?? "—"}</TableCell>
                      <TableCell className="text-right">{r.stock}</TableCell>
                      <TableCell className="text-right">{r.reserved}</TableCell>
                      <TableCell className="text-right font-medium">{r.stock - r.reserved}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.incoming}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.location ?? "—"}</TableCell>
                      <TableCell>{badge(r)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openAdjust(r)}>Adjust</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">New stock</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : history.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No adjustments logged yet.</TableCell></TableRow>
                ) : (
                  history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</TableCell>
                      <TableCell>{h.product?.name ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={"inline-flex items-center gap-1 " + (h.change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                          {h.change > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                          {h.change > 0 ? "+" : ""}{h.change}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{h.new_stock}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{h.location ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{h.reason ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            {adjust && <DialogDescription>{adjust.product_name} — currently {adjust.stock} on hand</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setAdjChange(String((Number(adjChange) || 0) - 1))}><Minus className="size-4" /></Button>
              <Input type="number" inputMode="numeric" value={adjChange} placeholder="e.g. 10 or -3"
                onChange={(e) => setAdjChange(e.target.value)} className="text-center" />
              <Button variant="outline" size="icon" onClick={() => setAdjChange(String((Number(adjChange) || 0) + 1))}><Plus className="size-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Positive numbers add stock, negative numbers remove. New stock will be{" "}
              <strong>{adjust ? Math.max(0, adjust.stock + (Number(adjChange) || 0)) : 0}</strong>.
            </p>
            <div className="space-y-1.5"><Label>Warehouse / location</Label>
              <Input value={adjLocation} onChange={(e) => setAdjLocation(e.target.value)} placeholder="Main warehouse" /></div>
            <div className="space-y-1.5"><Label>Reason</Label>
              <Textarea rows={2} value={adjReason} onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Restock, damage write-off, cycle count…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjust(null)}>Cancel</Button>
            <Button onClick={saveAdjust} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : null} Save adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "default" | "ok" | "warn" | "bad" | "info" }) {
  const map: Record<string, string> = {
    default: "text-foreground",
    ok: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4" /> {label}</div>
      <div className={"mt-2 text-2xl font-bold " + map[tone]}>{value}</div>
    </div>
  );
}