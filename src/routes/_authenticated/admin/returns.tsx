import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Package } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { money, shortDate } from "@/lib/admin/formatters";
import { imageUrl } from "@/lib/store/format";
import { approveReturn, resendReturnEmail } from "@/lib/store/status-emails";

export const Route = createFileRoute("/_authenticated/admin/returns")({ component: ReturnsPage });

type Item = { name: string; quantity: number; unit_price: number; image?: string | null };
type Addr = { full_name?: string; phone?: string; governorate?: string; city?: string; line1?: string; line2?: string };
type R = {
  id: string;
  return_number: string;
  order_id: string;
  status: string;
  type: string;
  reason: string | null;
  details: string | null;
  items: Item[] | null;
  address: Addr | null;
  refund_amount: number | null;
  admin_notes: string | null;
  approval_email_sent_at: string | null;
  created_at: string;
};
type OrderInfo = { id: string; order_number: string; email: string };

const FILTERS = [
  ["requested", "Needs review"],
  ["approved", "Approved"],
  ["done", "Completed"],
  ["rejected", "Rejected"],
  ["all", "All"],
] as const;

const tone = (s: string) =>
  s === "approved" ? "default" : s === "rejected" ? "destructive" : s === "requested" ? "secondary" : "outline";

function ReturnsPage() {
  const [rows, setRows] = useState<R[] | null>(null);
  const [orders, setOrders] = useState<Record<string, OrderInfo>>({});
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("requested");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("returns").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const list = (data ?? []) as unknown as R[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.order_id))];
    if (ids.length) {
      const { data: o } = await supabase.from("orders").select("id,order_number,email").in("id", ids);
      setOrders(Object.fromEntries(((o ?? []) as OrderInfo[]).map((x) => [x.id, x])));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;

  async function approve(r: R) {
    setBusy(r.id);
    const t = await token();
    if (!t) {
      setBusy(null);
      return toast.error("Please sign in again.");
    }
    const res = await approveReturn({ data: { accessToken: t, id: r.id, note: notes[r.id] ?? "" } }).catch(() => ({
      approved: false, emailed: false, error: "Something went wrong. Please try again.",
    }));
    setBusy(null);
    if (!res.approved) return toast.error(res.error ?? "Could not approve.");
    if (res.emailed) toast.success("Approved. The customer was emailed.");
    else toast.warning("Approved, but the email could not be sent. Use Resend email.");
    void load();
  }

  async function resend(r: R) {
    setBusy(r.id);
    const t = await token();
    if (!t) {
      setBusy(null);
      return toast.error("Please sign in again.");
    }
    const res = await resendReturnEmail({ data: { accessToken: t, id: r.id } }).catch(() => ({
      sent: false, error: "Something went wrong.",
    }));
    setBusy(null);
    if (res.sent) toast.success("Email sent.");
    else toast.error(res.error ?? "The email could not be sent.");
    void load();
  }

  async function setStatus(r: R, status: string) {
    setBusy(r.id);
    const patch: Record<string, unknown> = { status };
    if (["rejected", "refunded", "replaced"].includes(status)) patch.processed_at = new Date().toISOString();
    if (status === "rejected" && (notes[r.id] ?? "").trim()) patch.admin_notes = notes[r.id].trim();
    const { error } = await supabase.from("returns").update(patch as never).eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(status === "rejected" ? "Request rejected" : "Updated");
    void load();
  }

  const shown = (rows ?? []).filter((r) =>
    filter === "all" ? true : filter === "done" ? ["refunded", "replaced"].includes(r.status) : r.status === filter,
  );
  const count = (f: string) =>
    (rows ?? []).filter((r) => (f === "all" ? true : f === "done" ? ["refunded", "replaced"].includes(r.status) : r.status === f)).length;

  return (
    <PageShell
      title="Returns"
      description="Return requests from customers. Approving a request emails the customer."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Returns" }]}
    >
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {label} ({count(k)})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rows === null && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {rows !== null && shown.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">No return requests here.</Card>
        )}
        {shown.map((r) => {
          const o = orders[r.order_id];
          const a = r.address ?? {};
          const items = Array.isArray(r.items) ? r.items : [];
          const working = busy === r.id;
          return (
            <Card key={r.id} className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{r.return_number}</p>
                  <p className="text-xs text-muted-foreground">
                    Order{" "}
                    {o ? (
                      <Link to="/admin/orders/$id" params={{ id: r.order_id }} className="font-medium underline">
                        {o.order_number}
                      </Link>
                    ) : (
                      "—"
                    )}{" "}
                    · {shortDate(r.created_at)}
                  </p>
                </div>
                <Badge variant={tone(r.status)} className="capitalize">{r.status === "requested" ? "needs review" : r.status}</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {items.map((i, idx) => {
                    const src = imageUrl(i.image);
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        {src ? (
                          <img src={src} alt="" className="size-12 rounded-lg border object-cover" />
                        ) : (
                          <span className="grid size-12 place-items-center rounded-lg border bg-muted"><Package className="size-4" /></span>
                        )}
                        <div className="min-w-0 text-sm">
                          <p className="truncate font-medium">{i.name}</p>
                          <p className="text-xs text-muted-foreground">{i.quantity} × {money(Number(i.unit_price))}</p>
                        </div>
                      </div>
                    );
                  })}
                  <p className="pt-1 text-sm">
                    <span className="font-medium capitalize">{r.type === "replacement" ? "Replacement" : "Refund"}</span>
                    {r.refund_amount ? <> · items value {money(Number(r.refund_amount))}</> : null}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Reason:</span> {r.reason ?? "—"}</p>
                  {r.details && <p className="whitespace-pre-line text-muted-foreground">“{r.details}”</p>}
                  <p className="pt-2 font-medium">Customer and pick-up address</p>
                  <p>{a.full_name}</p>
                  <p className="text-muted-foreground">
                    {a.phone}
                    {o?.email ? ` · ${o.email}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {[a.line1, a.line2, a.city, a.governorate].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>

              {r.status === "requested" && (
                <div className="space-y-3 border-t pt-4">
                  <Textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="Message for the customer (optional). It is included in the approval email, and shown to the customer if you reject."
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={working} onClick={() => approve(r)}>
                      {working ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Mail className="mr-1 size-4" />}
                      Approve and email customer
                    </Button>
                    <Button size="sm" variant="outline" disabled={working} onClick={() => setStatus(r, "rejected")}>
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {r.status === "approved" && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                  <span className="text-xs text-muted-foreground">
                    {r.approval_email_sent_at ? `Approval email sent ${shortDate(r.approval_email_sent_at)}` : "Approval email not sent yet"}
                  </span>
                  {!r.approval_email_sent_at && (
                    <Button size="sm" variant="outline" disabled={working} onClick={() => resend(r)}>
                      <Mail className="mr-1 size-4" /> Resend email
                    </Button>
                  )}
                  <span className="flex-1" />
                  <Button size="sm" disabled={working} onClick={() => setStatus(r, "refunded")}>Mark refunded</Button>
                  <Button size="sm" variant="outline" disabled={working} onClick={() => setStatus(r, "replaced")}>Mark replaced</Button>
                </div>
              )}

              {r.admin_notes && r.status !== "requested" && (
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Your message:</span> {r.admin_notes}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
