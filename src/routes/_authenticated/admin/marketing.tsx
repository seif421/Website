import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { shortDate, money } from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/marketing")({
  component: MarketingPage,
});

function MarketingPage() {
  return (
    <PageShell title="Marketing" description="Banners, flash sales, subscribers and campaigns."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Marketing" }]}>
      <Tabs defaultValue="banners">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="flash">Flash Sales</TabsTrigger>
          <TabsTrigger value="newsletter">Subscribers</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="abandoned">Abandoned Carts</TabsTrigger>
        </TabsList>
        <TabsContent value="banners"><Banners /></TabsContent>
        <TabsContent value="flash"><FlashSales /></TabsContent>
        <TabsContent value="newsletter"><Subscribers /></TabsContent>
        <TabsContent value="campaigns"><Campaigns /></TabsContent>
        <TabsContent value="abandoned"><Abandoned /></TabsContent>
      </Tabs>
    </PageShell>
  );
}

type Banner = { id: string; name: string; title: string | null; subtitle: string | null; cta_label: string | null; cta_url: string | null; image_url: string | null; placement: string; is_active: boolean; starts_at: string | null; ends_at: string | null };
function Banners() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [b, setB] = useState<Partial<Banner>>({ placement: "home_hero", is_active: true });
  async function load() {
    const { data } = await supabase.from("marketing_banners").select("*").order("sort_order").order("created_at", { ascending: false });
    setRows((data ?? []) as Banner[]);
  }
  useEffect(() => { load(); }, []);
  async function save() {
    if (!b.name?.trim()) return toast.error("Name required");
    const { error } = await supabase.from("marketing_banners").insert(b as never);
    if (error) return toast.error(error.message);
    setB({ placement: "home_hero", is_active: true }); load();
  }
  async function toggle(r: Banner) { await supabase.from("marketing_banners").update({ is_active: !r.is_active }).eq("id", r.id); load(); }
  async function del(id: string) { if (!confirm("Delete banner?")) return; await supabase.from("marketing_banners").delete().eq("id", id); load(); }
  return (
    <div className="grid gap-4 lg:grid-cols-3 mt-4">
      <Card className="p-4 lg:col-span-2 space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No banners yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium text-sm">{r.name} <Badge variant="secondary" className="ml-2">{r.placement}</Badge></p>
              <p className="text-xs text-muted-foreground">{r.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
              <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="size-4" /></Button>
            </div>
          </div>
        ))}
      </Card>
      <Card className="p-4 space-y-2">
        <p className="font-semibold text-sm">New banner</p>
        <div><Label>Name</Label><Input value={b.name ?? ""} onChange={(e) => setB({ ...b, name: e.target.value })} /></div>
        <div><Label>Title</Label><Input value={b.title ?? ""} onChange={(e) => setB({ ...b, title: e.target.value })} /></div>
        <div><Label>Subtitle</Label><Input value={b.subtitle ?? ""} onChange={(e) => setB({ ...b, subtitle: e.target.value })} /></div>
        <div><Label>CTA label</Label><Input value={b.cta_label ?? ""} onChange={(e) => setB({ ...b, cta_label: e.target.value })} /></div>
        <div><Label>CTA URL</Label><Input value={b.cta_url ?? ""} onChange={(e) => setB({ ...b, cta_url: e.target.value })} /></div>
        <div><Label>Image URL</Label><Input value={b.image_url ?? ""} onChange={(e) => setB({ ...b, image_url: e.target.value })} /></div>
        <div><Label>Placement</Label>
          <Select value={b.placement ?? "home_hero"} onValueChange={(v) => setB({ ...b, placement: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="home_hero">Home Hero</SelectItem>
              <SelectItem value="home_promo">Home Promo</SelectItem>
              <SelectItem value="announcement">Announcement Bar</SelectItem>
              <SelectItem value="shop">Shop Page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={save}><Plus className="size-4" /> Create banner</Button>
      </Card>
    </div>
  );
}

type Flash = { id: string; name: string; discount_type: string; discount_value: number; starts_at: string; ends_at: string; is_active: boolean };
function FlashSales() {
  const [rows, setRows] = useState<Flash[]>([]);
  const [f, setF] = useState<Partial<Flash>>({ discount_type: "percent", is_active: true });
  async function load() {
    const { data } = await supabase.from("flash_sales").select("*").order("starts_at", { ascending: false });
    setRows((data ?? []) as Flash[]);
  }
  useEffect(() => { load(); }, []);
  async function save() {
    if (!f.name || !f.discount_value || !f.starts_at || !f.ends_at) return toast.error("All fields required");
    const { error } = await supabase.from("flash_sales").insert(f as never);
    if (error) return toast.error(error.message);
    setF({ discount_type: "percent", is_active: true }); load();
  }
  async function del(id: string) { await supabase.from("flash_sales").delete().eq("id", id); load(); }
  return (
    <div className="grid gap-4 lg:grid-cols-3 mt-4">
      <Card className="p-4 lg:col-span-2 space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No flash sales yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium text-sm">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.discount_type === "percent" ? `${r.discount_value}% off` : money(r.discount_value)+" off"} · {shortDate(r.starts_at)} → {shortDate(r.ends_at)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </Card>
      <Card className="p-4 space-y-2">
        <p className="font-semibold text-sm">New flash sale</p>
        <div><Label>Name</Label><Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><Label>Type</Label>
          <Select value={f.discount_type ?? "percent"} onValueChange={(v) => setF({ ...f, discount_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="percent">%</SelectItem><SelectItem value="fixed">Fixed</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Value</Label><Input type="number" value={f.discount_value ?? ""} onChange={(e) => setF({ ...f, discount_value: Number(e.target.value) })} /></div>
        <div><Label>Starts</Label><Input type="datetime-local" onChange={(e) => setF({ ...f, starts_at: new Date(e.target.value).toISOString() })} /></div>
        <div><Label>Ends</Label><Input type="datetime-local" onChange={(e) => setF({ ...f, ends_at: new Date(e.target.value).toISOString() })} /></div>
        <Button className="w-full" onClick={save}><Plus className="size-4" /> Create</Button>
      </Card>
    </div>
  );
}

function Subscribers() {
  const [rows, setRows] = useState<{ id: string; email: string; created_at: string }[]>([]);
  useEffect(() => { supabase.from("newsletter_subscribers").select("id,email,created_at").order("created_at", { ascending: false }).then(({ data }) => setRows((data ?? []) as never)); }, []);
  return (
    <Card className="p-4 mt-4">
      <p className="text-sm font-semibold mb-3">{rows.length} subscribers</p>
      <ul className="divide-y">{rows.map((r) => <li key={r.id} className="flex justify-between py-2 text-sm"><span>{r.email}</span><span className="text-muted-foreground">{shortDate(r.created_at)}</span></li>)}</ul>
    </Card>
  );
}

function Campaigns() {
  return <Card className="p-6 mt-4 text-sm text-muted-foreground">Email campaigns will send from the newsletter list. Connect an email provider from Settings to activate delivery. Templates live under <a className="underline" href="/admin/email-templates">Email Templates</a>.</Card>;
}
function Abandoned() {
  return <Card className="p-6 mt-4 text-sm text-muted-foreground">Abandoned cart tracking hooks into checkout events. Recovery emails send 1h, 24h and 72h after abandonment when campaigns are enabled.</Card>;
}
