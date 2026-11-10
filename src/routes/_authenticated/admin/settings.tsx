import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, ImageField, SaveBar, useContent } from "@/components/admin/content-fields";
import { mergeBrand, type BrandContent } from "@/lib/store/content";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { value: b, setValue, save, saving } = useContent<BrandContent>("brand", mergeBrand);
  const set = (patch: Partial<BrandContent>) => b && setValue({ ...b, ...patch });

  return (
    <PageShell
      title="Settings"
      description="Everything here changes the live website as soon as you press Save."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Settings" }]}
    >
      {!b ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Tabs defaultValue="brand">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="brand">Store name and logo</TabsTrigger>
            <TabsTrigger value="social">Social media</TabsTrigger>
            <TabsTrigger value="seo">Google search</TabsTrigger>
            <TabsTrigger value="more">Other settings</TabsTrigger>
          </TabsList>

          <TabsContent value="brand" className="space-y-4 pt-4">
            <Card className="max-w-2xl space-y-4 p-5">
              <Field label="Store name" hint="Shown in the header, the footer and the browser tab.">
                <Input value={b.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field
                label="Logo"
                hint="Optional. If you upload a logo it replaces the name in the header and footer."
              >
                <ImageField value={b.logo} onChange={(logo) => set({ logo })} folder="brand" />
              </Field>
              <Field label="Browser tab icon (favicon)" hint="A small square image, for example 128 × 128.">
                <ImageField value={b.favicon} onChange={(favicon) => set({ favicon })} folder="brand" />
              </Field>
            </Card>
            <SaveBar onSave={save} saving={saving} />
          </TabsContent>

          <TabsContent value="social" className="space-y-4 pt-4">
            <Card className="max-w-2xl space-y-4 p-5">
              <p className="text-xs text-muted-foreground">
                Paste the full link to each page. An icon appears in the website footer only for the links you fill in.
              </p>
              <Field label="Instagram">
                <Input value={b.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="https://instagram.com/yourpage" />
              </Field>
              <Field label="Facebook">
                <Input value={b.facebook} onChange={(e) => set({ facebook: e.target.value })} placeholder="https://facebook.com/yourpage" />
              </Field>
              <Field label="X (Twitter)">
                <Input value={b.x} onChange={(e) => set({ x: e.target.value })} placeholder="https://x.com/yourpage" />
              </Field>
              <Field label="YouTube">
                <Input value={b.youtube} onChange={(e) => set({ youtube: e.target.value })} placeholder="https://youtube.com/@yourchannel" />
              </Field>
            </Card>
            <SaveBar onSave={save} saving={saving} />
          </TabsContent>

          <TabsContent value="seo" className="space-y-4 pt-4">
            <Card className="max-w-2xl space-y-4 p-5">
              <Field label="Homepage title" hint="What Google and the browser tab show for your homepage.">
                <Input value={b.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} />
              </Field>
              <Field label="Homepage description" hint="One or two sentences under the title in Google results.">
                <Textarea rows={3} value={b.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} />
              </Field>
              <Field label="Sharing picture" hint="Shown when your link is shared on WhatsApp, Facebook, etc.">
                <ImageField value={b.ogImage} onChange={(ogImage) => set({ ogImage })} folder="brand" />
              </Field>
            </Card>
            <SaveBar onSave={save} saving={saving} />
          </TabsContent>

          <TabsContent value="more" className="pt-4">
            <Card className="max-w-2xl space-y-3 p-5 text-sm">
              <p>
                <Link to="/admin/shipping" className="font-medium underline">Delivery fees</Link>: delivery price per
                governorate, free delivery amount and the cash-on-delivery limit.
              </p>
              <p>
                <Link to="/admin/homepage" className="font-medium underline">Website content</Link>: homepage, About page,
                Contact page and the top bar message.
              </p>
              <p>
                <Link to="/admin/categories" className="font-medium underline">Categories</Link>,{" "}
                <Link to="/admin/suppliers" className="font-medium underline">Suppliers</Link> and{" "}
                <Link to="/admin/users" className="font-medium underline">Users</Link> have their own pages.
              </p>
              <p className="text-muted-foreground">
                Payment is cash on delivery only. Order emails are sent from your Rivvo Gmail address.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}
