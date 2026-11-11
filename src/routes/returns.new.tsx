import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { Card } from "@/components/ui/card";
import { OrderThumb, type OrderLine } from "@/components/account/order-thumb";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site-config";
import { formatMoney } from "@/lib/store/format";
import { fetchAddresses, type SavedAddress } from "@/lib/store/addresses";

export const Route = createFileRoute("/returns/new")({
  validateSearch: (s: Record<string, unknown>): { order?: string } => ({
    order: typeof s.order === "string" ? s.order : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Return request — Rivvo" },
      { name: "description", content: "Ask to return an item you bought from Rivvo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReturnPage,
});

type Addr = { full_name?: string; phone?: string; governorate?: string; city?: string; line1?: string; line2?: string | null };
type EligibleOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  delivered_at: string | null;
  updated_at: string;
  shipping_address: Addr | null;
  order_items: (OrderLine & { id: string })[];
};
type Form = { fullName: string; phone: string; governorate: string; city: string; line1: string; line2: string };

const REASONS: [string, string][] = [
  ["damaged", "It arrived damaged or does not work"],
  ["wrong_item", "I received the wrong item"],
  ["not_as_described", "It is not as described"],
  ["size_fit", "Size or fit problem"],
  ["late", "It arrived too late"],
  ["changed_mind", "I changed my mind"],
  ["other", "Something else"],
];

const input =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

const day = 24 * 60 * 60 * 1000;

function ReturnPage() {
  const { user, loading } = useAuth();
  const { order: presetOrder } = Route.useSearch();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<EligibleOrder[] | null>(null);
  const [blocked, setBlocked] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [orderId, setOrderId] = useState<string>("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [type, setType] = useState<"refund" | "replacement">("refund");
  const [addrPick, setAddrPick] = useState("order");
  const [form, setForm] = useState<Form>({ fullName: "", phone: "", governorate: "", city: "", line1: "", line2: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ return_number: string; order_number: string } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/returns/new" } as never });
      return;
    }
    let live = true;
    (async () => {
      const [o, r, addrs] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id,order_number,status,total,delivered_at,updated_at,shipping_address,order_items(id,product_name,quantity,unit_price,product:products(slug,images))",
          )
          .eq("user_id", user.id)
          .in("status", ["delivered", "completed"])
          .order("created_at", { ascending: false }),
        supabase.from("returns").select("order_id,status,return_number").eq("user_id", user.id).in("status", ["requested", "approved"]),
        fetchAddresses(user.id).catch(() => [] as SavedAddress[]),
      ]);
      if (!live) return;
      const open: Record<string, string> = {};
      for (const x of (r.data ?? []) as { order_id: string; return_number: string }[]) open[x.order_id] = x.return_number;
      const list = ((o.data ?? []) as unknown as EligibleOrder[]).filter(
        (x) => Date.now() - new Date(x.delivered_at ?? x.updated_at).getTime() <= SITE.returnDays * day,
      );
      setBlocked(open);
      setOrders(list);
      setSaved(addrs);
      const first = presetOrder && list.some((x) => x.id === presetOrder && !open[x.id]) ? presetOrder : "";
      if (first) chooseOrder(first, list, addrs);
    })();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc("delivery_zones").then(({ data }: { data: { governorate: string }[] | null }) => {
      if (live && Array.isArray(data)) setZones(data.map((z) => z.governorate));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const order = useMemo(() => orders?.find((o) => o.id === orderId) ?? null, [orders, orderId]);

  function fromOrder(o: EligibleOrder): Form {
    const a = o.shipping_address ?? {};
    return { fullName: a.full_name ?? "", phone: a.phone ?? "", governorate: a.governorate ?? "", city: a.city ?? "", line1: a.line1 ?? "", line2: a.line2 ?? "" };
  }

  function chooseOrder(id: string, list = orders ?? [], addrs = saved) {
    setOrderId(id);
    setQty({});
    setError(null);
    const o = list.find((x) => x.id === id);
    if (!o) return;
    const def = addrs.find((a) => a.isDefault);
    if (def) {
      setAddrPick(def.id);
      setForm({ fullName: def.fullName, phone: def.phone, governorate: def.governorate, city: def.city, line1: def.line1, line2: def.line2 });
    } else {
      setAddrPick("order");
      setForm(fromOrder(o));
    }
  }

  function pickAddress(v: string) {
    setAddrPick(v);
    if (v === "order" && order) setForm(fromOrder(order));
    else if (v === "new") setForm({ fullName: form.fullName, phone: form.phone, governorate: "", city: "", line1: "", line2: "" });
    else {
      const a = saved.find((x) => x.id === v);
      if (a) setForm({ fullName: a.fullName, phone: a.phone, governorate: a.governorate, city: a.city, line1: a.line1, line2: a.line2 });
    }
  }

  const chosen = order ? order.order_items.filter((i) => (qty[i.id] ?? 0) > 0) : [];
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return setError("Choose the order first.");
    if (chosen.length === 0) return setError("Choose at least one item to return.");
    if (!reason) return setError("Choose why you want to return it.");
    setBusy(true);
    setError(null);
    // The database function is new, so the generated types do not list it yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any).rpc("create_return_request", {
      p_order_id: order.id,
      p_items: chosen.map((i) => ({ order_item_id: i.id, quantity: qty[i.id] })),
      p_reason_code: reason,
      p_details: details,
      p_type: type,
      p_address: { full_name: form.fullName, phone: form.phone, governorate: form.governorate, city: form.city, line1: form.line1, line2: form.line2 },
    });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(data as { return_number: string; order_number: string });
  }

  if (loading || !user || orders === null) {
    return (
      <SiteLayout>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </SiteLayout>
    );
  }

  if (done) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-xl px-4 py-20 text-center">
          <CheckCircle2 className="mx-auto size-12 text-brand" aria-hidden />
          <h1 className="mt-4 font-display text-3xl font-bold">Return request sent</h1>
          <p className="mt-3 text-muted-foreground">
            Your request number is <strong className="text-foreground">{done.return_number}</strong> for order {done.order_number}.
            We will review it and email you at <strong className="text-foreground">{user.email}</strong> when it is approved.
          </p>
          <Link to="/account" className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
            Back to my account
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Return request</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can return items within {SITE.returnDays} days of delivery if they are unused and in the original packaging.
          See our{" "}
          <Link to="/refunds" className="underline">Refund Policy</Link>.
        </p>

        {orders.length === 0 ? (
          <Card className="mt-8 p-8 text-center">
            <p className="font-display text-lg font-semibold">No orders to return yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can ask for a return once an order has been delivered, for {SITE.returnDays} days after delivery.
            </p>
            <Link to="/account" className="mt-5 inline-flex h-10 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
              See my orders
            </Link>
          </Card>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-8">
            <div>
              <h2 className="font-display text-lg font-bold">1. Which order?</h2>
              <ul className="mt-3 space-y-2">
                {orders.map((o) => {
                  const open = blocked[o.id];
                  return (
                    <li key={o.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${orderId === o.id ? "border-brand bg-brand/5" : ""} ${open ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <input type="radio" name="order" className="size-4" disabled={!!open} checked={orderId === o.id} onChange={() => chooseOrder(o.id)} />
                        <div className="flex -space-x-2">
                          {o.order_items.slice(0, 3).map((l) => (
                            <OrderThumb key={l.id} line={l} size="size-10 ring-2 ring-background" />
                          ))}
                        </div>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-medium">{o.order_number}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {o.order_items.map((l) => l.product_name).join(", ")}
                          </p>
                          {open && <p className="text-xs text-amber-700">You already have request {open} for this order.</p>}
                        </div>
                        <span className="text-sm font-semibold">{formatMoney(Number(o.total))}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            {order && (
              <>
                <div>
                  <h2 className="font-display text-lg font-bold">2. Which items?</h2>
                  <ul className="mt-3 divide-y rounded-xl border">
                    {order.order_items.map((l) => {
                      const q = qty[l.id] ?? 0;
                      return (
                        <li key={l.id} className="flex items-center gap-3 p-3">
                          <input
                            type="checkbox"
                            className="size-4"
                            aria-label={`Return ${l.product_name}`}
                            checked={q > 0}
                            onChange={(e) => setQty((p) => ({ ...p, [l.id]: e.target.checked ? 1 : 0 }))}
                          />
                          <OrderThumb line={l} size="size-14" />
                          <div className="min-w-0 flex-1 text-sm">
                            <p className="font-medium">{l.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatMoney(Number(l.unit_price))} · you bought {l.quantity}
                            </p>
                          </div>
                          {q > 0 && l.quantity > 1 && (
                            <select
                              aria-label="Quantity to return"
                              value={q}
                              onChange={(e) => setQty((p) => ({ ...p, [l.id]: Number(e.target.value) }))}
                              className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                            >
                              {Array.from({ length: l.quantity }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h2 className="font-display text-lg font-bold">3. Why are you returning it?</h2>
                  <label className="block text-sm font-medium">
                    Reason
                    <select value={reason} onChange={(e) => setReason(e.target.value)} required className={input}>
                      <option value="" disabled>Choose…</option>
                      {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Tell us more {reason === "other" ? "" : <span className="font-normal text-muted-foreground">(optional)</span>}
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      required={reason === "other"}
                      minLength={reason === "other" ? 5 : undefined}
                      maxLength={1000}
                      rows={3}
                      className={input}
                    />
                  </label>
                  <fieldset>
                    <legend className="text-sm font-medium">What would you like?</legend>
                    <div className="mt-2 flex gap-3">
                      {([["refund", "Refund"], ["replacement", "Replacement"]] as const).map(([v, l]) => (
                        <label key={v} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${type === v ? "border-brand bg-brand/5" : ""}`}>
                          <input type="radio" name="type" className="size-4" checked={type === v} onChange={() => setType(v)} /> {l}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div className="space-y-4">
                  <h2 className="font-display text-lg font-bold">4. Where should we collect it?</h2>
                  <label className="block text-sm font-medium">
                    Address
                    <select value={addrPick} onChange={(e) => pickAddress(e.target.value)} className={input}>
                      <option value="order">The address of this order</option>
                      {saved.map((a) => (
                        <option key={a.id} value={a.id}>{(a.label || "Saved address") + " — " + a.line1 + ", " + a.city}</option>
                      ))}
                      <option value="new">A different address</option>
                    </select>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Full name
                      <input className={input} required minLength={3} maxLength={100} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
                    </label>
                    <label className="block text-sm font-medium">
                      Mobile number
                      <input
                        className={input}
                        required
                        type="tel"
                        inputMode="tel"
                        placeholder="01012345678"
                        pattern="(\+?20|0)?1[0125][0-9]{8}"
                        title="An Egyptian mobile number, for example 01012345678"
                        value={form.phone}
                        onChange={(e) => set({ phone: e.target.value })}
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Governorate
                      <select className={input} required value={form.governorate} onChange={(e) => set({ governorate: e.target.value })}>
                        <option value="" disabled>Choose…</option>
                        {(zones.includes(form.governorate) || !form.governorate ? zones : [form.governorate, ...zones]).map((z) => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium">
                      City or area
                      <input className={input} required minLength={2} maxLength={80} value={form.city} onChange={(e) => set({ city: e.target.value })} />
                    </label>
                  </div>
                  <label className="block text-sm font-medium">
                    Street, building and apartment
                    <input className={input} required minLength={6} maxLength={150} value={form.line1} onChange={(e) => set({ line1: e.target.value })} />
                  </label>
                  <label className="block text-sm font-medium">
                    Landmark <span className="font-normal text-muted-foreground">(optional)</span>
                    <input className={input} maxLength={150} value={form.line2} onChange={(e) => set({ line2: e.target.value })} />
                  </label>
                </div>

                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <button
                  type="submit"
                  disabled={busy || chosen.length === 0}
                  className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send return request"}
                </button>
              </>
            )}
            {!order && error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </form>
        )}
      </section>
    </SiteLayout>
  );
}
