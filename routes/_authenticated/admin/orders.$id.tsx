import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer, Save, ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS,
  money, shortDate, addOrderTimeline,
} from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  component: OrderDetail,
});

type Order = {
  id: string; order_number: string; email: string; user_id: string;
  status: string; payment_status: string;
  subtotal: number; tax: number; shipping: number; discount: number; total: number;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  notes: string | null;
  tracking_number: string | null; carrier: string | null; shipping_method: string | null;
  payment_method: string | null; coupon_code: string | null; supplier_reference: string | null;
  created_at: string;
};
type Item = { id: string; product_name: string; product_sku: string | null; quantity: number; unit_price: number; subtotal: number };
type Timeline = { id: string; event: string; message: string | null; created_at: string };
type Note = { id: string; note: string; is_internal: boolean; created_at: string };

function OrderDetail() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [oRes, iRes, tRes, nRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
      supabase.from("order_timeline").select("*").eq("order_id", id).order("created_at", { ascending: false }),
      supabase.from("order_notes").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    ]);
    if (oRes.error) toast.error(oRes.error.message);
    setOrder(oRes.data as Order | null);
    setItems((iRes.data ?? []) as Item[]);
    setTimeline((tRes.data ?? []) as Timeline[]);
    setNotes((nRes.data ?? []) as Note[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function updateOrder(patch: Partial<Order>) {
    if (!order) return;
    const { error } = await supabase.from("orders").update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    setOrder({ ...order, ...patch });
  }
  async function setStatus(newStatus: string) {
    const patch: Partial<Order> = { status: newStatus };
    if (newStatus === "shipped") (patch as never as { shipped_at: string }).shipped_at = new Date().toISOString();
    if (newStatus === "delivered") (patch as never as { delivered_at: string }).delivered_at = new Date().toISOString();
    if (newStatus === "cancelled") (patch as never as { cancelled_at: string }).cancelled_at = new Date().toISOString();
    await updateOrder(patch);
    await addOrderTimeline(id, `status_${newStatus}`, `Status set to ${ORDER_STATUS_LABEL[newStatus] ?? newStatus}`);
    load();
  }
  async function addNote() {
    if (!newNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("order_notes").insert({
      order_id: id, note: newNote.trim(), author_id: user?.id ?? null, is_internal: true,
    });
    if (error) return toast.error(error.message);
    setNewNote(""); load();
  }
  async function saveTracking(carrier: string, tracking: string) {
    await updateOrder({ carrier, tracking_number: tracking });
    await addOrderTimeline(id, "tracking_updated", `Tracking: ${carrier} ${tracking}`);
    load();
  }

  function printSection(title: string) {
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w || !order) return;
    const rowsHtml = items.map((it) => `<tr><td>${it.product_name}</td><td>${it.product_sku ?? ""}</td><td style="text-align:right">${it.quantity}</td><td style="text-align:right">${money(it.unit_price)}</td><td style="text-align:right">${money(it.subtotal)}</td></tr>`).join("");
    const addr = order.shipping_address as Record<string, string> | null;
    const addrHtml = addr ? Object.values(addr).filter(Boolean).join("<br/>") : "";
    w.document.write(`<html><head><title>${title} ${order.order_number}</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #ddd;padding:8px;font-size:13px}.tot{text-align:right;font-weight:600}</style></head><body>
      <h1>${title}</h1><p style="color:#666">${order.order_number} · ${shortDate(order.created_at)}</p>
      <div><strong>Ship to</strong><br/>${addrHtml}</div>
      <table><thead><tr><th align="left">Item</th><th align="left">SKU</th><th align="right">Qty</th><th align="right">Price</th><th align="right">Total</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      ${title === "Invoice" ? `<table style="margin-top:12px"><tr><td class="tot">Subtotal</td><td style="text-align:right;width:120px">${money(order.subtotal)}</td></tr>
        <tr><td class="tot">Tax</td><td style="text-align:right">${money(order.tax)}</td></tr>
        <tr><td class="tot">Shipping</td><td style="text-align:right">${money(order.shipping)}</td></tr>
        <tr><td class="tot">Discount</td><td style="text-align:right">-${money(order.discount)}</td></tr>
        <tr><td class="tot">Total</td><td style="text-align:right;font-size:16px"><strong>${money(order.total)}</strong></td></tr></table>` : ""}
      </body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  if (loading) return <PageShell title="Order"><p>Loading…</p></PageShell>;
  if (!order) return <PageShell title="Order not found"><Link to="/admin/orders" className="text-sm underline">Back to orders</Link></PageShell>;

  return (
    <PageShell
      title={`Order ${order.order_number}`}
      description={`${shortDate(order.created_at)} · ${order.email}`}
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Orders", to: "/admin/orders" }, { label: order.order_number }]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/admin/orders"><ArrowLeft className="size-4" /> Back</Link></Button>
          <Button variant="outline" size="sm" onClick={() => printSection("Invoice")}><Printer className="size-4" /> Invoice</Button>
          <Button variant="outline" size="sm" onClick={() => printSection("Packing Slip")}><Printer className="size-4" /> Packing Slip</Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Items</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${ORDER_STATUS_CLASS[order.status] ?? "bg-muted"}`}>{ORDER_STATUS_LABEL[order.status]}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr><th className="text-left py-2">Item</th><th className="text-left">SKU</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y">
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2">{it.product_name}</td>
                    <td className="text-xs text-muted-foreground">{it.product_sku}</td>
                    <td className="text-right">{it.quantity}</td>
                    <td className="text-right">{money(it.unit_price)}</td>
                    <td className="text-right font-medium">{money(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid gap-1 text-sm max-w-xs ml-auto">
              <Row label="Subtotal" v={money(order.subtotal)} />
              <Row label="Tax" v={money(order.tax)} />
              <Row label="Shipping" v={money(order.shipping)} />
              <Row label="Discount" v={`-${money(order.discount)}`} />
              <div className="mt-1 flex justify-between border-t pt-2 font-bold text-base"><span>Total</span><span>{money(order.total)}</span></div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="font-semibold text-sm mb-3">Timeline</p>
            <ul className="space-y-3">
              {timeline.length === 0 && <li className="text-sm text-muted-foreground">No events yet.</li>}
              {timeline.map((t) => (
                <li key={t.id} className="flex gap-3 text-sm">
                  <div className="size-2 rounded-full bg-brand mt-1.5" />
                  <div className="flex-1">
                    <p className="font-medium">{t.message ?? t.event}</p>
                    <p className="text-xs text-muted-foreground">{shortDate(t.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <p className="font-semibold text-sm mb-3">Notes</p>
            <div className="flex gap-2">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add internal note…" className="min-h-[60px]" />
              <Button onClick={addNote}>Add</Button>
            </div>
            <ul className="mt-3 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md border p-3 text-sm">
                  <p>{n.note}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{shortDate(n.created_at)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <p className="font-semibold text-sm">Status</p>
            <Select value={order.status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
            <p className="font-semibold text-sm pt-2">Payment</p>
            <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>{order.payment_status}</Badge>
            {order.payment_method && <p className="text-xs text-muted-foreground">Method: {order.payment_method}</p>}
          </Card>

          <TrackingCard order={order} onSave={saveTracking} />

          <Card className="p-5 text-sm space-y-2">
            <p className="font-semibold">Shipping address</p>
            <AddressBlock addr={order.shipping_address} />
            <p className="font-semibold pt-2">Billing address</p>
            <AddressBlock addr={order.billing_address} />
          </Card>

          {order.coupon_code && <Card className="p-5 text-sm"><p className="font-semibold">Coupon</p><p className="text-muted-foreground">{order.coupon_code}</p></Card>}
          {order.supplier_reference && <Card className="p-5 text-sm"><p className="font-semibold">Supplier ref</p><p className="text-muted-foreground">{order.supplier_reference}</p></Card>}
        </div>
      </div>
    </PageShell>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className="text-foreground">{v}</span></div>;
}
function AddressBlock({ addr }: { addr: Record<string, unknown> | null }) {
  if (!addr) return <p className="text-muted-foreground text-xs">Not provided</p>;
  const vals = Object.values(addr).filter(Boolean).map(String);
  return <div className="text-xs text-muted-foreground leading-relaxed">{vals.map((v, i) => <div key={i}>{v}</div>)}</div>;
}
function TrackingCard({ order, onSave }: { order: Order; onSave: (carrier: string, tracking: string) => void }) {
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  return (
    <Card className="p-5 space-y-2">
      <p className="font-semibold text-sm">Shipment</p>
      <Input placeholder="Carrier (UPS, FedEx…)" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
      <Input placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
      <Button size="sm" onClick={() => onSave(carrier, tracking)}><Save className="size-4" /> Save tracking</Button>
    </Card>
  );
}