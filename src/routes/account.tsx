import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/store/format";
import { Loader2, Package, MapPin, Heart, ShieldCheck, LogOut, ChevronRight } from "lucide-react";
import { AddressManager } from "@/components/account/address-manager";
import { OrderThumb, type OrderLine } from "@/components/account/order-thumb";
import { STATUS_TONE, statusLabel } from "@/lib/store/order-status";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — Rivvo" },
      {
        name: "description",
        content: "Manage your Rivvo orders, addresses, wishlist, and account security.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

type Order = {
  id: string;
  order_number?: string | null;
  status: string;
  total: number;
  created_at: string;
  order_items: OrderLine[];
};
type ReturnReq = {
  id: string;
  return_number: string;
  status: string;
  type: string;
  reason: string | null;
  admin_notes: string | null;
  created_at: string;
  items: { name: string; quantity: number }[] | null;
};
type Login = {
  id: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
};

function AccountPage() {
  const { t, lang } = useI18n();
  const locale = lang === "ar" ? "ar-EG-u-nu-latn" : undefined;
  const { user, loading, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [logins, setLogins] = useState<Login[]>([]);
  const [returns, setReturns] = useState<ReturnReq[]>([]);
  const [busy, setBusy] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/account" } });
      return;
    }
    (async () => {
      const [{ data: o }, { data: l }, { data: rr }] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id,order_number,status,total,created_at,order_items(id,product_name,quantity,unit_price,product:products(slug,images))",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("login_history")
          .select("id,created_at,ip_address,user_agent,success")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("returns")
          .select("id,return_number,status,type,reason,admin_notes,created_at,items")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setReturns((rr ?? []) as unknown as ReturnReq[]);
      setOrders((o ?? []) as unknown as Order[]);
      setLogins((l ?? []) as Login[]);
      setBusy(false);
    })();
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <SiteLayout>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{t("My account")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {isStaff && (
              <Button asChild variant="outline">
                <Link to="/admin">
                  <ShieldCheck className="size-4" /> {t("Admin dashboard")}
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
                navigate({ to: "/", replace: true });
              }}
            >
              <LogOut className="size-4" /> {t("Sign out")}
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Package className="size-5 text-brand" />
              <h2 className="font-semibold">{t("Orders")}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("Track and re-order past purchases.")}</p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <a href="#orders">{t("View orders")}</a>
            </Button>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-brand" />
              <h2 className="font-semibold">{t("Addresses")}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("Save your delivery addresses.")}</p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <a href="#addresses">{t("Manage")}</a>
            </Button>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Heart className="size-5 text-brand" />
              <h2 className="font-semibold">{t("Wishlist")}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("Your saved products.")}</p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/wishlist">{t("Open wishlist")}</Link>
            </Button>
          </Card>
        </div>

        <Card id="orders" className="mt-8 scroll-mt-24 p-5">
          <h2 className="font-semibold">{t("Recent orders")}</h2>
          {busy ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("Loading…")}</p>
          ) : orders.length === 0 ? (
            <div className="mt-3 text-sm text-muted-foreground">
              {t("No orders yet.")}{" "}
              <Link to="/shop" className="font-medium text-foreground underline">
                {t("Start shopping")}
              </Link>
            </div>
          ) : (
            <>
              <ul className="mt-3 space-y-3">
                {(showAll ? orders : orders.slice(0, 5)).map((o) => {
                  const lines = o.order_items ?? [];
                  return (
                    <li key={o.id}>
                      <Link
                        to="/orders/$id"
                        params={{ id: o.id }}
                        className="block rounded-xl border p-4 transition-colors hover:border-brand/50"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{o.order_number ?? o.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(o.created_at).toLocaleDateString(locale)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[o.status] ?? "bg-muted"}`}>
                              {t(statusLabel(o.status))}
                            </span>
                            <span className="font-semibold">{formatMoney(Number(o.total ?? 0))}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {lines.slice(0, 4).map((l) => (
                              <OrderThumb key={l.id} line={l} size="size-12 ring-2 ring-background" />
                            ))}
                          </div>
                          <div className="min-w-0 flex-1 text-sm">
                            {lines.slice(0, 2).map((l) => (
                              <p key={l.id} className="truncate">
                                {l.product_name} <span className="text-muted-foreground">× {l.quantity}</span>
                              </p>
                            ))}
                            {lines.length > 2 && (
                              <p className="text-xs text-muted-foreground">{t("+ {n} more", { n: lines.length - 2 })}</p>
                            )}
                          </div>
                          <span className="hidden items-center gap-1 text-sm font-medium text-brand sm:flex">
                            {t("View details")} <ChevronRight className="size-4 rtl:rotate-180" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {orders.length > 5 && (
                <Button variant="ghost" className="mt-3 w-full" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? t("Show fewer orders") : t("Show all orders ({n})", { n: orders.length })}
                </Button>
              )}
            </>
          )}
        </Card>

        <Card id="returns" className="mt-8 scroll-mt-24 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">{t("Return requests")}</h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/returns/new">{t("Request a return")}</Link>
            </Button>
          </div>
          {busy ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("Loading…")}</p>
          ) : returns.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("You have no return requests.")}</p>
          ) : (
            <ul className="mt-3 divide-y text-sm">
              {returns.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{r.return_number}</span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                      {r.status === "requested" ? t("Under review") : t(r.status)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {(r.items ?? []).map((i) => `${i.name} × ${i.quantity}`).join(", ")} · {r.reason} ·{" "}
                    {new Date(r.created_at).toLocaleDateString(locale)}
                  </p>
                  {r.admin_notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t("Message from us:")}</span> {r.admin_notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <AddressManager userId={user.id} defaultName={(user.user_metadata?.full_name as string | undefined) ?? ""} />

        <Card className="mt-6 p-5">
          <h2 className="font-semibold">{t("Security · recent sign-ins")}</h2>
          {busy ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("Loading…")}</p>
          ) : logins.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("No history yet.")}</p>
          ) : (
            <ul className="mt-3 divide-y text-sm">
              {logins.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2">
                  <span>{new Date(l.created_at).toLocaleString(locale)}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                    {l.user_agent ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </SiteLayout>
  );
}
