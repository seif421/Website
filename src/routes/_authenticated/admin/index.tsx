import { createFileRoute } from "@tanstack/react-router";
import {
  DollarSign, ShoppingCart, Users, TrendingUp, Package,
  AlertTriangle, Clock, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/admin/page-shell";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

const salesData = [
  { d: "Mon", sales: 1240, orders: 14 },
  { d: "Tue", sales: 1820, orders: 22 },
  { d: "Wed", sales: 1510, orders: 18 },
  { d: "Thu", sales: 2210, orders: 28 },
  { d: "Fri", sales: 2850, orders: 34 },
  { d: "Sat", sales: 3420, orders: 41 },
  { d: "Sun", sales: 2980, orders: 36 },
];
const revenueData = Array.from({ length: 12 }, (_, i) => ({
  m: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  revenue: 18000 + Math.round(Math.sin(i / 2) * 6000 + i * 1800),
}));
const trafficData = [
  { d: "Mon", direct: 540, organic: 820, paid: 310 },
  { d: "Tue", direct: 620, organic: 910, paid: 380 },
  { d: "Wed", direct: 580, organic: 870, paid: 360 },
  { d: "Thu", direct: 710, organic: 1020, paid: 420 },
  { d: "Fri", direct: 820, organic: 1190, paid: 470 },
  { d: "Sat", direct: 940, organic: 1320, paid: 510 },
  { d: "Sun", direct: 870, organic: 1240, paid: 480 },
];

const topProducts = [
  { name: "Smart Doorbell Pro", sold: 312, revenue: 77688 },
  { name: "Indoor Cam 2K", sold: 248, revenue: 37200 },
  { name: "Smart Lock Vault", sold: 198, revenue: 51480 },
  { name: "Motion Sensor 4-pk", sold: 175, revenue: 17500 },
  { name: "Outdoor Cam Solar", sold: 142, revenue: 35500 },
];
const lowStock = [
  { name: "Indoor Cam 2K", stock: 3, threshold: 5 },
  { name: "Smart Hub Mini", stock: 2, threshold: 10 },
  { name: "Window Sensor", stock: 4, threshold: 8 },
];
const recentOrders = [
  { id: "SH-A1B2C3D4", customer: "Alex Johnson", total: 249, status: "processing" },
  { id: "SH-9F8E7D6C", customer: "Maya Patel", total: 489, status: "shipped" },
  { id: "SH-3K2L1M0N", customer: "Chris Rivera", total: 129, status: "pending" },
  { id: "SH-7Q6P5O4N", customer: "Jordan Lee", total: 712, status: "delivered" },
  { id: "SH-X9Y8Z7W6", customer: "Sam Carter", total: 199, status: "processing" },
];
const recentCustomers = [
  { name: "Alex Johnson", email: "alex@example.com", orders: 4 },
  { name: "Maya Patel", email: "maya@example.com", orders: 2 },
  { name: "Chris Rivera", email: "chris@example.com", orders: 1 },
  { name: "Jordan Lee", email: "jordan@example.com", orders: 7 },
];

function Dashboard() {
  return (
    <PageShell title="Dashboard" description="Welcome back. Here's what's happening today.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's Sales" value="$3,420" delta="+12.4%" up icon={DollarSign} />
        <Stat label="Monthly Sales" value="$48,920" delta="+8.1%" up icon={TrendingUp} />
        <Stat label="Orders" value="248" delta="+5.2%" up icon={ShoppingCart} />
        <Stat label="Visitors" value="12,480" delta="-1.4%" icon={Users} />
        <Stat label="Revenue" value="$182,400" delta="+9.6%" up icon={DollarSign} />
        <Stat label="Profit" value="$54,720" delta="+11.2%" up icon={TrendingUp} />
        <Stat label="Conversion" value="3.42%" delta="+0.3%" up icon={ArrowUpRight} />
        <Stat label="Avg. Order" value="$197" delta="+2.8%" up icon={Package} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">Sales (last 7 days)</p>
              <p className="text-xs text-muted-foreground">Daily sales and order counts</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="grad-sales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="d" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="sales" stroke="hsl(var(--brand))" fill="url(#grad-sales)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold">Traffic Sources</p>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="d" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="organic" stackId="a" fill="hsl(var(--brand))" />
              <Bar dataKey="direct" stackId="a" fill="hsl(var(--accent))" />
              <Bar dataKey="paid" stackId="a" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-sm font-semibold">Revenue (12 months)</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="m" fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--brand))" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold">Recent Orders</p>
            <Badge variant="secondary">{recentOrders.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2 font-medium">Order</th>
                  <th className="py-2 font-medium">Customer</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 font-mono text-xs">{o.id}</td>
                    <td className="py-2.5">{o.customer}</td>
                    <td className="py-2.5"><StatusBadge status={o.status} /></td>
                    <td className="py-2.5 text-right font-medium">${o.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold">Top Products</p>
          <ul className="mt-4 space-y-3">
            {topProducts.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sold} sold</p>
                </div>
                <p className="text-sm font-semibold">${p.revenue.toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <p className="text-sm font-semibold">Low Stock</p>
          </div>
          <ul className="mt-3 divide-y">
            {lowStock.map((s) => (
              <li key={s.name} className="flex items-center justify-between py-2.5">
                <p className="text-sm font-medium">{s.name}</p>
                <Badge variant="destructive">{s.stock} left</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-brand" />
            <p className="text-sm font-semibold">Recent Customers</p>
          </div>
          <ul className="mt-3 divide-y">
            {recentCustomers.map((c) => (
              <li key={c.email} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                <Badge variant="secondary">{c.orders} orders</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}

function Stat({
  label, value, delta, up, icon: Icon,
}: { label: string; value: string; delta?: string; up?: boolean; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {delta && (
        <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
          {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{delta}
        </p>
      )}
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${map[status] ?? "bg-muted"}`}>{status}</span>;
}