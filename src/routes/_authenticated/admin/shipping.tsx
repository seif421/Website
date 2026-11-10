import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  component: DeliveryFeesPage,
});

type Zone = { governorate: string; fee: number };

// These database functions are new, so the generated types do not list them yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (supabase as any).rpc.bind(supabase) as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function DeliveryFeesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [fees, setFees] = useState<Record<string, string>>({});
  const [freeOver, setFreeOver] = useState("");
  const [codMax, setCodMax] = useState("");

  async function load() {
    const [z, s] = await Promise.all([rpc("delivery_zones"), rpc("admin_get_store_settings")]);
    if (Array.isArray(z.data)) {
      setZones(z.data as Zone[]);
      setFees(Object.fromEntries((z.data as Zone[]).map((x) => [x.governorate, String(x.fee)])));
    }
    if (s.error) toast.error(s.error.message);
    else {
      const v = s.data as { free_shipping_over: string; cod_max_total: string };
      setFreeOver(v.free_shipping_over);
      setCodMax(v.cod_max_total);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function saveFee(governorate: string) {
    const { error } = await rpc("admin_set_delivery_fee", {
      p_governorate: governorate,
      p_fee: Number(fees[governorate]),
    });
    if (error) return toast.error(error.message);
    toast.success(`${governorate} fee saved`);
  }
  async function saveSetting(key: string, value: string) {
    const { error } = await rpc("admin_set_store_setting", { p_key: key, p_value: value.trim() });
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  return (
    <PageShell
      title="Delivery fees"
      description="What customers pay for delivery in each governorate, in EGP. Set these from your courier's price list."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Delivery fees" }]}
    >
      <Card className="p-5 space-y-4">
        <p className="font-semibold text-sm">Order rules</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="free">Free delivery over (EGP)</Label>
            <div className="flex gap-2">
              <Input
                id="free"
                type="number"
                min={0}
                placeholder="Empty = never free"
                value={freeOver}
                onChange={(e) => setFreeOver(e.target.value)}
              />
              <Button size="sm" onClick={() => saveSetting("free_shipping_over", freeOver)}>
                <Save className="size-4" /> Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If you use this, also set the same number in the site settings file so the
              announcement bar matches.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cod">Largest cash on delivery order (EGP)</Label>
            <div className="flex gap-2">
              <Input
                id="cod"
                type="number"
                min={0}
                placeholder="Empty = no limit"
                value={codMax}
                onChange={(e) => setCodMax(e.target.value)}
              />
              <Button size="sm" onClick={() => saveSetting("cod_max_total", codMax)}>
                <Save className="size-4" /> Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Bigger orders are refused at checkout. A limit reduces the loss from refused parcels.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <p className="font-semibold text-sm mb-1">Fee per governorate</p>
        <p className="mb-4 text-xs text-muted-foreground">
          The starting numbers are placeholders. Replace them with your courier's real rates before
          you sell.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => (
            <div key={z.governorate} className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-sm">{z.governorate}</span>
              <Input
                type="number"
                min={0}
                value={fees[z.governorate] ?? ""}
                onChange={(e) => setFees({ ...fees, [z.governorate]: e.target.value })}
                aria-label={`${z.governorate} delivery fee`}
              />
              <Button size="sm" variant="outline" onClick={() => saveFee(z.governorate)}>
                Save
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
