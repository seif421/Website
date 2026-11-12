import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  Clipboard,
  ExternalLink,
  FileJson,
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
} from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { slugify, logActivity } from "@/lib/admin/products-helpers";

export const Route = createFileRoute("/_authenticated/admin/dropzawy")({
  component: DropzawyImportPage,
});

type ImportedProduct = {
  sourceUrl: string;
  supplierProductId: string;
  name: string;
  vendor: string;
  supplierPriceMin: string;
  supplierPriceMax: string;
  sellingPrice: string;
  description: string;
  images: string[];
  shippingNote: string;
  selected: boolean;
};

type ExtractedProduct = {
  sourceUrl?: string;
  supplierProductId?: string;
  name?: string;
  vendor?: string;
  supplierPriceMin?: number | string;
  supplierPriceMax?: number | string;
  description?: string;
  images?: string[];
  shippingNote?: string;
};

const MAX_BATCH = 10;

function makeProduct(raw: ExtractedProduct): ImportedProduct {
  const min = Number(raw.supplierPriceMin ?? 0);
  const max = Number(raw.supplierPriceMax ?? raw.supplierPriceMin ?? 0);
  return {
    sourceUrl: String(raw.sourceUrl ?? ""),
    supplierProductId: String(raw.supplierProductId ?? ""),
    name: String(raw.name ?? ""),
    vendor: String(raw.vendor ?? ""),
    supplierPriceMin: min > 0 ? String(min) : "",
    supplierPriceMax: max > 0 ? String(max) : "",
    sellingPrice: "",
    description: String(raw.description ?? ""),
    images: Array.isArray(raw.images)
      ? raw.images
          .filter((v): v is string => typeof v === "string" && /^https?:\/\//i.test(v))
          .slice(0, 12)
      : [],
    shippingNote: String(raw.shippingNote ?? ""),
    selected: true,
  };
}

function productIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "dropzawy.com" && !parsed.hostname.endsWith(".dropzawy.com")) return "";
    return parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return "";
  }
}

function DropzawyImportPage() {
  const { user } = useAuth();
  const [jsonText, setJsonText] = useState("");
  const [products, setProducts] = useState<ImportedProduct[]>([]);
  const [markup, setMarkup] = useState("35");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [importing, setImporting] = useState(false);
  const [bookmarkletCopied, setBookmarkletCopied] = useState(false);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name")
      .is("deleted_at", null)
      .order("name")
      .then(({ data, error }) => {
        if (error) toast.error("Could not load categories", { description: error.message });
        setCategories(data ?? []);
        setLoadingCategories(false);
      });
  }, []);

  const bookmarklet = useMemo(() => {
    const script = `(async()=>{const txt=e=>(e?.innerText||e?.textContent||"").trim();const h1=document.querySelector("h1");const title=txt(h1)||document.title;const body=txt(document.querySelector("main")||document.body);const priceText=(body.match(/[\\d,.]+\\s*EGP(?:\\s*[-–]\\s*[\\d,.]+\\s*EGP)?/i)||[])[0]||"";const nums=(priceText.match(/[\\d,.]+/g)||[]).map(x=>Number(x.replace(/,/g,""))).filter(Number.isFinite);const vendor=(body.match(/Vendor:\\s*([^\\n]+)/i)||[])[1]||"";const descNodes=[...document.querySelectorAll("h2,h3,h4")].filter(e=>/description/i.test(txt(e)));let description="";if(descNodes[0]){let n=descNodes[0].nextElementSibling;description=txt(n)}if(!description){const m=body.match(/Description\\s*([\\s\\S]{20,1200})/i);description=m?.[1]?.trim()||""}const images=[...document.images].filter(i=>i.naturalWidth>180).map(i=>i.currentSrc||i.src).filter((v,i,a)=>/^https?:/i.test(v)&&a.indexOf(v)===i).slice(0,12);const data={sourceUrl:location.href,supplierProductId:location.pathname.split("/").filter(Boolean).pop()||"",name:title.replace(/\\s*[-|].*$/,"").trim(),vendor,supplierPriceMin:nums.length?Math.min(...nums):"",supplierPriceMax:nums.length?Math.max(...nums):"",description,images,shippingNote:(body.match(/This product[\\s\\S]{0,220}/i)||[])[0]||""};const out=JSON.stringify(data,null,2);try{await navigator.clipboard.writeText(out);alert("Dropzawy product data copied. Return to Rivvo and paste it.")}catch(e){prompt("Copy this product data and paste it into Rivvo:",out)}})();`;
    return "javascript:" + script;
  }, []);

  const selectedCount = products.filter((p) => p.selected).length;
  const updateProduct = (index: number, patch: Partial<ImportedProduct>) =>
    setProducts((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  function parseProducts() {
    try {
      const parsed = JSON.parse(jsonText) as ExtractedProduct | ExtractedProduct[];
      const list = Array.isArray(parsed) ? parsed : [parsed];
      if (!list.length) throw new Error("The JSON does not contain any products.");
      if (list.length > MAX_BATCH) throw new Error("You can import up to 10 products per batch.");
      const mapped = list.map((raw) => {
        const sourceUrl = String(raw.sourceUrl ?? "");
        const supplierProductId = String(raw.supplierProductId || productIdFromUrl(sourceUrl));
        return makeProduct({ ...raw, sourceUrl, supplierProductId });
      });
      if (mapped.some((p) => !p.name.trim())) throw new Error("Every product needs a name.");
      setProducts((current) => [...current, ...mapped].slice(0, MAX_BATCH));
      setJsonText("");
      toast.success(`${mapped.length} product(s) added to the review list`);
    } catch (error) {
      toast.error("Could not read product data", {
        description: error instanceof Error ? error.message : "Check the pasted JSON.",
      });
    }
  }

  function addBlankProduct() {
    if (products.length >= MAX_BATCH) return toast.error("A batch can contain up to 10 products.");
    setProducts((current) => [...current, makeProduct({})]);
  }

  async function importSelected() {
    const chosen = products.filter((p) => p.selected);
    if (!chosen.length) return toast.error("Select at least one product.");
    if (!user) return toast.error("Please sign in again.");
    for (const p of chosen) {
      if (!p.name.trim()) return toast.error("Every selected product needs a name.");
      if (!(Number(p.supplierPriceMin) > 0))
        return toast.error(`Enter a valid Dropzawy cost for ${p.name}.`);
      if (!(Number(p.sellingPrice) > 0)) return toast.error(`Enter a selling price for ${p.name}.`);
      if (
        !p.sourceUrl.startsWith("https://www.dropzawy.com/") &&
        !p.sourceUrl.startsWith("https://dropzawy.com/")
      )
        return toast.error(`Add a valid Dropzawy product link for ${p.name}.`);
    }

    setImporting(true);
    let imported = 0;
    const importedUrls = new Set<string>();
    const errors: string[] = [];
    try {
      const { data: existing } = await supabase
        .from("products")
        .select("id,supplier_url,supplier_product_id")
        .not("supplier_url", "is", null);
      const knownUrls = new Set((existing ?? []).map((p) => p.supplier_url).filter(Boolean));
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .upsert(
          {
            name: "Dropzawy",
            slug: "dropzawy",
            platform: "dropzawy",
            website: "https://dropzawy.com",
            is_active: false,
            currency: "EGP",
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();
      if (supplierError || !supplier)
        throw new Error(supplierError?.message || "Could not prepare Dropzawy supplier record.");
      const knownIds = new Set((existing ?? []).map((p) => p.supplier_product_id).filter(Boolean));

      for (const p of chosen) {
        const productKey = p.supplierProductId || productIdFromUrl(p.sourceUrl);
        if (knownUrls.has(p.sourceUrl) || (productKey && knownIds.has(productKey))) {
          errors.push(`${p.name}: already imported`);
          continue;
        }
        const baseSlug = slugify(p.name) || "dropzawy-product";
        const slug = `${baseSlug.slice(0, 64)}-${Math.random().toString(36).slice(2, 7)}`;
        const cost = Number(p.supplierPriceMin);
        const row = {
          name: p.name.trim().slice(0, 150),
          slug,
          status: "draft",
          is_active: true,
          category_id: categoryId || null,
          supplier_id: supplier.id,
          price: Number(p.sellingPrice),
          cost,
          supplier_cost: cost,
          supplier_url: p.sourceUrl,
          supplier_product_id: productKey || null,
          supplier_notes: [
            "Supplier: Dropzawy",
            p.vendor ? `Dropzawy vendor: ${p.vendor}` : "",
            p.supplierPriceMax && Number(p.supplierPriceMax) > cost
              ? `Catalog price range: ${cost}–${p.supplierPriceMax} EGP`
              : "",
            p.shippingNote,
          ]
            .filter(Boolean)
            .join("\n"),
          manufacturer: p.vendor || null,
          description: p.description.trim() || null,
          short_description: p.description.trim().slice(0, 240) || null,
          images: p.images,
          supplier_shipping_days: /two days|2 days/i.test(p.shippingNote) ? 2 : null,
          created_by: user.id,
        };
        const { data, error } = await supabase
          .from("products")
          .insert(row as never)
          .select("id")
          .single();
        if (error) {
          errors.push(`${p.name}: ${error.message}`);
          continue;
        }
        imported++;
        importedUrls.add(p.sourceUrl);
        knownUrls.add(p.sourceUrl);
        if (productKey) knownIds.add(productKey);
        await logActivity("imported_from_dropzawy", data.id, {
          supplier_url: p.sourceUrl,
          supplier_product_id: productKey,
          supplier_cost: cost,
        });
      }

      if (imported) toast.success(`${imported} product(s) imported as drafts`);
      if (errors.length)
        toast.error(`${errors.length} product(s) skipped`, {
          description: errors.slice(0, 4).join("\n"),
        });
      setProducts((current) => current.filter((p) => !importedUrls.has(p.sourceUrl)));
    } catch (error) {
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setImporting(false);
    }
  }

  async function copyBookmarklet() {
    try {
      await navigator.clipboard.writeText(bookmarklet);
      setBookmarkletCopied(true);
      toast.success("Bookmarklet copied", {
        description: "Create a new browser bookmark and paste this into its URL field.",
      });
    } catch {
      toast.error("Clipboard access was blocked. Copy the bookmarklet from the text below.");
    }
  }

  return (
    <PageShell
      title="Dropzawy product importer"
      description="Bring Dropzawy products into Rivvo in batches of up to 10. Imported products are saved as drafts for review."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Dropzawy importer" }]}
      actions={<Badge variant="secondary">Dropzawy only</Badge>}
    >
      <div className="grid gap-5">
        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Clipboard className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Step 1 — Add the Dropzawy data copier</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Dropzawy product pages are inside your signed-in dashboard, so Rivvo cannot read
                them directly from its server. This small bookmarklet reads the product page in your
                browser and copies the visible product details. It does not ask for or store your
                Dropzawy password.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={copyBookmarklet}>
                  <Clipboard className="size-4" />{" "}
                  {bookmarkletCopied ? "Copied" : "Copy bookmarklet"}
                </Button>
                <Button asChild variant="outline">
                  <a
                    href="https://dropzawy.com/en/dropshipping-dashboard/products"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-4" /> Open Dropzawy
                  </a>
                </Button>
              </div>
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Show bookmarklet code</summary>
                <code className="mt-2 block max-h-28 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2">
                  {bookmarklet}
                </code>
              </details>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Click Copy bookmarklet.</li>
                <li>
                  Create a browser bookmark named <strong>Copy to Rivvo</strong> and paste the
                  copied text into its URL field.
                </li>
                <li>
                  On a Dropzawy product page, click that bookmark. It copies the product details.
                </li>
                <li>Return here and paste the copied JSON below. Repeat for up to 10 products.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <FileJson className="size-5 text-primary" />
            <h2 className="font-semibold">Step 2 — Paste product data</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste the copied JSON for one product, or a JSON array containing multiple products. You
            can also add a product manually below.
          </p>
          <Textarea
            className="mt-3 min-h-36 font-mono text-xs"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={
              '{\n  "name": "Product name",\n  "sourceUrl": "https://dropzawy.com/...",\n  "supplierPriceMin": 500,\n  "supplierPriceMax": 600,\n  "images": ["https://..."]\n}'
            }
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={parseProducts}
              disabled={!jsonText.trim() || products.length >= MAX_BATCH}
            >
              <Plus className="size-4" /> Add to review list
            </Button>
            <Button
              variant="outline"
              onClick={addBlankProduct}
              disabled={products.length >= MAX_BATCH}
            >
              <PackagePlus className="size-4" /> Add manually
            </Button>
            <span className="self-center text-xs text-muted-foreground">
              {products.length}/{MAX_BATCH} products in batch
            </span>
          </div>
        </section>

        {products.length > 0 && (
          <section className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Step 3 — Review and set selling prices</h2>
                <p className="text-sm text-muted-foreground">
                  Check the extracted details. Cost and selling price are kept separately.
                </p>
              </div>
              <Badge variant="secondary">{selectedCount} selected</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
              <div className="space-y-1">
                <Label>Default markup (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1000"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Rivvo category (optional)</Label>
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={loadingCategories}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {products.map((p, index) => {
                const suggested = p.supplierPriceMin
                  ? Math.ceil(
                      Number(p.supplierPriceMin) * (1 + Math.max(0, Number(markup) || 0) / 100),
                    )
                  : 0;
                return (
                  <article key={index} className="rounded-lg border p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <input
                        aria-label={`Select ${p.name || "product"}`}
                        type="checkbox"
                        checked={p.selected}
                        onChange={(e) => updateProduct(index, { selected: e.target.checked })}
                        className="mt-1 size-4 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{p.name || "Untitled product"}</p>
                          <Badge variant="outline">Draft on import</Badge>
                        </div>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {p.sourceUrl || "Add the Dropzawy product URL"}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Remove product"
                        onClick={() =>
                          setProducts((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Product name</Label>
                        <Input
                          value={p.name}
                          onChange={(e) => updateProduct(index, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Dropzawy vendor</Label>
                        <Input
                          value={p.vendor}
                          onChange={(e) => updateProduct(index, { vendor: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Supplier cost — minimum (EGP)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={p.supplierPriceMin}
                          onChange={(e) =>
                            updateProduct(index, {
                              supplierPriceMin: e.target.value,
                              sellingPrice: "",
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Supplier cost — maximum (EGP)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={p.supplierPriceMax}
                          onChange={(e) =>
                            updateProduct(index, { supplierPriceMax: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Rivvo selling price (EGP)</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={p.sellingPrice}
                            onChange={(e) => updateProduct(index, { sellingPrice: e.target.value })}
                            placeholder={suggested ? String(suggested) : "Enter selling price"}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              updateProduct(index, { sellingPrice: String(suggested) })
                            }
                            disabled={!suggested}
                          >
                            Use +{markup}%
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Dropzawy product ID</Label>
                        <Input
                          value={p.supplierProductId}
                          onChange={(e) =>
                            updateProduct(index, { supplierProductId: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <Label>Product description</Label>
                      <Textarea
                        value={p.description}
                        onChange={(e) => updateProduct(index, { description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="mt-3 space-y-1">
                      <Label>Product images (one URL per line)</Label>
                      <Textarea
                        value={p.images.join("\n")}
                        onChange={(e) =>
                          updateProduct(index, {
                            images: e.target.value
                              .split("\n")
                              .map((v) => v.trim())
                              .filter((v) => /^https?:\/\//i.test(v))
                              .slice(0, 12),
                          })
                        }
                        rows={2}
                      />
                    </div>
                    <div className="mt-3 space-y-1">
                      <Label>Production / shipping notes</Label>
                      <Input
                        value={p.shippingNote}
                        onChange={(e) => updateProduct(index, { shippingNote: e.target.value })}
                      />
                    </div>
                    {p.images.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {p.images.slice(0, 5).map((src, i) => (
                          <img
                            key={src + i}
                            src={src}
                            alt=""
                            className="size-16 rounded-md border object-cover"
                          />
                        ))}
                      </div>
                    )}
                    {p.supplierPriceMin && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Estimated gross profit:{" "}
                        {p.sellingPrice
                          ? (Number(p.sellingPrice) - Number(p.supplierPriceMin)).toLocaleString(
                              "en-EG",
                            )
                          : (suggested - Number(p.supplierPriceMin)).toLocaleString("en-EG")}{" "}
                        EGP per unit, before delivery and other costs.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Products are imported as drafts and will not appear in the public shop until you
                publish them.
              </p>
              <Button onClick={importSelected} disabled={importing || selectedCount === 0}>
                {importing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}{" "}
                Import {selectedCount} selected
              </Button>
            </div>
          </section>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p>
            This first version uses a browser-side copier because Dropzawy requires your signed-in
            session. It never sends your Dropzawy login details to Rivvo. Review every image, price
            and description before importing; the supplier's catalog price may vary by product
            option.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
