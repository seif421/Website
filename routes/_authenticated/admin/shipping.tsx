import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { money } from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  component: ShippingPage,
});

type Zone = { id: string; name: string; countries: string[]; is_active: boolean };
type Rate = { id: string; zone_id: string; name: string; method: string; price: number; free_over: number | null; carrier: string | null; estimated_days_min: number | null; estimated_days_max: number | null; is_active: boolean };

function ShippingPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [newZone, setNewZone] = useState({ name: "", countries: "" });
  const [newRate, setNewRate] = useState<Partial<Rate>>({ method: "flat", price: 0 });
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  async function load() {
    const [z, r] = await Promise.all([
      supabase.from("shipping_zones").select("*").order("sort_order").order("created_at"),
      supabase.from("shipping_rates").select("*").order("price"),
    ]);
    setZones((z.data ?? []) as Zone[]);
    setRates((r.data ?? []) as Rate[]);
  }
  useEffect(() => { load(); }, []);

  async function addZone() {
    if (!newZone.name.trim()) return;
    const countries = newZone.countries.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    const { error } = await supabase.from("shipping_zones").insert({ name: newZone.name, countries });
    if (error) return toast.error(error.message);
    setNewZone({ name: "", countries: "" }); load();
  }
  async function delZone(id: string) { if (!confirm("Delete zone and its rates?")) return; await supabase.from("shipping_zones").delete().eq("id", id); load(); }
  async function addRate() {
    if (!selectedZone || !newRate.name || newRate.price == null) return toast.error("Zone, name, and price required");
    const { error } = await supabase.from("shipping_rates").insert({ ...newRate, zone_id: selectedZone } as never);
    if (error) return toast.error(error.message);
    setNewRate({ method: "flat", price: 0 }); load();
  }
  async function delRate(id: string) { await supabase.from("shipping_rates").delete().eq("id", id); load(); }
  async function toggleRate(r: Rate) { await supabase.from("shipping_rates").update({ is_active: !r.is_active }).eq("id", r.id); load(); }

  return (
    <PageShell title="Shipping" description="Zones, rates and carriers."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Shipping" }]}>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <p className="font-semibold text-sm mb-3">Zones</p>
          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.id} className={`flex items-center justify-between rounded-md border p-3 cursor-pointer ${selectedZone === z.id ? "border-brand bg-brand/5" : ""}`} onClick={() => setSelectedZone(z.id)}>
                <div>
                  <p className="font-medium text-sm">{z.name}</p>
                  <p className="text-xs text-muted-foreground">{z.countries.join(", ") || "No countries"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={z.is_active ? "default" : "secondary"}>{z.is_active ? "Active" : "Off"}</Badge>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); delZone(z.id); }}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input placeholder="Zone name" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} />
            <Input placeholder="US, CA, GB" value={newZone.countries} onChange={(e) => setNewZone({ ...newZone, countries: e.target.value })} />
            <Button onClick={addZone}><Plus className="size-4" /></Button>
          </div>
        </Card>

        <Card className="p-4">
          <p className="font-semibold text-sm mb-3">Rates {selectedZone && <Badge variant="outline" className="ml-2">for {zones.find((z) => z.id === selectedZone)?.name}</Badge>}</p>
          <div className="space-y-2">
            {rates.filter((r) => !selectedZone || r.zone_id === selectedZone).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-sm">{r.name} {r.carrier && <span className="text-xs text-muted-foreground">· {r.carrier}</span>}</p>
                  <p className="text-xs text-muted-foreground">{r.method} · {money(r.price)}{r.free_over ? ` · free over ${money(r.free_over)}` : ""}{r.estimated_days_min ? ` · ${r.estimated_days_min}-${r.estimated_days_max ?? r.estimated_days_min}d` : ""}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Switch checked={r.is_active} onCheckedChange={() => toggleRate(r)} />
                  <Button variant="ghost" size="icon" onClick={() => delRate(r.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
          </div>
          {selectedZone && (
            <div className="mt-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><Label>Name</Label><Input value={newRate.name ?? ""} onChange={(e) => setNewRate({ ...newRate, name: e.target.value })} /></div>
                <div><Label>Method</Label>
                  <Select value={newRate.method ?? "flat"} onValueChange={(v) => setNewRate({ ...newRate, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="flat">Flat rate</SelectItem><SelectItem value="weight">Weight based</SelectItem><SelectItem value="price">Price based</SelectItem><SelectItem value="free">Free shipping</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Price</Label><Input type="number" step="0.01" value={newRate.price ?? 0} onChange={(e) => setNewRate({ ...newRate, price: Number(e.target.value) })} /></div>
                <div><Label>Free over</Label><Input type="number" step="0.01" value={newRate.free_over ?? ""} onChange={(e) => setNewRate({ ...newRate, free_over: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Carrier</Label><Input value={newRate.carrier ?? ""} onChange={(e) => setNewRate({ ...newRate, carrier: e.target.value })} /></div>
                <div><Label>Days min–max</Label><div className="flex gap-2"><Input type="number" value={newRate.estimated_days_min ?? ""} onChange={(e) => setNewRate({ ...newRate, estimated_days_min: e.target.value ? Number(e.target.value) : null })} /><Input type="number" value={newRate.estimated_days_max ?? ""} onChange={(e) => setNewRate({ ...newRate, estimated_days_max: e.target.value ? Number(e.target.value) : null })} /></div></div>
              </div>
              <Button onClick={addRate} className="w-full"><Plus className="size-4" /> Add rate</Button>
            </div>
          )}
          {!selectedZone && <p className="text-sm text-muted-foreground py-4">Select a zone to add rates.</p>}
        </Card>
      </div>
    </PageShell>
  );
}