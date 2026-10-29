import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { money, shortDate } from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/gift-cards")({ component: GiftCardsPage });

type G = { id: string; code: string; initial_balance: number; balance: number; recipient_email: string | null; is_active: boolean; expires_at: string | null; created_at: string };

function GiftCardsPage() {
  const [rows, setRows] = useState<G[]>([]);
  const [form, setForm] = useState({ code: "", initial_balance: 50, recipient_email: "", expires_at: "" });
  async function load() { const { data } = await supabase.from("gift_cards").select("*").order("created_at", { ascending: false }); setRows((data ?? []) as G[]); }
  useEffect(() => { load(); }, []);
  function randomCode() { return "GC-" + Array.from({length: 12}, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random()*32)]).join(""); }
  async function issue() {
    const code = form.code.trim() || randomCode();
    const amt = Number(form.initial_balance);
    if (!amt || amt <= 0) return toast.error("Amount must be > 0");
    const { error } = await supabase.from("gift_cards").insert({ code, initial_balance: amt, balance: amt, recipient_email: form.recipient_email || null, expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null });
    if (error) return toast.error(error.code === "23505" ? "Code already exists" : error.message);
    setForm({ code: "", initial_balance: 50, recipient_email: "", expires_at: "" }); load();
  }
  async function del(id: string) { if (!confirm("Delete gift card?")) return; await supabase.from("gift_cards").delete().eq("id", id); load(); }
  return (
    <PageShell title="Gift Cards" description="Issue and track gift card balances."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Gift Cards" }]}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2 space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No gift cards issued.</p>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-mono text-sm font-medium">{r.code}</p>
                <p className="text-xs text-muted-foreground">{r.recipient_email ?? "—"} · issued {shortDate(r.created_at)}{r.expires_at ? ` · expires ${shortDate(r.expires_at)}`:""}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right"><p className="text-xs text-muted-foreground">Balance</p><p className="font-semibold">{money(r.balance)} / {money(r.initial_balance)}</p></div>
                <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Off"}</Badge>
                <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
        </Card>
        <Card className="p-4 space-y-2">
          <p className="font-semibold text-sm">Issue new</p>
          <div><Label>Code (blank = auto)</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: Number(e.target.value) })} /></div>
          <div><Label>Recipient email</Label><Input type="email" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} /></div>
          <div><Label>Expires</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
          <Button className="w-full" onClick={issue}><Plus className="size-4" /> Issue</Button>
        </Card>
      </div>
    </PageShell>
  );
}