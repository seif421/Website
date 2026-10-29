import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/email-templates")({ component: EmailTemplatesPage });

const DEFAULTS = [
  { slug: "welcome", name: "Welcome Email", subject: "Welcome to SentryHaus", body_html: "<h1>Welcome, {{name}}!</h1><p>Your account is ready.</p>" },
  { slug: "order_confirmation", name: "Order Confirmation", subject: "Order {{order_number}} confirmed", body_html: "<h1>Thanks for your order</h1><p>Order {{order_number}} — {{total}}.</p>" },
  { slug: "shipping_confirmation", name: "Shipping Confirmation", subject: "Your order has shipped", body_html: "<p>Track: {{tracking_number}}</p>" },
  { slug: "delivery_confirmation", name: "Delivery Confirmation", subject: "Delivered", body_html: "<p>Your order was delivered.</p>" },
  { slug: "password_reset", name: "Password Reset", subject: "Reset your password", body_html: "<a href=\"{{link}}\">Reset password</a>" },
  { slug: "refund_confirmation", name: "Refund Confirmation", subject: "Refund processed", body_html: "<p>{{amount}} refunded to your account.</p>" },
  { slug: "newsletter", name: "Newsletter", subject: "News from SentryHaus", body_html: "<p>Hello subscriber!</p>" },
];

type T = { id?: string; slug: string; name: string; subject: string; body_html: string; body_text: string | null; is_active: boolean };

function EmailTemplatesPage() {
  const [rows, setRows] = useState<T[]>([]);
  const [current, setCurrent] = useState<T | null>(null);
  async function load() {
    const { data } = await supabase.from("email_templates").select("*").order("slug");
    const existing = ((data ?? []) as T[]);
    const merged = DEFAULTS.map((d) => existing.find((e) => e.slug === d.slug) ?? { ...d, body_text: null, is_active: true });
    setRows(merged);
    if (!current) setCurrent(merged[0] ?? null);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  async function save() {
    if (!current) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...current, updated_by: user?.id ?? null };
    const { error } = current.id
      ? await supabase.from("email_templates").update(payload as never).eq("id", current.id)
      : await supabase.from("email_templates").insert(payload as never);
    if (error) return toast.error(error.message);
    toast.success("Template saved"); load();
  }
  return (
    <PageShell title="Email Templates" description="Transactional and marketing email templates."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Email Templates" }]}
      actions={current && <Button onClick={save}><Save className="size-4" /> Save</Button>}>
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-2 lg:col-span-1">
          {rows.map((t) => (
            <button key={t.slug} onClick={() => setCurrent(t)} className={`w-full text-left rounded-md px-3 py-2 text-sm ${current?.slug === t.slug ? "bg-brand/10 font-medium" : "hover:bg-muted/40"}`}>
              {t.name}<p className="text-[10px] text-muted-foreground">{t.slug}</p>
            </button>
          ))}
        </Card>
        {current && (
          <Card className="p-4 lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <div><Label>Name</Label><Input value={current.name} onChange={(e) => setCurrent({ ...current, name: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={current.is_active} onCheckedChange={(v) => setCurrent({ ...current, is_active: v })} /> Active</div>
            </div>
            <div><Label>Subject</Label><Input value={current.subject} onChange={(e) => setCurrent({ ...current, subject: e.target.value })} /></div>
            <div><Label>Body (HTML)</Label><Textarea rows={12} value={current.body_html} onChange={(e) => setCurrent({ ...current, body_html: e.target.value })} className="font-mono text-xs" /></div>
            <div><Label>Plain text (optional)</Label><Textarea rows={4} value={current.body_text ?? ""} onChange={(e) => setCurrent({ ...current, body_text: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Variables like {"{{name}}"}, {"{{order_number}}"}, {"{{tracking_number}}"} are replaced when sent.</p>
          </Card>
        )}
      </div>
    </PageShell>
  );
}