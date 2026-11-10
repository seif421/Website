import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { money as moneyFmt, ORDER_STATUS_LABEL, toCsv, downloadBlob } from "@/lib/admin/formatters";

const money = (v: unknown) => moneyFmt(v as number);

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

// Orders that were cancelled, refunded, returned or failed are not counted as sales.
const NOT_SALES = ["cancelled", "refunded", "returned", "failed_payment"];
const isSale = (status: unknown) => !NOT_SALES.includes(String(status));
const cairoDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const sinceIso = (days: number) =>
  days > 0 ? new Date(Date.now() - days * 86400000).toISOString() : "1970-01-01T00:00:00Z";

// The reports read from tables whose relations are not in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const PERIODS: [number, string][] = [
  [7, "Last 7 days"],
  [30, "Last 30 days"],
  [90, "Last 90 days"],
  [365, "Last year"],
  [0, "All time"],
];

function ReportsPage() {
  const [days, setDays] = useState(30);
  return (
    <PageShell
      title="Reports"
      description="Sales, orders, customers, stock and delivery areas. Download any report as a CSV file."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Reports" }]}
      actions={
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Time period"
        >
          {PERIODS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      }
    >
      <Tabs defaultValue="sales">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="areas">Delivery areas</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <SalesReport days={days} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersReport days={days} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsReport days={days} />
        </TabsContent>
        <TabsContent value="areas">
          <AreasReport days={days} />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersReport />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryReport />
        </TabsContent>
        <TabsContent value="coupons">
          <CouponsReport />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function ExportBar({ onCsv }: { onCsv: () => void }) {
  return (
    <div className="mt-3 flex justify-end gap-2">
      <Button size="sm" variant="outline" onClick={onCsv}>
        <Download className="size-4" /> CSV
      </Button>
      <Button size="sm" variant="outline" onClick={() => window.print()}>
        <Download className="size-4" /> PDF (print)
      </Button>
    </div>
  );
}

function Totals({ items }: { items: [string, string][] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-6 rounded-lg bg-muted/50 px-4 py-3">
      {items.map(([l, v]) => (
        <div key={l}>
          <p className="text-xs text-muted-foreground">{l}</p>
          <p className="text-lg font-bold">{v}</p>
        </div>
      ))}
    </div>
  );
}

type OrderRow = {
  status: string;
  total: number;
  shipping: number;
  created_at: string;
  shipping_address: { governorate?: string } | null;
};

function useOrders(days: number) {
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  useEffect(() => {
    let live = true;
    setRows(null);
    db.from("orders")
      .select("status,total,shipping,created_at,shipping_address")
      .is("archived_at", null)
      .gte("created_at", sinceIso(days))
      .order("created_at", { ascending: false })
      .limit(5000)
      .then(({ data }: { data: OrderRow[] | null }) => {
        if (live) setRows(data ?? []);
      });
    return () => {
      live = false;
    };
  }, [days]);
  return rows;
}

function SalesReport({ days }: { days: number }) {
  const orders = useOrders(days);
  const map = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders ?? []) {
    if (!isSale(o.status)) continue;
    const d = cairoDay(o.created_at);
    const cur = map.get(d) ?? { orders: 0, revenue: 0 };
    cur.orders++;
    cur.revenue += Number(o.total ?? 0);
    map.set(d, cur);
  }
  const rows = [...map.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  return (
    <Card className="mt-4 p-4">
      <Totals
        items={[
          ["Sales", money(totalRevenue)],
          ["Orders", String(totalOrders)],
          ["Average order", money(totalOrders ? totalRevenue / totalOrders : 0)],
        ]}
      />
      <ReportTable
        loading={orders === null}
        rows={rows}
        cols={[
          ["date", "Date"],
          ["orders", "Orders"],
          ["revenue", "Sales", money],
        ]}
      />
      <ExportBar
        onCsv={() =>
          downloadBlob("sales.csv", toCsv(rows as never, ["date", "orders", "revenue"] as never))
        }
      />
    </Card>
  );
}

function OrdersReport({ days }: { days: number }) {
  const orders = useOrders(days);
  const map = new Map<string, { count: number; revenue: number }>();
  for (const o of orders ?? []) {
    const cur = map.get(o.status) ?? { count: 0, revenue: 0 };
    cur.count++;
    cur.revenue += Number(o.total ?? 0);
    map.set(o.status, cur);
  }
  const rows = [...map.entries()]
    .map(([status, v]) => ({ status: ORDER_STATUS_LABEL[status] ?? status, ...v }))
    .sort((a, b) => b.count - a.count);
  return (
    <Card className="mt-4 p-4">
      <ReportTable
        loading={orders === null}
        rows={rows}
        cols={[
          ["status", "Status"],
          ["count", "Orders"],
          ["revenue", "Order value", money],
        ]}
      />
      <ExportBar
        onCsv={() =>
          downloadBlob(
            "orders-report.csv",
            toCsv(rows as never, ["status", "count", "revenue"] as never),
          )
        }
      />
    </Card>
  );
}

function ProductsReport({ days }: { days: number }) {
  const [rows, setRows] = useState<{ name: string; sold: number; revenue: number }[] | null>(null);
  useEffect(() => {
    let live = true;
    setRows(null);
    db.from("order_items")
      .select("product_name,quantity,subtotal,orders!inner(status,created_at,archived_at)")
      .gte("orders.created_at", sinceIso(days))
      .is("orders.archived_at", null)
      .limit(10000)
      .then(
        ({
          data,
        }: {
          data:
            | {
                product_name: string;
                quantity: number;
                subtotal: number;
                orders: { status: string };
              }[]
            | null;
        }) => {
          if (!live) return;
          const map = new Map<string, { sold: number; revenue: number }>();
          for (const it of data ?? []) {
            if (!isSale(it.orders?.status)) continue;
            const cur = map.get(it.product_name) ?? { sold: 0, revenue: 0 };
            cur.sold += Number(it.quantity ?? 0);
            cur.revenue += Number(it.subtotal ?? 0);
            map.set(it.product_name, cur);
          }
          setRows(
            [...map.entries()]
              .map(([name, v]) => ({ name, ...v }))
              .sort((a, b) => b.revenue - a.revenue),
          );
        },
      );
    return () => {
      live = false;
    };
  }, [days]);
  return (
    <Card className="mt-4 p-4">
      <ReportTable
        loading={rows === null}
        rows={rows ?? []}
        cols={[
          ["name", "Product"],
          ["sold", "Units sold"],
          ["revenue", "Sales", money],
        ]}
      />
      <ExportBar
        onCsv={() =>
          downloadBlob(
            "products.csv",
            toCsv((rows ?? []) as never, ["name", "sold", "revenue"] as never),
          )
        }
      />
    </Card>
  );
}

function AreasReport({ days }: { days: number }) {
  const orders = useOrders(days);
  const map = new Map<string, { orders: number; sales: number; delivery_fees: number }>();
  for (const o of orders ?? []) {
    if (!isSale(o.status)) continue;
    const g = o.shipping_address?.governorate || "Unknown";
    const cur = map.get(g) ?? { orders: 0, sales: 0, delivery_fees: 0 };
    cur.orders++;
    cur.sales += Number(o.total ?? 0);
    cur.delivery_fees += Number(o.shipping ?? 0);
    map.set(g, cur);
  }
  const rows = [...map.entries()]
    .map(([governorate, v]) => ({ governorate, ...v }))
    .sort((a, b) => b.sales - a.sales);
  return (
    <Card className="mt-4 p-4">
      <ReportTable
        loading={orders === null}
        rows={rows}
        cols={[
          ["governorate", "Governorate"],
          ["orders", "Orders"],
          ["sales", "Sales", money],
          ["delivery_fees", "Delivery fees charged", money],
        ]}
      />
      <ExportBar
        onCsv={() =>
          downloadBlob(
            "delivery-areas.csv",
            toCsv(rows as never, ["governorate", "orders", "sales", "delivery_fees"] as never),
          )
        }
      />
    </Card>
  );
}

function CustomersReport() {
  const [rows, setRows] = useState<{ month: string; new_customers: number }[] | null>(null);
  useEffect(() => {
    supabase
      .from("profiles")
      .select("created_at")
      .then(({ data }) => {
        const map = new Map<string, number>();
        for (const p of data ?? []) {
          const m = String(p.created_at).slice(0, 7);
          map.set(m, (map.get(m) ?? 0) + 1);
        }
        setRows(
          [...map.entries()]
            .map(([month, new_customers]) => ({ month, new_customers }))
            .sort((a, b) => b.month.localeCompare(a.month)),
        );
      });
  }, []);
  return (
    <Card className="mt-4 p-4">
      <ReportTable
        loading={rows === null}
        rows={rows ?? []}
        cols={[
          ["month", "Month"],
          ["new_customers", "New customers"],
        ]}
      />
      <ExportBar
        onCsv={() =>
          downloadBlob(
            "customers.csv",
            toCsv((rows ?? []) as never, ["month", "new_customers"] as never),
          )
        }
      />
    </Card>
  );
}

function InventoryReport() {
  const [rows, setRows] = useState<
    { name: string; sku: string | null; stock: number; low_at: number; state: string }[] | null
  >(null);
  useEffect(() => {
    db.from("inventory")
      .select("stock,low_stock_threshold,products(name,sku)")
      .order("stock")
      .limit(500)
      .then(
        ({
          data,
        }: {
          data:
            | {
                stock: number;
                low_stock_threshold: number;
                products: { name: string; sku: string | null } | null;
              }[]
            | null;
        }) => {
          setRows(
            (data ?? []).map((r) => ({
              name: r.products?.name ?? "(deleted product)",
              sku: r.products?.sku ?? null,
              stock: r.stock,
              low_at: r.low_stock_threshold,
              state:
                r.stock <= 0 ? "Out of stock" : r.stock <= r.low_stock_threshold ? "Low" : "OK",
            })),
          );
        },
      );
  }, []);
  return (
    <Card className="mt-4 p-4">
      <ReportTable
        loading={rows === null}
        rows={rows ?? []}
        cols={[
          ["name", "Product"],
          ["sku", "SKU"],
          ["stock", "In stock"],
          ["low_at", "Low at"],
          ["state", "Status"],
        ]}
      />
      <ExportBar
        onCsv={() =>
          downloadBlob(
            "inventory.csv",
            toCsv((rows ?? []) as never, ["name", "sku", "stock", "low_at", "state"] as never),
          )
        }
      />
    </Card>
  );
}

function CouponsReport() {
  const [rows, setRows] = useState<
    { code: string; used_count: number; is_active: string }[] | null
  >(null);
  useEffect(() => {
    supabase
      .from("coupons")
      .select("code,used_count,is_active")
      .order("used_count", { ascending: false })
      .then(({ data }) =>
        setRows(
          (data ?? []).map((c) => ({
            code: c.code,
            used_count: c.used_count,
            is_active: c.is_active ? "Yes" : "No",
          })),
        ),
      );
  }, []);
  return (
    <Card className="mt-4 p-4">
      <ReportTable
        loading={rows === null}
        rows={rows ?? []}
        cols={[
          ["code", "Code"],
          ["used_count", "Times used"],
          ["is_active", "Active"],
        ]}
      />
      <ExportBar
        onCsv={() =>
          downloadBlob(
            "coupons.csv",
            toCsv((rows ?? []) as never, ["code", "used_count", "is_active"] as never),
          )
        }
      />
    </Card>
  );
}

function ReportTable<T extends Record<string, unknown>>({
  rows,
  cols,
  loading,
}: {
  rows: T[];
  cols: [keyof T, string, ((v: unknown) => string)?][];
  loading?: boolean;
}) {
  if (loading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            {cols.map(([, l]) => (
              <th key={l} className="py-2 pr-4 text-left font-medium">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map(([k, l, fmt]) => (
                <td key={l} className="py-2 pr-4">
                  {fmt ? fmt(r[k]) : String((r[k] ?? "") as string | number)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
