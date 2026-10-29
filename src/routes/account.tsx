import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, MapPin, Heart, ShieldCheck, LogOut } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — SentryHaus" },
      { name: "description", content: "Manage your SentryHaus orders, addresses, wishlist, and account security." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

type Order = { id: string; order_number?: string | null; status: string; total: number; created_at: string };
type Login = { id: string; created_at: string; ip_address: string | null; user_agent: string | null; success: boolean };

function AccountPage() {
  const { user, loading, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [logins, setLogins] = useState<Login[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    (async () => {
      const [{ data: o }, { data: l }] = await Promise.all([
        supabase.from("orders").select("id,order_number,status,total,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("login_history").select("id,created_at,ip_address,user_agent,success").order("created_at", { ascending: false }).limit(10),
      ]);
      setOrders((o ?? []) as Order[]);
      setLogins((l ?? []) as Login[]);
      setBusy(false);
    })();
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <SiteLayout><div className="grid min-h-[50vh] place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div></SiteLayout>;
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">My account</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {isStaff && <Button asChild variant="outline"><Link to="/admin"><ShieldCheck className="size-4" /> Admin dashboard</Link></Button>}
            <Button variant="ghost" onClick={async () => { await signOut(); navigate({ to: "/", replace: true }); }}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-3"><Package className="size-5 text-brand" /><h2 className="font-semibold">Orders</h2></div>
            <p className="mt-1 text-xs text-muted-foreground">Track and re-order past purchases.</p>
            <Button asChild variant="outline" className="mt-4 w-full"><Link to="/account">View orders</Link></Button>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3"><MapPin className="size-5 text-brand" /><h2 className="font-semibold">Addresses</h2></div>
            <p className="mt-1 text-xs text-muted-foreground">Shipping and billing addresses.</p>
            <Button asChild variant="outline" className="mt-4 w-full"><Link to="/account">Manage</Link></Button>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3"><Heart className="size-5 text-brand" /><h2 className="font-semibold">Wishlist</h2></div>
            <p className="mt-1 text-xs text-muted-foreground">Your saved products.</p>
            <Button asChild variant="outline" className="mt-4 w-full"><Link to="/wishlist">Open wishlist</Link></Button>
          </Card>
        </div>

        <Card className="mt-8 p-5">
          <h2 className="font-semibold">Recent orders</h2>
          {busy ? <p className="mt-3 text-sm text-muted-foreground">Loading…</p> :
            orders.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p> :
            <ul className="mt-3 divide-y">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{o.order_number ?? o.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{o.status}</Badge>
                    <span className="font-medium">${Number(o.total ?? 0).toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>}
        </Card>

        <Card className="mt-6 p-5">
          <h2 className="font-semibold">Security · recent sign-ins</h2>
          {busy ? <p className="mt-3 text-sm text-muted-foreground">Loading…</p> :
            logins.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No history yet.</p> :
            <ul className="mt-3 divide-y text-sm">
              {logins.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2">
                  <span>{new Date(l.created_at).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[60%]">{l.user_agent ?? "—"}</span>
                </li>
              ))}
            </ul>}
        </Card>
      </section>
    </SiteLayout>
  );
}
