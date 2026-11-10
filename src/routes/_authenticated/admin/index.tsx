import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Banknote,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Percent,
  Wallet,
  CalendarDays,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Star,
  PhoneCall,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/admin/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { money, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "@/lib/admin/formatters";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

type Dash = {
  today_sales: number;
  yesterday_sales: number;
  month_sales: number;
  prev_month_sales: number;
  orders_30d: number;
  prev_orders_30d: number;
  visitors_30d: number;
  prev_visitors_30d: number;
  avg_order_30d: number;
  prev_avg_order_30d: number;
  delivered_revenue: number;
  delivered_orders: number;
  profit: number;
  sales_7d: { d: string; sales: number; orders: number }[];
  traffic_7d: {
    d: string;
    direct: number;
    organic: number;
    social: number;
    paid: number;
    referral: number;
  }[];
  revenue_12m: { m: string; revenue: number }[];
  top_products: { name: string; sold: number; revenue: number }[];
  low_stock: { name: string; stock: number; threshold: number }[];
  recent_orders: {
    id: string;
    order_number: string;
    customer: string;
    total: number;
    status: string;
    created_at: string;
  }[];
  recent_customers: { name: string; email: string; orders: number }[];
  attention: {
    pending_orders: number;
    new_messages: number;
    reviews_waiting: number;
    low_stock: number;
  };
};

const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const tip = { borderRadius: 8, border: "1px solid hsl(var(--border))" };

function Dashboard() {
  const [d, setD] = useState<Dash | null>(null);

  async function load() {
    // These database functions are new, so the generated types do not list them yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("admin_dashboard");
    if (error) return toast.error(error.message);
    setD(data as Dash);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (!d) {
    return (
      <PageShell title="Dashboard" description="Live numbers from your store.">
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      </PageShell>
    );
  }

  const conversion = d.visitors_30d > 0 ? (d.orders_30d / d.visitors_30d) * 100 : null;
  const noTraffic = d.traffic_7d.every(
    (x) => x.direct + x.organic + x.social + x.paid + x.referral === 0,
  );
  const att = d.attention;

  return (
    <PageShell
      title="Dashboard"
      description="Live numbers from your store. Sales count every order that was not cancelled, returned or refunded."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Today's sales"
          value={money(d.today_sales)}
          delta={pct(d.today_sales, d.yesterday_sales)}
          sub="vs yesterday"
          icon={Banknote}
        />
        <Stat
          label="This month"
          value={money(d.month_sales)}
          delta={pct(d.month_sales, d.prev_month_sales)}
          sub="vs same days last month"
          icon={CalendarDays}
        />
        <Stat
          label="Orders, 30 days"
          value={String(d.orders_30d)}
          delta={pct(d.orders_30d, d.prev_orders_30d)}
          sub="vs the 30 days before"
          icon={ShoppingCart}
        />
        <Stat
          label="Visitors, 30 days"
          value={d.visitors_30d.toLocaleString()}
          delta={pct(d.visitors_30d, d.prev_visitors_30d)}
          sub="counted from the day tracking started"
          icon={Users}
        />
        <Stat
          label="Delivered revenue"
          value={money(d.delivered_revenue)}
          sub={`${d.delivered_orders} delivered orders`}
          icon={Wallet}
        />
        <Stat
          label="Profit (delivered)"
          value={money(d.profit)}
          sub="sales minus the cost set on each product"
          icon={TrendingUp}
        />
        <Stat
          label="Conversion, 30 days"
          value={conversion === null ? "—" : `${conversion.toFixed(1)}%`}
          sub="orders ÷ visitors"
          icon={Percent}
        />
        <Stat
          label="Average order, 30 days"
          value={money(d.avg_order_30d)}
          delta={pct(d.avg_order_30d, d.prev_avg_order_30d)}
          sub="vs the 30 days before"
          icon={Package}
        />
      </div>

      <Card className="p-5">
        <p className="text-sm font-semibold">Needs your attention</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Attention
            to="/admin/orders"
            icon={PhoneCall}
            count={att.pending_orders}
            label="orders waiting for a confirmation call"
          />
          <Attention
            to="/admin/support"
            icon={MessageSquare}
            count={att.new_messages}
            label="new customer messages"
          />
          <Attention
            to="/admin/reviews"
            icon={Star}
            count={att.reviews_waiting}
            label="reviews waiting for approval"
          />
          <Attention
            to="/admin/inventory"
            icon={AlertTriangle}
            count={att.low_stock}
            label="products low on stock"
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-semibold">Sales, last 7 days</p>
          <p className="mb-4 text-xs text-muted-foreground">Daily sales in EGP (Cairo time)</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={d.sales_7d}>
              <defs>
                <linearGradient id="grad-sales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="d" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={tip}
                formatter={(v, n) => (n === "sales" ? money(Number(v)) : v)}
              />
              <Area
                type="monotone"
                dataKey="sales"
                name="sales"
                stroke="hsl(var(--brand))"
                fill="url(#grad-sales)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold">Visitors by source</p>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
          {noTraffic ? (
            <p className="py-24 text-center text-sm text-muted-foreground">
              No visits counted yet. Numbers appear as people open your shop.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.traffic_7d}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="d" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={tip} />
                <Legend />
                <Bar dataKey="direct" name="Direct" stackId="a" fill="hsl(var(--accent))" />
                <Bar dataKey="organic" name="Search" stackId="a" fill="hsl(var(--brand))" />
                <Bar dataKey="social" name="Social" stackId="a" fill="#10b981" />
                <Bar dataKey="paid" name="Paid ads" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="referral" name="Other sites" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-sm font-semibold">Sales, last 12 months</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={d.revenue_12m}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="m" fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={tip} formatter={(v) => money(Number(v))} />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Sales"
              stroke="hsl(var(--brand))"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Recent orders</p>
            <Link to="/admin/orders" className="text-xs font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          {d.recent_orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-2 font-medium">Order</th>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {d.recent_orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5 font-mono text-xs">
                        <Link
                          to="/admin/orders/$id"
                          params={{ id: o.id }}
                          className="hover:underline"
                        >
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="py-2.5">{o.customer}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${ORDER_STATUS_CLASS[o.status] ?? "bg-muted"}`}
                        >
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-medium">{money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold">Top products</p>
          {d.top_products.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {d.top_products.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sold} sold</p>
                  </div>
                  <p className="text-sm font-semibold">{money(p.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <p className="text-sm font-semibold">Low stock</p>
          </div>
          {d.low_stock.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing is running low.
            </p>
          ) : (
            <ul className="mt-3 divide-y">
              {d.low_stock.map((s, i) => (
                <li key={`${s.name}-${i}`} className="flex items-center justify-between py-2.5">
                  <p className="text-sm font-medium">{s.name}</p>
                  <Badge variant="destructive">
                    {s.stock <= 0 ? "Out of stock" : `${s.stock} left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-brand" />
            <p className="text-sm font-semibold">Newest customers</p>
          </div>
          {d.recent_customers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No customers yet.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {d.recent_customers.map((c) => (
                <li key={c.email} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  <Badge variant="secondary">
                    {c.orders} {c.orders === 1 ? "order" : "orders"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        This page refreshes itself every minute.
      </p>
    </PageShell>
  );
}

function Attention({
  to,
  icon: Icon,
  count,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
}) {
  return (
    <Link
      to={to as never}
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${count > 0 ? "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10" : ""}`}
    >
      <Icon
        className={`size-5 shrink-0 ${count > 0 ? "text-amber-600" : "text-muted-foreground"}`}
      />
      <div>
        <p className="text-xl font-bold leading-none">{count}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  delta,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        {delta != null && (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${up ? "text-emerald-600" : "text-red-600"}`}
          >
            {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {sub}
      </p>
    </Card>
  );
}
