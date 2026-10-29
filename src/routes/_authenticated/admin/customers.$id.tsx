import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { money, shortDate, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({
  component: CustomerDetail,
});

type Profile = { id: string; email: string | null; full_name: string | null; phone: string | null; company_name: string | null; avatar_url: string | null; created_at: string };
type OrderRow = { id: string; order_number: string; total: number; status: string; created_at: string };
type Tag = { id: string; tag: string };
type Note = { id: string; note: string; created_at: string };

function CustomerDetail() {
  const { id } = Route.useParams();
  const [p, setP] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reviews, setReviews] = useState<{ id: string; rating: number; title: string | null; created_at: string }[]>([]);
  const [wishlist, setWishlist] = useState<{ id: string; product_id: string }[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");

  async function load() {
    const [pr, or, tg, nt, rv, wl] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("orders").select("id,order_number,total,status,created_at").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("customer_tags").select("id,tag").eq("user_id", id),
      supabase.from("customer_notes").select("id,note,created_at").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("reviews").select("id,rating,title,created_at").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("wishlist").select("id,product_id").eq("user_id", id),
    ]);
    setP(pr.data as Profile | null);
    setOrders((or.data ?? []) as OrderRow[]);
    setTags((tg.data ?? []) as Tag[]);
    setNotes((nt.data ?? []) as Note[]);
    setReviews((rv.data ?? []) as never);
    setWishlist((wl.data ?? []) as never);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const ltv = orders.filter((o) => !["cancelled","failed_payment"].includes(o.status)).reduce((s, o) => s + Number(o.total ?? 0), 0);
  const aov = orders.length ? ltv / orders.length : 0;

  async function addTag() {
    if (!newTag.trim()) return;
    const { error } = await supabase.from("customer_tags").insert({ user_id: id, tag: newTag.trim() });
    if (error) return toast.error(error.message);
    setNewTag(""); load();
  }
  async function removeTag(tagId: string) {
    await supabase.from("customer_tags").delete().eq("id", tagId); load();
  }
  async function addNote() {
    if (!newNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("customer_notes").insert({ user_id: id, note: newNote.trim(), author_id: user?.id ?? null });
    if (error) return toast.error(error.message);
    setNewNote(""); load();
  }

  return (
    <PageShell title={p?.full_name ?? p?.email ?? "Customer"}
      description={p?.email ?? ""}
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Customers", to: "/admin/customers" }, { label: p?.full_name ?? "Customer" }]}
      actions={<Button variant="outline" size="sm" asChild><Link to="/admin/customers"><ArrowLeft className="size-4" /> Back</Link></Button>}>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Lifetime value</p><p className="mt-1 text-2xl font-bold">{money(ltv)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Orders</p><p className="mt-1 text-2xl font-bold">{orders.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Avg order value</p><p className="mt-1 text-2xl font-bold">{money(aov)}</p></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <p className="font-semibold text-sm mb-2">Orders</p>
            {orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
              <ul className="divide-y">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2">
                    <div><Link to="/admin/orders/$id" params={{ id: o.id }} className="font-mono text-xs hover:underline">{o.order_number}</Link>
                    <p className="text-xs text-muted-foreground">{shortDate(o.created_at)}</p></div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${ORDER_STATUS_CLASS[o.status] ?? "bg-muted"}`}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                    <span className="font-medium">{money(o.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="font-semibold text-sm mb-2">Reviews</p>
            {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No reviews.</p> : (
              <ul className="divide-y">
                {reviews.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between">
                    <span className="text-sm">{r.title ?? "(no title)"}</span>
                    <Badge variant="secondary">{r.rating}★</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="font-semibold text-sm mb-2">Notes</p>
            <div className="flex gap-2">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Internal note…" className="min-h-[60px]" />
              <Button onClick={addNote}>Add</Button>
            </div>
            <ul className="mt-2 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md border p-3 text-sm">{n.note}
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">{shortDate(n.created_at)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 text-sm space-y-1">
            <p className="font-semibold">Contact</p>
            <p className="text-muted-foreground">{p?.email}</p>
            {p?.phone && <p className="text-muted-foreground">{p.phone}</p>}
            {p?.company_name && <p className="text-muted-foreground">{p.company_name}</p>}
            <p className="text-muted-foreground text-xs pt-1">Joined {p?.created_at ? shortDate(p.created_at) : "—"}</p>
          </Card>

          <Card className="p-5">
            <p className="font-semibold text-sm mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <Badge key={t.id} variant="secondary" className="gap-1">{t.tag}<button onClick={() => removeTag(t.id)}><X className="size-3" /></button></Badge>
              ))}
              {tags.length === 0 && <p className="text-xs text-muted-foreground">No tags</p>}
            </div>
            <div className="flex gap-2">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag" />
              <Button size="sm" onClick={addTag}>Add</Button>
            </div>
          </Card>

          <Card className="p-5"><p className="font-semibold text-sm mb-2">Wishlist</p><p className="text-sm text-muted-foreground">{wishlist.length} items saved</p></Card>
        </div>
      </div>
    </PageShell>
  );
}