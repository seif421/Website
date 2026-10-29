import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Star, Trash2, Flag, Reply } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { shortDate } from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: ReviewsPage,
});

type Review = {
  id: string; product_id: string; user_id: string; rating: number;
  title: string | null; body: string | null; is_approved: boolean;
  is_featured: boolean; reported_count: number; created_at: string;
  products?: { name: string } | null;
  profiles?: { email: string | null; full_name: string | null } | null;
};

function ReviewsPage() {
  const [rows, setRows] = useState<Review[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "reported" | "featured">("pending");

  async function load() {
    const { data, error } = await supabase.from("reviews").select("*, products(name)").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Review[]);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter === "pending") return !r.is_approved;
    if (filter === "approved") return r.is_approved;
    if (filter === "reported") return (r.reported_count ?? 0) > 0;
    if (filter === "featured") return r.is_featured;
    return true;
  }), [rows, filter]);

  async function setApproved(id: string, v: boolean) {
    await supabase.from("reviews").update({ is_approved: v }).eq("id", id); load();
  }
  async function setFeatured(id: string, v: boolean) {
    await supabase.from("reviews").update({ is_featured: v }).eq("id", id); load();
  }
  async function del(id: string) {
    if (!confirm("Delete review?")) return;
    await supabase.from("reviews").delete().eq("id", id); load();
  }
  async function report(id: string) {
    const r = rows.find((x) => x.id === id); if (!r) return;
    await supabase.from("reviews").update({ reported_count: (r.reported_count ?? 0) + 1 }).eq("id", id); load();
  }
  async function sendReply(id: string) {
    const body = replies[id]?.trim(); if (!body) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("review_replies").insert({ review_id: id, body, author_id: user?.id ?? null });
    if (error) return toast.error(error.message);
    setReplies((prev) => ({ ...prev, [id]: "" }));
    toast.success("Reply posted");
  }

  return (
    <PageShell title="Reviews" description="Moderate customer reviews."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Reviews" }]}
      actions={
        <Select value={filter} onValueChange={(v) => setFilter(v as never)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>}>

      <div className="space-y-3">
        {filtered.length === 0 && <Card className="p-10 text-center text-sm text-muted-foreground">No reviews here.</Card>}
        {filtered.map((r) => (
          <Card key={r.id} className="p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.title ?? "(No title)"}</span>
                  <span className="flex items-center gap-0.5 text-amber-500">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-3 fill-current" />)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{r.products?.name} · {shortDate(r.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.is_approved ? <Badge variant="default">Approved</Badge> : <Badge variant="secondary">Pending</Badge>}
                {r.is_featured && <Badge>Featured</Badge>}
                {(r.reported_count ?? 0) > 0 && <Badge variant="destructive">{r.reported_count} reports</Badge>}
              </div>
            </div>
            <p className="text-sm">{r.body}</p>
            <div className="flex flex-wrap gap-2">
              {!r.is_approved && <Button size="sm" onClick={() => setApproved(r.id, true)}><Check className="size-4" /> Approve</Button>}
              {r.is_approved && <Button size="sm" variant="outline" onClick={() => setApproved(r.id, false)}>Reject</Button>}
              <Button size="sm" variant="outline" onClick={() => setFeatured(r.id, !r.is_featured)}><Star className="size-4" /> {r.is_featured ? "Unfeature" : "Feature"}</Button>
              <Button size="sm" variant="outline" onClick={() => report(r.id)}><Flag className="size-4" /> Report</Button>
              <Button size="sm" variant="destructive" onClick={() => del(r.id)}><Trash2 className="size-4" /> Delete</Button>
            </div>
            <div className="flex gap-2">
              <Textarea placeholder="Reply publicly…" value={replies[r.id] ?? ""} onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })} className="min-h-[60px]" />
              <Button size="sm" onClick={() => sendReply(r.id)}><Reply className="size-4" /> Reply</Button>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}