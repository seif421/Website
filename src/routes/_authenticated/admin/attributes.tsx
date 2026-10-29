import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, Plus, Pencil, Trash2, Search, X, Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { slugify, logAdminActivity } from "@/lib/admin/products-helpers";

export const Route = createFileRoute("/_authenticated/admin/attributes")({
  component: AttributesPage,
});

type AttrType = "text" | "number" | "boolean" | "select" | "color";
type Attribute = {
  id: string; name: string; slug: string;
  type: AttrType; unit: string | null;
  options: string[];
};

type FormState = Omit<Attribute, "id"> & { id?: string; optionsInput: string };
const empty: FormState = { name: "", slug: "", type: "text", unit: "", options: [], optionsInput: "" };

const TYPES: { value: AttrType; label: string; description: string }[] = [
  { value: "text", label: "Text", description: "Free-form text (e.g. Material: Aluminum)" },
  { value: "number", label: "Number", description: "Numeric (e.g. Weight: 2.5)" },
  { value: "boolean", label: "Yes/No", description: "True/False (e.g. Waterproof)" },
  { value: "select", label: "Select", description: "Pick one of a fixed set (e.g. Color: Red/Blue/Black)" },
  { value: "color", label: "Color", description: "Named color with optional hex" },
];

function AttributesPage() {
  const [rows, setRows] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; form: FormState }>({ open: false, form: empty });
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Attribute | null>(null);
  const [variantGen, setVariantGen] = useState<null | { productId: string; sets: { attr: Attribute; picks: Set<string> }[] }>(null);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string | null; price: number | null }[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("product_attribute_defs")
      .select("id,name,slug,type,unit,options").order("name");
    if (error) toast.error("Failed to load", { description: error.message });
    setRows(((data ?? []) as any[]).map((r) => ({
      ...r,
      type: r.type as AttrType,
      options: Array.isArray(r.options) ? (r.options as string[]) : [],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((a) => {
    const q = search.trim().toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q);
  });

  const openNew = () => setDialog({ open: true, form: empty });
  const openEdit = (a: Attribute) => setDialog({ open: true, form: { ...a, optionsInput: "" } });

  const addOption = () => {
    const v = dialog.form.optionsInput.trim();
    if (!v) return;
    if (dialog.form.options.includes(v)) return;
    setDialog((d) => ({ ...d, form: { ...d.form, options: [...d.form.options, v], optionsInput: "" } }));
  };

  const save = async () => {
    const f = dialog.form;
    if (!f.name.trim()) return toast.error("Name is required");
    const slug = (f.slug || slugify(f.name)).trim();
    setSaving(true);
    try {
      const payload = {
        name: f.name.trim(), slug, type: f.type,
        unit: f.unit || null,
        options: (f.type === "select" || f.type === "color") ? f.options : [],
      };
      if (f.id) {
        const { error } = await supabase.from("product_attribute_defs").update(payload as never).eq("id", f.id);
        if (error) throw error;
        await logAdminActivity("updated", "attribute", f.id);
        toast.success("Attribute updated");
      } else {
        const { data, error } = await supabase.from("product_attribute_defs").insert(payload as never).select("id").single();
        if (error) throw error;
        await logAdminActivity("created", "attribute", data!.id);
        toast.success("Attribute created");
      }
      setDialog({ open: false, form: empty });
      load();
    } catch (e: any) { toast.error("Save failed", { description: e.message }); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("product_attribute_defs").delete().eq("id", toDelete.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    await logAdminActivity("deleted", "attribute", toDelete.id);
    toast.success("Attribute deleted");
    setToDelete(null);
    load();
  };

  const openVariantGen = async () => {
    const selectable = rows.filter((r) => r.type === "select" || r.type === "color");
    if (selectable.length === 0) return toast.info("Create at least one Select or Color attribute first.");
    const { data } = await supabase.from("products").select("id,name,sku,price").is("deleted_at", null).order("name").limit(200);
    setProducts((data ?? []) as any);
    setVariantGen({ productId: "", sets: selectable.map((a) => ({ attr: a, picks: new Set() })) });
  };

  const togglePick = (idx: number, opt: string) => {
    setVariantGen((v) => {
      if (!v) return v;
      const sets = v.sets.map((s, i) => {
        if (i !== idx) return s;
        const picks = new Set(s.picks);
        picks.has(opt) ? picks.delete(opt) : picks.add(opt);
        return { ...s, picks };
      });
      return { ...v, sets };
    });
  };

  const runGeneration = async () => {
    if (!variantGen || !variantGen.productId) return toast.error("Pick a product");
    const active = variantGen.sets.filter((s) => s.picks.size > 0);
    if (active.length === 0) return toast.error("Pick at least one attribute value");
    // Cartesian product
    const combos: Record<string, string>[] = [{}];
    for (const s of active) {
      const next: Record<string, string>[] = [];
      for (const c of combos) {
        for (const p of Array.from(s.picks)) {
          next.push({ ...c, [s.attr.slug]: p });
        }
      }
      combos.splice(0, combos.length, ...next);
    }
    if (combos.length > 100) return toast.error("Too many combinations (max 100)");
    const rows = combos.map((c, i) => ({
      product_id: variantGen.productId,
      name: Object.values(c).join(" / "),
      options: c,
      sku: null, price: null, sale_price: null, stock: 0,
      is_active: true, position: i,
    }));
    const { error } = await supabase.from("product_variants").insert(rows as never);
    if (error) return toast.error("Generation failed", { description: error.message });
    await logAdminActivity("variants_generated", "product", variantGen.productId, { count: rows.length });
    toast.success(`Generated ${rows.length} variant(s)`);
    setVariantGen(null);
  };

  return (
    <PageShell
      title="Attributes"
      description="Reusable product attributes and automatic variant generation."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Attributes" }]}
      actions={<>
        <Button variant="outline" onClick={openVariantGen}><Sparkles className="size-4" /> Generate variants</Button>
        <Button onClick={openNew}><Plus className="size-4" /> New attribute</Button>
      </>}
    >
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search attributes" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No attributes yet. Create reusable specs like Color, Size, WiFi, or Waterproof.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{a.name}</h3>
                    <Badge variant="outline">{TYPES.find((t) => t.value === a.type)?.label ?? a.type}</Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">/{a.slug}{a.unit ? ` · ${a.unit}` : ""}</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setToDelete(a)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
              {a.options.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {a.options.slice(0, 8).map((o) => <Badge key={o} variant="secondary">{o}</Badge>)}
                  {a.options.length > 8 && <Badge variant="outline">+{a.options.length - 8}</Badge>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{dialog.form.id ? "Edit attribute" : "New attribute"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Name *</Label>
                <Input value={dialog.form.name}
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value, slug: d.form.slug || slugify(e.target.value) } }))} /></div>
              <div className="space-y-1.5"><Label>Slug *</Label>
                <Input value={dialog.form.slug} onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, slug: slugify(e.target.value) } }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={dialog.form.type} onValueChange={(v) => setDialog((d) => ({ ...d, form: { ...d.form, type: v as AttrType } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{TYPES.find((t) => t.value === dialog.form.type)?.description}</p>
              </div>
              <div className="space-y-1.5"><Label>Unit</Label>
                <Input placeholder="e.g. kg, GHz, °C" value={dialog.form.unit ?? ""}
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, unit: e.target.value } }))} /></div>
            </div>
            {(dialog.form.type === "select" || dialog.form.type === "color") && (
              <div className="space-y-1.5">
                <Label>Values</Label>
                <div className="flex flex-wrap gap-1">
                  {dialog.form.options.map((o) => (
                    <Badge key={o} variant="secondary" className="gap-1">{o}
                      <button type="button" onClick={() => setDialog((d) => ({ ...d, form: { ...d.form, options: d.form.options.filter((x) => x !== o) } }))}>
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={dialog.form.optionsInput}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, optionsInput: e.target.value } }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                    placeholder="Add value and press Enter" />
                  <Button type="button" variant="outline" onClick={addOption}>Add</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, form: empty })}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : null} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!variantGen} onOpenChange={(o) => !o && setVariantGen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate product variants</DialogTitle>
            <DialogDescription>
              Pick a product and the attribute values to combine. One variant is created for every combination.
            </DialogDescription>
          </DialogHeader>
          {variantGen && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Product</Label>
                <Select value={variantGen.productId} onValueChange={(v) => setVariantGen({ ...variantGen, productId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose a product" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` · ${p.sku}` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {variantGen.sets.map((s, idx) => (
                <div key={s.attr.id} className="space-y-1.5">
                  <Label>{s.attr.name}</Label>
                  <div className="flex flex-wrap gap-1">
                    {s.attr.options.map((o) => {
                      const on = s.picks.has(o);
                      return (
                        <button type="button" key={o} onClick={() => togglePick(idx, o)}
                          className={"rounded-md border px-2 py-1 text-xs transition " + (on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                          {o}
                        </button>
                      );
                    })}
                    {s.attr.options.length === 0 && <span className="text-xs text-muted-foreground">No values defined</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantGen(null)}>Cancel</Button>
            <Button onClick={runGeneration}><Sparkles className="size-4" /> Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing variants keep their stored value; the attribute definition is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}