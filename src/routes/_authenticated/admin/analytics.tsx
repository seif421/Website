import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AnalyticsPage,
});

const daily = Array.from({ length: 30 }, (_, i) => ({ d: `${i + 1}`, sales: 1000 + Math.round(Math.random() * 2400) }));
const weekly = ["W1","W2","W3","W4","W5","W6","W7","W8"].map((w, i) => ({ w, sales: 8000 + i * 1200 + Math.round(Math.random() * 4000) }));
const monthlyRev = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({ m, revenue: 30000 + Math.round(Math.sin(i) * 6000 + i * 1200) }));
const traffic = [
  { name: "Organic", value: 4820, fill: "hsl(var(--brand))" },
  { name: "Direct", value: 2410, fill: "hsl(var(--accent))" },
  { name: "Paid", value: 1820, fill: "hsl(var(--primary))" },
  { name: "Social", value: 980, fill: "#10b981" },
  { name: "Referral", value: 540, fill: "#f59e0b" },
];
const topCategories = [{ n: "Cameras", v: 24800 }, { n: "Doorbells", v: 18200 }, { n: "Locks", v: 15600 }, { n: "Sensors", v: 9800 }, { n: "Accessories", v: 4200 }];
const topProducts = [{ n: "Doorbell Pro", v: 312 }, { n: "Indoor Cam 2K", v: 248 }, { n: "Lock Vault", v: 198 }, { n: "Motion 4-pk", v: 175 }, { n: "Outdoor Solar", v: 142 }];
const customerGrowth = Array.from({ length: 12 }, (_, i) => ({ m: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], new: 120 + i * 18, returning: 60 + i * 12 }));
const devices = [{ name: "Mobile", value: 58, fill: "hsl(var(--brand))" }, { name: "Desktop", value: 32, fill: "hsl(var(--accent))" }, { name: "Tablet", value: 10, fill: "hsl(var(--primary))" }];
const countries = [{ n: "USA", v: 6200 }, { n: "Canada", v: 1820 }, { n: "UK", v: 940 }, { n: "Germany", v: 620 }, { n: "Australia", v: 410 }];

function AnalyticsPage() {
  return (
    <PageShell title="Analytics" description="Deep dive into store performance.">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily Sales (30 days)">
          <AreaChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="d" fontSize={11} /><YAxis fontSize={11} />
            <Tooltip /><Area type="monotone" dataKey="sales" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.2)" />
          </AreaChart>
        </ChartCard>
        <ChartCard title="Weekly Sales">
          <BarChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="w" fontSize={11} /><YAxis fontSize={11} />
            <Tooltip /><Bar dataKey="sales" fill="hsl(var(--brand))" radius={[4,4,0,0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Monthly Revenue">
          <LineChart data={monthlyRev}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} />
            <Tooltip /><Line type="monotone" dataKey="revenue" stroke="hsl(var(--brand))" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Traffic Sources">
          <PieChart>
            <Pie data={traffic} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label />
            <Tooltip /><Legend />
          </PieChart>
        </ChartCard>
        <ChartCard title="Top Categories">
          <BarChart data={topCategories} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" fontSize={11} /><YAxis dataKey="n" type="category" fontSize={11} width={90} />
            <Tooltip /><Bar dataKey="v" fill="hsl(var(--brand))" radius={[0,4,4,0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Top Products">
          <BarChart data={topProducts} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" fontSize={11} /><YAxis dataKey="n" type="category" fontSize={11} width={90} />
            <Tooltip /><Bar dataKey="v" fill="hsl(var(--accent))" radius={[0,4,4,0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Customer Growth">
          <LineChart data={customerGrowth}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} />
            <Tooltip /><Legend />
            <Line type="monotone" dataKey="new" stroke="hsl(var(--brand))" strokeWidth={2} />
            <Line type="monotone" dataKey="returning" stroke="hsl(var(--accent))" strokeWidth={2} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Device Types">
          <PieChart>
            <Pie data={devices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
              {devices.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ChartCard>
        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-semibold mb-3">Top Countries</p>
          <ul className="divide-y">
            {countries.map((c) => (
              <li key={c.n} className="flex items-center justify-between py-2.5">
                <span className="text-sm">{c.n}</span>
                <span className="text-sm font-semibold">{c.v.toLocaleString()} visits</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={220}>{children}</ResponsiveContainer>
    </Card>
  );
}