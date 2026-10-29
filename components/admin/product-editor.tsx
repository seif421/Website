import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Save, Trash2, ImagePlus, X, GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { ObjectImg } from "@/hooks/use-object-src";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_OPTIONS, slugify, profitMargin, uploadProductImage, logActivity,
  type ProductStatus,
} from "@/lib/admin/products-helpers";

type FormState = {
  name: string; slug: string; sku: string; barcode: string; model_number: string;
  manufacturer: string; status: ProductStatus;
  price: string; sale_price: string; compare_at_price: string; cost: string;
  tax_class: string; weight: string;
  dim_length: string; dim_width: string; dim_height: string;
  country_of_origin: string; warranty: string; shipping_class: string;
  short_description: string; description: string;
  category_id: string; subcategory_id: string; brand_id: string;
  supplier_id: string; supplier_product_id: string; supplier_cost: string;
  supplier_stock: string; supplier_shipping_days: string; supplier_url: string; supplier_notes: string;
  is_featured: boolean; is_best_seller: boolean; is_new_arrival: boolean; is_trending: boolean;
  is_active: boolean; tags: string[];
  meta_title: string; meta_description: string; search_keywords: string;
  video_url: string; images: string[];
  scheduled_at: string;
  stock: string; low_stock_threshold: string; reserved: string; incoming: string;
  allow_backorder: boolean; allow_preorder: boolean;
  custom_fields: { key: string; value: string }[];
  attributes: { key: string; value: string }[];
};

type Variant = {
  id?: string; name: string; sku: string; price: string; sale_price: string;
  stock: string; image_url: string; is_active: boolean;
};

const initial: FormState = {
  name: "", slug: "", sku: "", barcode: "", model_number: "",
  manufacturer: "", status: "draft",
  price: "", sale_price: "", compare_at_price: "", cost: "",
  tax_class: "", weight: "", dim_length: "", dim_width: "", dim_height: "",
  country_of_origin: "", warranty: "", shipping_class: "",
  short_description: "", description: "",
  category_id: "", subcategory_id: "", brand_id: "",
  supplier_id: "", supplier_product_id: "", supplier_cost: "",
  supplier_stock: "", supplier_shipping_days: "", supplier_url: "", supplier_notes: "",
  is_featured: false, is_best_seller: false, is_new_arrival: false, is_trending: false,
  is_active: true, tags: [],
  meta_title: "", meta_description: "", search_keywords: "",
  video_url: "", images: [], scheduled_at: "",
  stock: "0", low_stock_threshold: "5", reserved: "0", incoming: "0",
  allow_backorder: false, allow_preorder: false,
  custom_fields: [], attributes: [],
};

export function ProductEditor({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const isNew = !productId;
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [removeVariantIds, setRemoveVariantIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    supabase.from("categories").select("id,name,parent_id").is("deleted_at", null).order("name")
      .then(({ data }) => setCategories(data ?? []));
    supabase.from("brands").select("id,name").is("deleted_at", null).order("name")
      .then(({ data }) => setBrands(data ?? []));
    supabase.from("suppliers").select("id,name").eq("is_active", true).order("name")
      .then(({ data }) => setSuppliers(data ?? []));
  }, []);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      const { data: p, error } = await supabase.from("products").select("*, inventory(*)").eq("id", productId).maybeSingle();
      if (error || !p) { toast.error("Product not found"); navigate({ to: "/admin/products" }); return; }
      const inv = (p as any).inventory?.[0];
      const dims = (p.dimensions ?? {}) as { length?: number; width?: number; height?: number };
      const attrEntries = Object.entries((p.attributes ?? {}) as Record<string, unknown>).map(([key, value]) => ({ key, value: String(value) }));
      const customEntries = Object.entries((p.custom_fields ?? {}) as Record<string, unknown>).map(([key, value]) => ({ key, value: String(value) }));
      setForm({
        name: p.name, slug: p.slug, sku: p.sku ?? "", barcode: p.barcode ?? "",
        model_number: p.model_number ?? "", manufacturer: p.manufacturer ?? "",
        status: (p.status ?? "draft") as ProductStatus,
        price: String(p.price ?? ""), sale_price: p.sale_price ? String(p.sale_price) : "",
        compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "",
        cost: p.cost ? String(p.cost) : "", tax_class: p.tax_class ?? "",
        weight: p.weight ? String(p.weight) : "",
        dim_length: dims.length ? String(dims.length) : "",
        dim_width: dims.width ? String(dims.width) : "",
        dim_height: dims.height ? String(dims.height) : "",
        country_of_origin: p.country_of_origin ?? "", warranty: p.warranty ?? "",
        shipping_class: p.shipping_class ?? "",
        short_description: p.short_description ?? "", description: p.description ?? "",
        category_id: p.category_id ?? "", subcategory_id: p.subcategory_id ?? "",
        brand_id: p.brand_id ?? "",
        supplier_id: p.supplier_id ?? "", supplier_product_id: p.supplier_product_id ?? "",
        supplier_cost: p.supplier_cost ? String(p.supplier_cost) : "",
        supplier_stock: p.supplier_stock != null ? String(p.supplier_stock) : "",
        supplier_shipping_days: p.supplier_shipping_days != null ? String(p.supplier_shipping_days) : "",
        supplier_url: p.supplier_url ?? "", supplier_notes: p.supplier_notes ?? "",
        is_featured: !!p.is_featured, is_best_seller: !!p.is_best_seller,
        is_new_arrival: !!p.is_new_arrival, is_trending: !!p.is_trending,
        is_active: p.is_active !== false, tags: p.tags ?? [],
        meta_title: p.meta_title ?? "", meta_description: p.meta_description ?? "",
        search_keywords: p.search_keywords ?? "", video_url: p.video_url ?? "",
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
        scheduled_at: p.scheduled_at ? p.scheduled_at.slice(0, 16) : "",
        stock: String(inv?.stock ?? 0), low_stock_threshold: String(inv?.low_stock_threshold ?? 5),
        reserved: String(inv?.reserved ?? 0), incoming: String(inv?.incoming ?? 0),
        allow_backorder: !!inv?.allow_backorder, allow_preorder: !!inv?.allow_preorder,
        custom_fields: customEntries, attributes: attrEntries,
      });
      const { data: vs } = await supabase.from("product_variants").select("*").eq("product_id", productId).order("position");
      setVariants((vs ?? []).map((v) => ({
        id: v.id, name: v.name, sku: v.sku ?? "",
        price: v.price != null ? String(v.price) : "",
        sale_price: v.sale_price != null ? String(v.sale_price) : "",
        stock: String(v.stock ?? 0),
        image_url: v.image_url ?? "", is_active: v.is_active !== false,
      })));
      setLoading(false);
    })();
  }, [productId, navigate]);

  const handleNameBlur = () => {
    if (!form.slug && form.name) update("slug", slugify(form.name));
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name} exceeds 8MB`); continue; }
        if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); continue; }
        urls.push(await uploadProductImage(f));
      }
      update("images", [...form.images, ...urls]);
    } catch (e: any) {
      toast.error("Upload failed", { description: e.message });
    } finally { setUploading(false); }
  };

  const moveImage = (from: number, to: number) => {
    const next = [...form.images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update("images", next);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) update("tags", [...form.tags, t]);
    setTagInput("");
  };

  const subcategories = categories.filter((c) => c.parent_id === form.category_id);

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required";
    if (form.name.length > 200) return "Name too long";
    if (!form.slug.trim()) return "Slug is required";
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return "Price must be a non-negative number";
    if (form.sale_price && Number(form.sale_price) > price) return "Sale price must be ≤ price";
    if (Number(form.stock) < 0) return "Stock cannot be negative";
    return null;
  };

  const buildPayload = () => {
    const dimensions: Record<string, number> = {};
    if (form.dim_length) dimensions.length = Number(form.dim_length);
    if (form.dim_width) dimensions.width = Number(form.dim_width);
    if (form.dim_height) dimensions.height = Number(form.dim_height);
    const attrObj = Object.fromEntries(form.attributes.filter((a) => a.key).map((a) => [a.key, a.value]));
    const customObj = Object.fromEntries(form.custom_fields.filter((a) => a.key).map((a) => [a.key, a.value]));
    return {
      name: form.name.trim(), slug: form.slug.trim() || slugify(form.name),
      sku: form.sku || null, barcode: form.barcode || null,
      model_number: form.model_number || null, manufacturer: form.manufacturer || null,
      status: form.status,
      price: Number(form.price || 0),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      cost: form.cost ? Number(form.cost) : null,
      tax_class: form.tax_class || null,
      weight: form.weight ? Number(form.weight) : null,
      dimensions,
      country_of_origin: form.country_of_origin || null,
      warranty: form.warranty || null, shipping_class: form.shipping_class || null,
      short_description: form.short_description || null, description: form.description || null,
      category_id: form.category_id || null, subcategory_id: form.subcategory_id || null,
      brand_id: form.brand_id || null,
      supplier_id: form.supplier_id || null,
      supplier_product_id: form.supplier_product_id || null,
      supplier_cost: form.supplier_cost ? Number(form.supplier_cost) : null,
      supplier_stock: form.supplier_stock ? Number(form.supplier_stock) : null,
      supplier_shipping_days: form.supplier_shipping_days ? Number(form.supplier_shipping_days) : null,
      supplier_url: form.supplier_url || null, supplier_notes: form.supplier_notes || null,
      is_featured: form.is_featured, is_best_seller: form.is_best_seller,
      is_new_arrival: form.is_new_arrival, is_trending: form.is_trending,
      is_active: form.is_active, tags: form.tags,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      search_keywords: form.search_keywords || null, video_url: form.video_url || null,
      images: form.images,
      attributes: attrObj, custom_fields: customObj,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      archived_at: form.status === "archived" ? new Date().toISOString() : null,
    };
  };

  const save = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const payload = buildPayload();
      let id = productId;
      if (isNew) {
        const { data, error } = await supabase.from("products").insert(payload as never).select("id").single();
        if (error) throw error;
        id = data!.id;
        await logActivity("created", id);
      } else {
        const { error } = await supabase.from("products").update(payload as never).eq("id", id!);
        if (error) throw error;
        await logActivity("updated", id!);
      }

      const invPayload = {
        product_id: id!,
        stock: Number(form.stock || 0),
        low_stock_threshold: Number(form.low_stock_threshold || 0),
        reserved: Number(form.reserved || 0),
        incoming: Number(form.incoming || 0),
        allow_backorder: form.allow_backorder,
        allow_preorder: form.allow_preorder,
      };
      const { error: invErr } = await supabase.from("inventory").upsert(invPayload as never, { onConflict: "product_id" });
      if (invErr) throw invErr;

      if (removeVariantIds.length) {
        await supabase.from("product_variants").delete().in("id", removeVariantIds);
      }
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const vp = {
          product_id: id!, name: v.name, sku: v.sku || null,
          price: v.price ? Number(v.price) : null,
          sale_price: v.sale_price ? Number(v.sale_price) : null,
          stock: Number(v.stock || 0), image_url: v.image_url || null,
          is_active: v.is_active, position: i,
        };
        if (v.id) await supabase.from("product_variants").update(vp as never).eq("id", v.id);
        else await supabase.from("product_variants").insert(vp as never);
      }

      toast.success(isNew ? "Product created" : "Product saved");
      if (isNew) navigate({ to: "/admin/products/$id", params: { id: id! } });
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!productId) return;
    const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString() } as never).eq("id", productId);
    if (error) return toast.error("Delete failed", { description: error.message });
    await logActivity("deleted", productId);
    toast.success("Product deleted");
    navigate({ to: "/admin/products" });
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  const margin = profitMargin(Number(form.price), Number(form.cost));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6 min-w-0">
        <Tabs defaultValue="general">
          <TabsList className="flex-wrap">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="supplier">Supplier</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card><CardContent className="space-y-4 pt-6">
              <Field label="Product name *"><Input value={form.name} onChange={(e) => update("name", e.target.value)} onBlur={handleNameBlur} maxLength={200} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="URL slug *"><Input value={form.slug} onChange={(e) => update("slug", slugify(e.target.value))} /></Field>
                <Field label="SKU"><Input value={form.sku} onChange={(e) => update("sku", e.target.value)} /></Field>
                <Field label="Barcode (UPC/EAN)"><Input value={form.barcode} onChange={(e) => update("barcode", e.target.value)} /></Field>
                <Field label="Model number"><Input value={form.model_number} onChange={(e) => update("model_number", e.target.value)} /></Field>
                <Field label="Manufacturer"><Input value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} /></Field>
                <Field label="Country of origin"><Input value={form.country_of_origin} onChange={(e) => update("country_of_origin", e.target.value)} /></Field>
              </div>
              <Field label="Short description"><Textarea rows={2} maxLength={500} value={form.short_description} onChange={(e) => update("short_description", e.target.value)} /></Field>
              <Field label="Long description"><Textarea rows={8} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <Card><CardContent className="pt-6 space-y-4">
              <Label>Gallery</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {form.images.map((url, i) => (
                  <div key={url + i} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    <ObjectImg value={url} alt="" className="size-full object-cover" />
                    {i === 0 && <Badge className="absolute left-1 top-1">Main</Badge>}
                    <button type="button" onClick={() => update("images", form.images.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-md bg-background/80 p-1 opacity-0 transition group-hover:opacity-100">
                      <X className="size-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      {i > 0 && <button type="button" onClick={() => moveImage(i, i - 1)} className="rounded bg-background/80 px-1 text-xs">←</button>}
                      {i < form.images.length - 1 && <button type="button" onClick={() => moveImage(i, i + 1)} className="rounded bg-background/80 px-1 text-xs">→</button>}
                    </div>
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background text-sm text-muted-foreground hover:bg-muted">
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                  <span>Upload</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">First image is the main image. Drag with arrows to reorder.</p>
              <Field label="Product video URL (YouTube, etc.)"><Input value={form.video_url} onChange={(e) => update("video_url", e.target.value)} placeholder="https://youtube.com/..." /></Field>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card><CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Price *"><Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => update("price", e.target.value)} /></Field>
                <Field label="Sale price"><Input type="number" step="0.01" min="0" value={form.sale_price} onChange={(e) => update("sale_price", e.target.value)} /></Field>
                <Field label="Compare-at price"><Input type="number" step="0.01" min="0" value={form.compare_at_price} onChange={(e) => update("compare_at_price", e.target.value)} /></Field>
                <Field label="Cost"><Input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => update("cost", e.target.value)} /></Field>
                <Field label="Tax class"><Input value={form.tax_class} onChange={(e) => update("tax_class", e.target.value)} placeholder="standard" /></Field>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="text-muted-foreground">Profit margin</div>
                  <div className="text-xl font-semibold">{margin.toFixed(1)}%</div>
                </div>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card><CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Stock"><Input type="number" min="0" value={form.stock} onChange={(e) => update("stock", e.target.value)} /></Field>
                <Field label="Low stock threshold"><Input type="number" min="0" value={form.low_stock_threshold} onChange={(e) => update("low_stock_threshold", e.target.value)} /></Field>
                <Field label="Reserved"><Input type="number" min="0" value={form.reserved} onChange={(e) => update("reserved", e.target.value)} /></Field>
                <Field label="Incoming"><Input type="number" min="0" value={form.incoming} onChange={(e) => update("incoming", e.target.value)} /></Field>
              </div>
              <div className="flex flex-wrap gap-6">
                <Toggle label="Allow backorder" checked={form.allow_backorder} onCheckedChange={(v) => update("allow_backorder", v)} />
                <Toggle label="Allow preorder" checked={form.allow_preorder} onCheckedChange={(v) => update("allow_preorder", v)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Available stock = stock − reserved = <strong>{Math.max(0, Number(form.stock || 0) - Number(form.reserved || 0))}</strong>
              </p>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4">
            <Card><CardContent className="pt-6 space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_120px_100px_100px_80px_40px]">
                  <Input placeholder="Variant name" value={v.name} onChange={(e) => setVariants((arr) => arr.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                  <Input placeholder="SKU" value={v.sku} onChange={(e) => setVariants((arr) => arr.map((x, idx) => idx === i ? { ...x, sku: e.target.value } : x))} />
                  <Input type="number" placeholder="Price" value={v.price} onChange={(e) => setVariants((arr) => arr.map((x, idx) => idx === i ? { ...x, price: e.target.value } : x))} />
                  <Input type="number" placeholder="Stock" value={v.stock} onChange={(e) => setVariants((arr) => arr.map((x, idx) => idx === i ? { ...x, stock: e.target.value } : x))} />
                  <div className="flex items-center"><Switch checked={v.is_active} onCheckedChange={(c) => setVariants((arr) => arr.map((x, idx) => idx === i ? { ...x, is_active: c } : x))} /></div>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (v.id) setRemoveVariantIds((r) => [...r, v.id!]);
                    setVariants((arr) => arr.filter((_, idx) => idx !== i));
                  }}><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setVariants((arr) => [...arr, { name: "", sku: "", price: "", sale_price: "", stock: "0", image_url: "", is_active: true }])}>
                <Plus className="size-4" /> Add variant
              </Button>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="attributes" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">Attributes</CardTitle></CardHeader><CardContent className="space-y-3">
              {form.attributes.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Name (e.g. WiFi)" value={a.key} onChange={(e) => update("attributes", form.attributes.map((x, idx) => idx === i ? { ...x, key: e.target.value } : x))} />
                  <Input placeholder="Value (e.g. 2.4/5 GHz)" value={a.value} onChange={(e) => update("attributes", form.attributes.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => update("attributes", form.attributes.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => update("attributes", [...form.attributes, { key: "", value: "" }])}><Plus className="size-4" /> Add attribute</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Custom fields</CardTitle></CardHeader><CardContent className="space-y-3">
              {form.custom_fields.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Field name" value={a.key} onChange={(e) => update("custom_fields", form.custom_fields.map((x, idx) => idx === i ? { ...x, key: e.target.value } : x))} />
                  <Input placeholder="Value" value={a.value} onChange={(e) => update("custom_fields", form.custom_fields.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => update("custom_fields", form.custom_fields.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => update("custom_fields", [...form.custom_fields, { key: "", value: "" }])}><Plus className="size-4" /> Add custom field</Button>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <Card><CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Weight (kg)"><Input type="number" step="0.001" min="0" value={form.weight} onChange={(e) => update("weight", e.target.value)} /></Field>
                <Field label="Shipping class"><Input value={form.shipping_class} onChange={(e) => update("shipping_class", e.target.value)} placeholder="standard / freight" /></Field>
                <Field label="Length (cm)"><Input type="number" min="0" value={form.dim_length} onChange={(e) => update("dim_length", e.target.value)} /></Field>
                <Field label="Width (cm)"><Input type="number" min="0" value={form.dim_width} onChange={(e) => update("dim_width", e.target.value)} /></Field>
                <Field label="Height (cm)"><Input type="number" min="0" value={form.dim_height} onChange={(e) => update("dim_height", e.target.value)} /></Field>
                <Field label="Warranty"><Input value={form.warranty} onChange={(e) => update("warranty", e.target.value)} placeholder="1 year limited" /></Field>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="supplier" className="space-y-4">
            <Card><CardContent className="pt-6 space-y-4">
              <Field label="Supplier">
                <Select value={form.supplier_id || "_none"} onValueChange={(v) => update("supplier_id", v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No supplier</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Supplier product ID"><Input value={form.supplier_product_id} onChange={(e) => update("supplier_product_id", e.target.value)} /></Field>
                <Field label="Supplier cost"><Input type="number" step="0.01" value={form.supplier_cost} onChange={(e) => update("supplier_cost", e.target.value)} /></Field>
                <Field label="Supplier stock"><Input type="number" value={form.supplier_stock} onChange={(e) => update("supplier_stock", e.target.value)} /></Field>
                <Field label="Shipping time (days)"><Input type="number" value={form.supplier_shipping_days} onChange={(e) => update("supplier_shipping_days", e.target.value)} /></Field>
              </div>
              <Field label="Supplier URL"><Input value={form.supplier_url} onChange={(e) => update("supplier_url", e.target.value)} /></Field>
              <Field label="Supplier notes"><Textarea rows={3} value={form.supplier_notes} onChange={(e) => update("supplier_notes", e.target.value)} /></Field>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <Card><CardContent className="pt-6 space-y-4">
              <Field label="Meta title"><Input maxLength={60} value={form.meta_title} onChange={(e) => update("meta_title", e.target.value)} /></Field>
              <Field label="Meta description"><Textarea rows={3} maxLength={160} value={form.meta_description} onChange={(e) => update("meta_description", e.target.value)} /></Field>
              <Field label="Search keywords"><Input value={form.search_keywords} onChange={(e) => update("search_keywords", e.target.value)} placeholder="keyword1, keyword2" /></Field>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="space-y-4">
        <Card><CardHeader><CardTitle className="text-base">Publish</CardTitle></CardHeader><CardContent className="space-y-3">
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => update("status", v as ProductStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {form.status === "scheduled" && (
            <Field label="Publish at"><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => update("scheduled_at", e.target.value)} /></Field>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {isNew ? "Create" : "Save"}</Button>
            {!isNew && <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" /> Delete</Button>}
          </div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Organization</CardTitle></CardHeader><CardContent className="space-y-3">
          <Field label="Category">
            <Select value={form.category_id || "_none"} onValueChange={(v) => { update("category_id", v === "_none" ? "" : v); update("subcategory_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No category</SelectItem>
                {categories.filter((c) => !c.parent_id).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {subcategories.length > 0 && (
            <Field label="Subcategory">
              <Select value={form.subcategory_id || "_none"} onValueChange={(v) => update("subcategory_id", v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {subcategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Brand">
            <Select value={form.brand_id || "_none"} onValueChange={(v) => update("brand_id", v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No brand</SelectItem>
                {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div>
            <Label>Tags</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {form.tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">{t}
                  <button type="button" onClick={() => update("tags", form.tags.filter((x) => x !== t))}><X className="size-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
          </div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Badges</CardTitle></CardHeader><CardContent className="space-y-3">
          <Toggle label="Featured" checked={form.is_featured} onCheckedChange={(v) => update("is_featured", v)} />
          <Toggle label="Best seller" checked={form.is_best_seller} onCheckedChange={(v) => update("is_best_seller", v)} />
          <Toggle label="New arrival" checked={form.is_new_arrival} onCheckedChange={(v) => update("is_new_arrival", v)} />
          <Toggle label="Trending" checked={form.is_trending} onCheckedChange={(v) => update("is_trending", v)} />
        </CardContent></Card>
      </aside>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>It will be soft-deleted and removed from the catalog.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}