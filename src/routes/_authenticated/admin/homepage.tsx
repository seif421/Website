import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { uploadAsset } from "@/lib/admin/products-helpers";
import { imageUrl } from "@/lib/store/format";
import {
  mergeAbout, mergeContact, mergeGeneral, mergeHome,
  type AboutContent, type ContactContent, type GeneralContent, type HomeContent,
} from "@/lib/store/content";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: WebsiteContentPage,
});

// The table is new, so the generated types do not list it yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("site_content");

function useContent<T>(key: string, merge: (raw: unknown) => T) {
  const [value, setValue] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await table().select("value").eq("key", key).maybeSingle();
      if (live) setValue(merge(data?.value));
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = async () => {
    setSaving(true);
    const { error } = await table().upsert({ key, value }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error("Could not save", { description: error.message });
    toast.success("Saved. The website now shows your changes.");
  };
  return { value, setValue, save, saving };
}

type Cat = { slug: string; name: string };

function WebsiteContentPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  useEffect(() => {
    supabase.from("categories").select("slug,name").eq("is_active", true).is("deleted_at", null)
      .order("sort_order").then(({ data }) => setCats((data ?? []) as Cat[]));
  }, []);
  return (
    <PageShell
      title="Website content"
      description="Change what customers see on the homepage, About page and Contact page. Categories and their pictures are edited in Categories."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Website content" }]}
    >
      <Tabs defaultValue="home">
        <TabsList>
          <TabsTrigger value="home">Homepage</TabsTrigger>
          <TabsTrigger value="about">About page</TabsTrigger>
          <TabsTrigger value="contact">Contact page</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
        <TabsContent value="home" className="pt-4"><HomeTab cats={cats} /></TabsContent>
        <TabsContent value="about" className="pt-4"><AboutTab /></TabsContent>
        <TabsContent value="contact" className="pt-4"><ContactTab /></TabsContent>
        <TabsContent value="general" className="pt-4"><GeneralTab /></TabsContent>
      </Tabs>
    </PageShell>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />} Save changes
      </Button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ImageField({ value, onChange, folder = "site" }: { value: string; onChange: (v: string) => void; folder?: string }) {
  const [busy, setBusy] = useState(false);
  const url = imageUrl(value);
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("Image is too big. Maximum 4 MB.");
    setBusy(true);
    try { onChange(await uploadAsset(file, folder)); }
    catch (e) { toast.error("Upload failed", { description: e instanceof Error ? e.message : undefined }); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-3">
      {url && (
        <div className="relative">
          <img src={url} alt="" className="h-24 max-w-48 rounded-lg border object-cover" />
          <button type="button" onClick={() => onChange("")} className="absolute -right-1 -top-1 rounded-full bg-background p-1 shadow" aria-label="Remove image">
            <X className="size-3" />
          </button>
        </div>
      )}
      <label className="flex h-24 w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:bg-muted">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        Upload image
        <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
    </div>
  );
}

function LinkField({ value, onChange, cats }: { value: string; onChange: (v: string) => void; cats: Cat[] }) {
  const presets: [string, string][] = [
    ["/shop", "All products"],
    ["/shop?sort=newest", "New arrivals"],
    ["/shop?sort=price-asc", "Lowest prices"],
    ["/shop?sort=rating", "Best rated"],
    ["/about", "About page"],
    ["/contact", "Contact page"],
    ...cats.map((c): [string, string] => [`/shop?category=${c.slug}`, `Category: ${c.name}`]),
  ];
  const known = presets.some(([v]) => v === value);
  return (
    <div className="space-y-2">
      <Select value={known ? value : "custom"} onValueChange={(v) => v !== "custom" && onChange(v)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {presets.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          <SelectItem value="custom">Custom link…</SelectItem>
        </SelectContent>
      </Select>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/shop?category=watches or https://…" />
    </div>
  );
}

function SectionRow({ label, s, onChange }: { label: string; s: { show: boolean; title: string }; onChange: (v: { show: boolean; title: string }) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Switch checked={s.show} onCheckedChange={(show) => onChange({ ...s, show })} aria-label={`Show ${label}`} />
      <span className="w-40 text-sm font-medium">{label}</span>
      <Input className="max-w-sm flex-1" value={s.title} onChange={(e) => onChange({ ...s, title: e.target.value })} placeholder="Heading" />
    </div>
  );
}

const ICONS = ["truck", "rotate", "phone", "headphones", "shield", "gift", "star", "heart", "clock"];

function HomeTab({ cats }: { cats: Cat[] }) {
  const { value: h, setValue, save, saving } = useContent<HomeContent>("home", mergeHome);
  if (!h) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  const set = (patch: Partial<HomeContent>) => setValue({ ...h, ...patch });
  const sec = (k: keyof HomeContent["sections"]) => (v: { show: boolean; title: string }) =>
    set({ sections: { ...h.sections, [k]: v } });
  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold">Main banner</p>
        <Field label="Banner image" hint="Wide image, about 1600 × 900. If empty, the Rivvo default is shown.">
          <ImageField value={h.hero.image} onChange={(image) => set({ hero: { ...h.hero, image } })} />
        </Field>
        <Field label="Where the banner leads">
          <LinkField value={h.hero.link} cats={cats} onChange={(link) => set({ hero: { ...h.hero, link } })} />
        </Field>
        <Field label="Banner description (for screen readers)">
          <Input value={h.hero.alt} onChange={(e) => set({ hero: { ...h.hero, alt: e.target.value } })} />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold">Two boxes next to the banner</p>
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => {
            const p = h.promos[i] ?? { title: "", text: "", link: "/shop" };
            const upd = (patch: Partial<typeof p>) => {
              const next = [0, 1].map((j) => (j === i ? { ...p, ...patch } : (h.promos[j] ?? { title: "", text: "", link: "/shop" })));
              set({ promos: next });
            };
            return (
              <div key={i} className="space-y-3 rounded-lg border p-4">
                <Field label="Title"><Input value={p.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
                <Field label="Text"><Input value={p.text} onChange={(e) => upd({ text: e.target.value })} /></Field>
                <Field label="Link"><LinkField value={p.link} cats={cats} onChange={(link) => upd({ link })} /></Field>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold">Sections on the homepage</p>
        <p className="text-xs text-muted-foreground">Turn a section off to hide it. Product rows hide themselves when there are no products.</p>
        <SectionRow label="Categories" s={h.sections.categories} onChange={sec("categories")} />
        <SectionRow label="Deals" s={h.sections.deals} onChange={sec("deals")} />
        <SectionRow label="Best sellers" s={h.sections.bestSellers} onChange={sec("bestSellers")} />
        <SectionRow label="New arrivals" s={h.sections.newArrivals} onChange={sec("newArrivals")} />
        <SectionRow label="Why shop with us" s={h.sections.whyUs} onChange={sec("whyUs")} />
        <SectionRow label="Questions (FAQ)" s={h.sections.faq} onChange={sec("faq")} />
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Why shop with us (small boxes)</p>
          <Button size="sm" variant="outline" onClick={() => set({ whyUs: [...h.whyUs, { icon: "star", title: "", body: "" }] })}>
            <Plus className="mr-1 size-4" /> Add
          </Button>
        </div>
        {h.whyUs.map((w, i) => {
          const upd = (patch: Partial<typeof w>) => set({ whyUs: h.whyUs.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[140px_1fr_2fr_auto]">
              <Select value={w.icon} onValueChange={(icon) => upd({ icon })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ICONS.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={w.title} onChange={(e) => upd({ title: e.target.value })} placeholder="Title" />
              <Input value={w.body} onChange={(e) => upd({ body: e.target.value })} placeholder="Short text" />
              <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => set({ whyUs: h.whyUs.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Questions and answers (FAQ)</p>
          <Button size="sm" variant="outline" onClick={() => set({ faq: [...h.faq, { q: "", a: "" }] })}>
            <Plus className="mr-1 size-4" /> Add
          </Button>
        </div>
        {h.faq.map((f, i) => {
          const upd = (patch: Partial<typeof f>) => set({ faq: h.faq.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex gap-2">
                <Input value={f.q} onChange={(e) => upd({ q: e.target.value })} placeholder="Question" />
                <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => set({ faq: h.faq.filter((_, j) => j !== i) })}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Textarea value={f.a} onChange={(e) => upd({ a: e.target.value })} placeholder="Answer" rows={2} />
            </div>
          );
        })}
      </Card>
      <SaveBar onSave={save} saving={saving} />
    </div>
  );
}

function AboutTab() {
  const { value: a, setValue, save, saving } = useContent<AboutContent>("about", mergeAbout);
  if (!a) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  const set = (patch: Partial<AboutContent>) => setValue({ ...a, ...patch });
  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <Field label="Page title"><Input value={a.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Introduction"><Textarea rows={3} value={a.intro} onChange={(e) => set({ intro: e.target.value })} /></Field>
        <Field label="Picture (optional)"><ImageField value={a.image} onChange={(image) => set({ image })} /></Field>
      </Card>
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Sections</p>
          <Button size="sm" variant="outline" onClick={() => set({ sections: [...a.sections, { heading: "", body: "" }] })}>
            <Plus className="mr-1 size-4" /> Add section
          </Button>
        </div>
        {a.sections.map((s, i) => {
          const upd = (patch: Partial<typeof s>) => set({ sections: a.sections.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex gap-2">
                <Input value={s.heading} onChange={(e) => upd({ heading: e.target.value })} placeholder="Heading" />
                <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => set({ sections: a.sections.filter((_, j) => j !== i) })}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Textarea rows={4} value={s.body} onChange={(e) => upd({ body: e.target.value })} placeholder="Text" />
            </div>
          );
        })}
      </Card>
      <SaveBar onSave={save} saving={saving} />
    </div>
  );
}

function ContactTab() {
  const { value: c, setValue, save, saving } = useContent<ContactContent>("contact", mergeContact);
  if (!c) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  const set = (patch: Partial<ContactContent>) => setValue({ ...c, ...patch });
  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <Field label="Page title"><Input value={c.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Introduction"><Textarea rows={3} value={c.intro} onChange={(e) => set({ intro: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email shown to customers" hint="Leave empty to hide.">
            <Input value={c.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="WhatsApp number" hint="With country code, e.g. +201010540342. Empty hides it.">
            <Input value={c.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
          </Field>
          <Field label="Phone number"><Input value={c.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="Working hours"><Input value={c.hours} onChange={(e) => set({ hours: e.target.value })} placeholder="Every day, 10 am to 8 pm" /></Field>
        </div>
        <Field label="Address (optional)"><Textarea rows={2} value={c.address} onChange={(e) => set({ address: e.target.value })} /></Field>
      </Card>
      <p className="text-xs text-muted-foreground">Messages customers send from the form arrive in Admin &gt; Support.</p>
      <SaveBar onSave={save} saving={saving} />
    </div>
  );
}

function GeneralTab() {
  const { value: g, setValue, save, saving } = useContent<GeneralContent>("general", mergeGeneral);
  if (!g) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  const set = (patch: Partial<GeneralContent>) => setValue({ ...g, ...patch });
  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <Field label="Top bar message" hint="The thin bar at the very top of every page. Empty hides the bar.">
          <Input value={g.announcement} onChange={(e) => set({ announcement: e.target.value })} />
        </Field>
        <Field label="Search box text"><Input value={g.searchPlaceholder} onChange={(e) => set({ searchPlaceholder: e.target.value })} /></Field>
        <Field label="Footer description"><Textarea rows={2} value={g.footerTagline} onChange={(e) => set({ footerTagline: e.target.value })} /></Field>
      </Card>
      <SaveBar onSave={save} saving={saving} />
    </div>
  );
}
