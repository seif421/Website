import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Truck } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { Card } from "@/components/ui/card";
import { OrderThumb, type OrderLine } from "@/components/account/order-thumb";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/store/format";
import { PROGRESS_STEPS, STATUS_TONE, progressStep, statusLabel } from "@/lib/store/order-status";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [{ title: "Order details — Rivvo" }, { name: "robots", content: "noindex" }] }),
  component: OrderPage,
});

type Addr = { full_name?: string; phone?: string; governorate?: string; city?: string; line1?: string; line2?: string | null };
type Order = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  phone: string | null;
  shipping_address: Addr | null;
  order_items: OrderLine[];
};

const dateTime = (v: string) =>
  new Date(v).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function OrderPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/orders/${id}` } as never });
      return;
    }
    let live = true;
    supabase
      .from("orders")
      .select(
        "id,order_number,status,subtotal,shipping,discount,total,notes,created_at,shipped_at,delivered_at,carrier,tracking_number,tracking_url,phone,shipping_address,order_items(id,product_name,quantity,unit_price,subtotal,product:products(slug,images))",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!live) return;
        if (!data) return setState("missing");
        setOrder(data as unknown as Order);
        setState("ready");
      });
    return () => {
      live = false;
    };
  }, [id, user, loading, navigate]);

  if (state === "loading" || loading) {
    return (
      <SiteLayout>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </SiteLayout>
    );
  }
  if (state === "missing" || !order) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">We could not find this order</h1>
          <Link to="/account" className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
            Back to my account
          </Link>
        </section>
      </SiteLayout>
    );
  }

  const step = progressStep(order.status);
  const a = order.shipping_address ?? {};
  const phone = a.phone || order.phone;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> My account
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Order {order.order_number}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Placed on {dateTime(order.created_at)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_TONE[order.status] ?? "bg-muted"}`}>
            {statusLabel(order.status)}
          </span>
        </div>

        {step >= 0 && (
          <Card className="mt-6 p-5">
            <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
              {PROGRESS_STEPS.map((label, i) => (
                <li key={label} className="text-center">
                  <span
                    className={`mx-auto grid size-8 place-items-center rounded-full text-xs font-semibold ${
                      i <= step ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i <= step ? <Check className="size-4" aria-hidden /> : i + 1}
                  </span>
                  <p className={`mt-2 text-xs ${i <= step ? "font-medium" : "text-muted-foreground"}`}>{label}</p>
                </li>
              ))}
            </ol>
            {order.shipped_at && step >= 2 && (
              <p className="mt-4 text-xs text-muted-foreground">Shipped on {dateTime(order.shipped_at)}</p>
            )}
            {order.delivered_at && step === 3 && (
              <p className="text-xs text-muted-foreground">Delivered on {dateTime(order.delivered_at)}</p>
            )}
          </Card>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <Card className="p-5">
            <h2 className="font-semibold">Items</h2>
            <ul className="mt-3 divide-y">
              {order.order_items.map((l) => {
                const inner = (
                  <>
                    <OrderThumb line={l} size="size-16" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{l.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(Number(l.unit_price))} × {l.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">{formatMoney(Number(l.subtotal ?? l.unit_price * l.quantity))}</p>
                  </>
                );
                return (
                  <li key={l.id} className="py-3">
                    {l.product?.slug ? (
                      <Link to="/product/$slug" params={{ slug: l.product.slug }} className="flex items-center gap-3 hover:opacity-80">
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="space-y-6">
            <Card className="p-5 text-sm">
              <h2 className="font-semibold">Summary</h2>
              <dl className="mt-3 space-y-1.5">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(Number(order.subtotal))}</dd></div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd>-{formatMoney(Number(order.discount))}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{Number(order.shipping) > 0 ? formatMoney(Number(order.shipping)) : "Free"}</dd></div>
                <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{formatMoney(Number(order.total))}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">Payment: cash on delivery</p>
            </Card>

            <Card className="p-5 text-sm">
              <h2 className="font-semibold">Delivery address</h2>
              <p className="mt-2">{a.full_name}</p>
              {phone && <p className="text-muted-foreground">{phone}</p>}
              <p className="mt-1 text-muted-foreground">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {[a.city, a.governorate].filter(Boolean).join(", ")}
              </p>
              {order.notes && (
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Your note:</span> {order.notes}
                </p>
              )}
            </Card>

            {(order.tracking_number || order.carrier) && (
              <Card className="p-5 text-sm">
                <h2 className="flex items-center gap-2 font-semibold"><Truck className="size-4 text-brand" aria-hidden /> Tracking</h2>
                {order.carrier && <p className="mt-2 text-muted-foreground">{order.carrier}</p>}
                {order.tracking_number && <p className="font-medium">{order.tracking_number}</p>}
                {order.tracking_url && (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline">
                    Track your parcel
                  </a>
                )}
              </Card>
            )}
          </div>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Need help with this order?{" "}
          <Link to="/contact" className="font-medium text-foreground underline">Contact us</Link>
        </p>
      </section>
    </SiteLayout>
  );
}
