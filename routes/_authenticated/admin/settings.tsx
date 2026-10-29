import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

type Gateway = { enabled: boolean };
type Gateways = {
  stripe: Gateway; paypal: Gateway; apple_pay: Gateway; google_pay: Gateway; bank_transfer: Gateway; cod: Gateway;
};
type Cj = { enabled: boolean; auto_sync: boolean; sync_interval_hours: number; last_sync_at: string | null };

const DEFAULT_GATEWAYS: Gateways = {
  stripe: { enabled: false }, paypal: { enabled: false }, apple_pay: { enabled: false },
  google_pay: { enabled: false }, bank_transfer: { enabled: false }, cod: { enabled: false },
};
const DEFAULT_CJ: Cj = { enabled: false, auto_sync: false, sync_interval_hours: 6, last_sync_at: null };

const SECTIONS = [
  "general", "branding", "payments", "integrations", "tax", "shipping",
  "email", "notifications", "security", "seo",
] as const;

function SettingsPage() {
  const [gateways, setGateways] = useState<Gateways>(DEFAULT_GATEWAYS);
  const [cj, setCj] = useState<Cj>(DEFAULT_CJ);
  const [loading, setLoading] = useState(true);
  const [savingGw, setSavingGw] = useState(false);
  const [savingCj, setSavingCj] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("key,value").in("key", ["payment_gateways", "cj_dropshipping"]);
      (data ?? []).forEach((row) => {
        if (row.key === "payment_gateways") setGateways({ ...DEFAULT_GATEWAYS, ...(row.value as Partial<Gateways>) });
        if (row.key === "cj_dropshipping") setCj({ ...DEFAULT_CJ, ...(row.value as Partial<Cj>) });
      });
      setLoading(false);
    })();
  }, []);

  async function saveGateways() {
    setSavingGw(true);
    const { error } = await supabase.from("site_settings").upsert({ key: "payment_gateways", value: gateways });
    setSavingGw(false);
    if (error) return toast.error(error.message);
    toast.success("Payment gateways saved");
  }
  async function saveCj() {
    setSavingCj(true);
    const { error } = await supabase.from("site_settings").upsert({ key: "cj_dropshipping", value: cj });
    setSavingCj(false);
    if (error) return toast.error(error.message);
    toast.success("CJ Dropshipping settings saved");
  }

  return (
    <PageShell title="Settings" description="Configure your store." breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Settings" }]}>
      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap h-auto">
          {SECTIONS.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="general">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">General</h3>
            <Field id="site-name" label="Site name" defaultValue="SentryHaus" />
            <Field id="contact-email" label="Contact email" type="email" defaultValue="hello@sentryhaus.com" />
            <div className="space-y-1.5"><Label htmlFor="tag">Tagline</Label><Textarea id="tag" defaultValue="Premium smart home security." /></div>
            <Button>Save changes</Button>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">Branding</h3>
            <Field id="logo" label="Logo URL" />
            <Field id="favicon" label="Favicon URL" />
            <Field id="primary" label="Primary color (HSL)" />
            <Button>Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">Payment gateways</h3>
            <p className="text-sm text-muted-foreground">Enable or disable providers available at checkout.</p>
            {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : (
              <>
                {(Object.keys(DEFAULT_GATEWAYS) as (keyof Gateways)[]).map((k) => (
                  <div key={k} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label className="capitalize">{k.replace("_", " ")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {k === "stripe" && "Cards, Apple/Google Pay via Stripe."}
                        {k === "paypal" && "PayPal Checkout & PayPal Credit."}
                        {k === "apple_pay" && "Apple Pay (also available via Stripe)."}
                        {k === "google_pay" && "Google Pay (also available via Stripe)."}
                        {k === "bank_transfer" && "Manual bank transfer with reference."}
                        {k === "cod" && "Cash on delivery (regional availability)."}
                      </p>
                    </div>
                    <Switch checked={gateways[k].enabled} onCheckedChange={(v) => setGateways({ ...gateways, [k]: { enabled: v } })} />
                  </div>
                ))}
                <Button onClick={saveGateways} disabled={savingGw}>
                  {savingGw && <Loader2 className="size-4 animate-spin" />} Save
                </Button>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">CJ Dropshipping</h3>
            <p className="text-sm text-muted-foreground">
              Configure the CJ Dropshipping supplier link. API credentials (<code>CJ_API_EMAIL</code>, <code>CJ_API_KEY</code>) are stored as server secrets, never in the browser.
            </p>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><Label>Enable integration</Label><p className="text-xs text-muted-foreground">Requires API secrets configured.</p></div>
              <Switch checked={cj.enabled} onCheckedChange={(v) => setCj({ ...cj, enabled: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><Label>Auto sync</Label><p className="text-xs text-muted-foreground">Periodically sync inventory and orders.</p></div>
              <Switch checked={cj.auto_sync} onCheckedChange={(v) => setCj({ ...cj, auto_sync: v })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cj-interval">Sync interval (hours)</Label>
              <Input id="cj-interval" type="number" min={1} max={168} value={cj.sync_interval_hours}
                onChange={(e) => setCj({ ...cj, sync_interval_hours: Number(e.target.value) || 6 })} />
            </div>
            <p className="text-xs text-muted-foreground">Last sync: {cj.last_sync_at ? new Date(cj.last_sync_at).toLocaleString() : "never"}</p>
            <Button onClick={saveCj} disabled={savingCj}>
              {savingCj && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">Tax</h3>
            <Field id="taxrate" label="Default tax rate (%)" type="number" defaultValue="8.5" />
            <Toggle label="Prices include tax" />
            <Button>Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="shipping">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">Shipping</h3>
            <Field id="free-thr" label="Free shipping threshold ($)" type="number" defaultValue="100" />
            <Field id="flat" label="Flat rate ($)" type="number" defaultValue="8.99" />
            <Button>Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">Email</h3>
            <Field id="sender" label="Sender name" defaultValue="SentryHaus" />
            <Field id="sender-email" label="Sender email" defaultValue="no-reply@sentryhaus.com" />
            <Button>Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">Security</h3>
            <Toggle label="Require 2FA for admin accounts" />
            <Toggle label="Block sign-ups from disposable emails" defaultChecked />
            <Toggle label="Leaked-password protection" defaultChecked />
            <Button>Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">Notifications</h3>
            <Toggle label="New order email" defaultChecked />
            <Toggle label="Low stock alerts" defaultChecked />
            <Toggle label="New review pending" />
            <Button>Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card className="p-6 space-y-4 max-w-2xl">
            <h3 className="font-semibold">SEO</h3>
            <Field id="seo-title" label="Default meta title" defaultValue="SentryHaus — Premium Smart Home Security" />
            <div className="space-y-1.5"><Label htmlFor="seo-desc">Default meta description</Label>
              <Textarea id="seo-desc" defaultValue="Studio-grade smart cameras, doorbells, locks, and sensors." /></div>
            <Field id="seo-og" label="Default OG image URL" />
            <Button>Save</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function Field({ id, label, ...rest }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...rest} />
    </div>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label>{label}</Label>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}