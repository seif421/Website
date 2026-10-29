import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { money as moneyFmt, shortDate, toCsv, downloadBlob } from "@/lib/admin/formatters";
const money = (v: unknown) => moneyFmt(v as number);

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <PageShell title="Reports" description="Sales, orders, tax, and inventory reports."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Reports" }]}>
      <Tabs defaultValue="sales">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="tax">Taxes</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>
        <TabsContent value="sales"><SalesReport /></TabsContent>
        <TabsContent value="orders"><OrdersReport /></TabsContent>
        <TabsContent value="customers"><CustomersReport /></TabsContent>
        <TabsContent value="inventory"><InventoryReport /></TabsContent>
        <TabsContent value="coupons"><CouponsReport /></TabsContent>
        <TabsContent value="tax"><TaxReport /></TabsContent>
        <TabsContent value="shipping"><ShippingReport /></TabsContent>
        <TabsContent value="products"><ProductsReport /></TabsContent>
      </Tabs>
    </PageShell>
  );
}

function ExportBar({ onCsv }: { onCsv: () => void }) {
  return (
    <div className="mt-3 flex gap-2 justify-end">
      <Button size="sm" variant="outline" onClick={onCsv}><Download className="size-4" /> CSV</Button>
      <Button size="sm" variant="outline" onClick={() => window.print()}><Download className="size-4" /> PDF (print)</Button>
    </div>
  );
}

function SalesReport() {
  const [rows, setRows] = useState<{ date: string; orders: number; revenue: number }[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("orders").select("total,created_at,status").is("archived_at", null).order("created_at", { ascending: false }).limit(1000);
    const map = new Map<string, { orders: number; revenue: number }>();
    for (const o of (data ?? [])) {
      if (["cancelled","failed_payment"].includes(o.status as string)) continue;
      const d = String(o.created_at).slice(0, 10);
      const cur = map.get(d) ?? { orders: 0, revenue: 0 };
      cur.orders++; cur.revenue += Number(o.total ?? 0);
      map.set(d, cur);
    }
    setRows([...map.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => b.date.localeCompare(a.date)));
  })(); }, []);
  return <Card className="p-4 mt-4">
    <ReportTable rows={rows} cols={[["date","Date"],["orders","Orders"],["revenue","Revenue",money]]} />
    <ExportBar onCsv={() => downloadBlob("sales.csv", toCsv(rows as never, ["date","orders","revenue"] as never))} />
  </Card>;
}
function OrdersReport() {
  const [rows, setRows] = useState<{ status: string; count: number; revenue: number }[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("orders").select("status,total").is("archived_at", null);
    const map = new Map<string, { count: number; revenue: number }>();
    for (const o of (data ?? [])) {
      const cur = map.get(o.status as string) ?? { count: 0, revenue: 0 };
      cur.count++; cur.revenue += Number(o.total ?? 0);
      map.set(o.status as string, cur);
    }
    setRows([...map.entries()].map(([status, v]) => ({ status, ...v })));
  })(); }, []);
  return <Card className="p-4 mt-4">
    <ReportTable rows={rows} cols={[["status","Status"],["count","Count"],["revenue","Revenue",money]]} />
    <ExportBar onCsv={() => downloadBlob("orders-report.csv", toCsv(rows as never, ["status","count","revenue"] as never))} />
  </Card>;
}
function CustomersReport() {
  const [rows, setRows] = useState<{ month: string; new_customers: number }[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("profiles").select("created_at");
    const map = new Map<string, number>();
    for (const p of (data ?? [])) {
      const m = String(p.created_at).slice(0, 7);
      map.set(m, (map.get(m) ?? 0) + 1);
    }
    setRows([...map.entries()].map(([month, new_customers]) => ({ month, new_customers })).sort((a, b) => b.month.localeCompare(a.month)));
  })(); }, []);
  return <Card className="p-4 mt-4">
    <ReportTable rows={rows} cols={[["month","Month"],["new_customers","New Customers"]]} />
    <ExportBar onCsv={() => downloadBlob("customers.csv", toCsv(rows as never, ["month","new_customers"] as never))} />
  </Card>;
}
function InventoryReport() {
  const [rows, setRows] = useState<{ name: string; sku: string | null; stock: number }[]>([]);
  useEffect(() => { supabase.from("products").select("name,sku,stock").order("stock").limit(200).then(({ data }) => setRows((data ?? []) as never)); }, []);
  return <Card className="p-4 mt-4"><ReportTable rows={rows} cols={[["name","Product"],["sku","SKU"],["stock","Stock"]]} /><ExportBar onCsv={() => downloadBlob("inventory.csv", toCsv(rows as never, ["name","sku","stock"] as never))} /></Card>;
}
function CouponsReport() {
  const [rows, setRows] = useState<{ code: string; used_count: number; is_active: boolean }[]>([]);
  useEffect(() => { supabase.from("coupons").select("code,used_count,is_active").order("used_count", { ascending: false }).then(({ data }) => setRows((data ?? []) as never)); }, []);
  return <Card className="p-4 mt-4"><ReportTable rows={rows} cols={[["code","Code"],["used_count","Uses"],["is_active","Active"]]} /><ExportBar onCsv={() => downloadBlob("coupons.csv", toCsv(rows as never, ["code","used_count","is_active"] as never))} /></Card>;
}
function TaxReport() {
  const [rows, setRows] = useState<{ month: string; tax: number; revenue: number }[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("orders").select("tax,total,created_at,status").is("archived_at", null);
    const map = new Map<string, { tax: number; revenue: number }>();
    for (const o of (data ?? [])) {
      if (["cancelled","failed_payment"].includes(o.status as string)) continue;
      const m = String(o.created_at).slice(0, 7);
      const cur = map.get(m) ?? { tax: 0, revenue: 0 };
      cur.tax += Number(o.tax ?? 0); cur.revenue += Number(o.total ?? 0);
      map.set(m, cur);
    }
    setRows([...map.entries()].map(([month, v]) => ({ month, ...v })).sort((a, b) => b.month.localeCompare(a.month)));
  })(); }, []);
  return <Card className="p-4 mt-4"><ReportTable rows={rows} cols={[["month","Month"],["revenue","Revenue",money],["tax","Tax",money]]} /><ExportBar onCsv={() => downloadBlob("tax.csv", toCsv(rows as never, ["month","revenue","tax"] as never))} /></Card>;
}
function ShippingReport() {
  const [rows, setRows] = useState<{ carrier: string; count: number; revenue: number }[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("orders").select("carrier,shipping").not("carrier", "is", null);
    const map = new Map<string, { count: number; revenue: number }>();
    for (const o of (data ?? [])) {
      const c = (o.carrier ?? "Unknown") as string;
      const cur = map.get(c) ?? { count: 0, revenue: 0 };
      cur.count++; cur.revenue += Number(o.shipping ?? 0);
      map.set(c, cur);
    }
    setRows([...map.entries()].map(([carrier, v]) => ({ carrier, ...v })));
  })(); }, []);
  return <Card className="p-4 mt-4"><ReportTable rows={rows} cols={[["carrier","Carrier"],["count","Shipments"],["revenue","Revenue",money]]} /><ExportBar onCsv={() => downloadBlob("shipping.csv", toCsv(rows as never, ["carrier","count","revenue"] as never))} /></Card>;
}
function ProductsReport() {
  const [rows, setRows] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("order_items").select("product_name,quantity,subtotal").limit(2000);
    const map = new Map<string, { sold: number; revenue: number }>();
    for (const it of (data ?? [])) {
      const cur = map.get(it.product_name as string) ?? { sold: 0, revenue: 0 };
      cur.sold += Number(it.quantity ?? 0); cur.revenue += Number(it.subtotal ?? 0);
      map.set(it.product_name as string, cur);
    }
    setRows([...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue));
  })(); }, []);
  return <Card className="p-4 mt-4"><ReportTable rows={rows} cols={[["name","Product"],["sold","Units sold"],["revenue","Revenue",money]]} /><ExportBar onCsv={() => downloadBlob("products.csv", toCsv(rows as never, ["name","sold","revenue"] as never))} /></Card>;
}

function ReportTable<T extends Record<string, unknown>>({ rows, cols }: { rows: T[]; cols: [keyof T, string, ((v: unknown) => string)?][] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground uppercase"><tr>{cols.map(([, l]) => <th key={l} className="text-left py-2 pr-4">{l}</th>)}</tr></thead>
        <tbody className="divide-y">
          {rows.map((r, i) => <tr key={i}>{cols.map(([k, l, fmt]) => <td key={l} className="py-2 pr-4">{fmt ? fmt(r[k]) : String((r[k] ?? "") as string | number)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

// silence unused
void shortDate;