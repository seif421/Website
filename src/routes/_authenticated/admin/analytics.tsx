import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/admin/formatters";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AnalyticsPage,
});

type Named = { name: string; value: number };
type A = {
  days: number;
  visitors: number;
  page_views: number;
  orders: number;
  sales: number;
  daily_sales: { d: string; sales: number; orders: number }[];
  weekly_sales: { w: string; sales: number }[];
  monthly_revenue: { m: string; revenue: number }[];
  traffic_sources: Named[];
  devices: Named[];
  top_categories: { n: string; v: number }[];
  top_products: { n: string; v: number }[];
  customer_growth: { m: string; new: number; returning: number }[];
  governorates: { n: string; orders: number; v: number }[];
};

// Bright, clearly different colours so every slice and line can be told apart.
const PALETTE = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const SOURCE_LABEL: Record<string, string> = {
  Direct: "Direct",
  Organic: "Search engines",
  Social: "Social media",
  Paid: "Paid ads",
  Referral: "Other websites",
};
const PERIODS = [7, 30, 90] as const;

function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const [a, setA] = useState<A | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      // This database function is new, so the generated types do not list it yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("admin_analytics", { p_days: days });
      if (!live) return;
      if (error) return toast.error(error.message);
      setA(data as A);
    })();
    return () => {
      live = false;
    };
  }, [days]);

  const sources = (a?.traffic_sources ?? []).map((s) => ({
    ...s,
    name: SOURCE_LABEL[s.name] ?? s.name,
  }));
  const conversion = a && a.visitors > 0 ? (a.orders / a.visitors) * 100 : null;

  return (
    <PageShell
      title="Analytics"
      description="Live numbers from your orders and shop visits. Visits are counted from the day tracking started."
      actions={
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${days === p ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p} days
            </button>
          ))}
        </div>
      }
    >
      {!a ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Tile label="Visitors" value={a.visitors.toLocaleString()} />
            <Tile label="Pages viewed" value={a.page_views.toLocaleString()} />
            <Tile label="Orders" value={a.orders.toLocaleString()} />
            <Tile label="Sales" value={money(a.sales)} />
            <Tile
              label="Conversion"
              value={conversion === null ? "—" : `${conversion.toFixed(1)}%`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title={`Daily sales (${a.days} days)`}>
              <AreaChart data={a.daily_sales}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="d" fontSize={11} interval="preserveStartEnd" />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="#2563eb"
                  fill="rgba(37, 99, 235, 0.2)"
                />
              </AreaChart>
            </ChartCard>
            <ChartCard title="Weekly sales (8 weeks)">
              <BarChart data={a.weekly_sales}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="w" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly sales (12 months)">
              <LineChart data={a.monthly_revenue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="m" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Sales"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartCard>
            <ChartCard
              title="Where visitors come from"
              empty={sources.length === 0}
              emptyText="No visits counted yet."
            >
              <PieChart>
                <Pie
                  data={sources}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {sources.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartCard>
            <ChartCard
              title="Best-selling categories (EGP)"
              empty={a.top_categories.length === 0}
              emptyText="No sales in this period."
            >
              <BarChart data={a.top_categories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis dataKey="n" type="category" fontSize={11} width={100} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="v" name="Sales" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartCard>
            <ChartCard
              title="Best-selling products (units)"
              empty={a.top_products.length === 0}
              emptyText="No sales in this period."
            >
              <BarChart data={a.top_products} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="n" type="category" fontSize={11} width={110} />
                <Tooltip />
                <Bar
                  dataKey="v"
                  name="Units sold"
                  fill="#f59e0b"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartCard>
            <ChartCard title="Customers (12 months)">
              <LineChart data={a.customer_growth}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="m" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="new"
                  name="New accounts"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="returning"
                  name="Customers ordering again"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartCard>
            <ChartCard
              title="Devices"
              empty={a.devices.length === 0}
              emptyText="No visits counted yet."
            >
              <PieChart>
                <Pie
                  data={a.devices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  label
                >
                  {a.devices.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartCard>
            <Card className="p-5 lg:col-span-2">
              <p className="mb-3 text-sm font-semibold">Orders by governorate</p>
              {a.governorates.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No orders in this period.
                </p>
              ) : (
                <ul className="divide-y">
                  {a.governorates.map((g) => (
                    <li key={g.n} className="flex items-center justify-between py-2.5">
                      <span className="text-sm">{g.n}</span>
                      <span className="text-sm font-semibold">
                        {g.orders} {g.orders === 1 ? "order" : "orders"} · {money(g.v)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </Card>
  );
}

function ChartCard({
  title,
  children,
  empty,
  emptyText,
}: {
  title: string;
  children: React.ReactElement;
  empty?: boolean;
  emptyText?: string;
}) {
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {empty ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          {children}
        </ResponsiveContainer>
      )}
    </Card>
  );
}
