import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Search, Filter, Download, Upload, MoreHorizontal, Copy, Trash2,
  Archive, ArchiveRestore, Eye, EyeOff, Loader2, Pencil, Tag, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/admin/page-shell";
import { ObjectImg } from "@/hooks/use-object-src";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_OPTIONS, STATUS_VARIANTS, type ProductStatus,
  productsToCsv, parseCsv, downloadFile, slugify, logActivity,
} from "@/lib/admin/products-helpers";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: ProductsPage,
});

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  status: ProductStatus;
  price: number | null;
  sale_price: number | null;
  cost: number | null;
  category_id: string | null;
  brand_id: string | null;
  images: unknown;
  is_featured: boolean;
  is_active: boolean;
  tags: string[] | null;
  created_at: string;
  archived_at: string | null;
  inventory?: { stock: number }[] | null;
  category?: { name: string } | null;
  brand?: { name: string } | null;
};

const PAGE_SIZE = 25;

function ProductsPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("created_at:desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<null | { ids: string[]; archive?: boolean }>(null);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkPricePct, setBulkPricePct] = useState("");
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");

  const [sortField, sortDir] = sort.split(":") as [string, "asc" | "desc"];

  useEffect(() => {
    supabase.from("categories").select("id,name").is("deleted_at", null).order("name")
      .then(({ data }) => setCategories(data ?? []));
    supabase.from("brands").select("id,name").is("deleted_at", null).order("name")
      .then(({ data }) => setBrands(data ?? []));
  }, []);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("products")
      .select("id,name,slug,sku,status,price,sale_price,cost,category_id,brand_id,images,is_featured,is_active,tags,created_at,archived_at,inventory(stock),category:categories!products_category_id_fkey(name),brand:brands(name)", { count: "exact" })
      .is("deleted_at", null);

    if (search.trim()) {
      const term = search.trim();
      q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%,slug.ilike.%${term}%`);
    }
    if (statusFilter !== "all") q = q.eq("status", statusFilter as ProductStatus);
    if (categoryFilter !== "all") q = q.eq("category_id", categoryFilter);
    if (brandFilter !== "all") q = q.eq("brand_id", brandFilter);

    const fromIdx = (page - 1) * PAGE_SIZE;
    q = q.order(sortField, { ascending: sortDir === "asc" }).range(fromIdx, fromIdx + PAGE_SIZE - 1);

    const { data, count, error } = await q;
    if (error) {
      toast.error("Failed to load products", { description: error.message });
      setLoading(false);
      return;
    }
    let result = (data ?? []) as unknown as ProductRow[];
    if (stockFilter !== "all") {
      result = result.filter((p) => {
        const stock = p.inventory?.[0]?.stock ?? 0;
        if (stockFilter === "in") return stock > 5;
        if (stockFilter === "low") return stock > 0 && stock <= 5;
        if (stockFilter === "out") return stock === 0;
        return true;
      });
    }
    setRows(result);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, categoryFilter, brandFilter, stockFilter, sort, page]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const bulkUpdate = async (patch: Record<string, unknown>, msg: string) => {
    if (!selectedIds.length) return;
    const { error } = await supabase.from("products").update(patch as never).in("id", selectedIds);
    if (error) return toast.error(msg + " failed", { description: error.message });
    toast.success(msg, { description: `${selectedIds.length} product(s)` });
    await Promise.all(selectedIds.map((id) => logActivity(`bulk:${msg}`, id, patch)));
    clearSelection();
    load();
  };

  const duplicateProduct = async (id: string) => {
    const { data: p } = await supabase.from("products").select("*").eq("id", id).single();
    if (!p) return;
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
    const copy = { ...rest, name: `${p.name} (copy)`, slug: `${p.slug}-copy-${Date.now().toString(36)}`, sku: p.sku ? `${p.sku}-copy` : null, status: "draft" as ProductStatus };
    const { error, data } = await supabase.from("products").insert(copy as never).select("id").single();
    if (error) return toast.error("Duplicate failed", { description: error.message });
    toast.success("Product duplicated");
    if (data) logActivity("duplicated", data.id);
    load();
  };

  const handleArchive = async (ids: string[], archive: boolean) => {
    const { error } = await supabase.from("products").update({
      status: archive ? "archived" : "draft",
      archived_at: archive ? new Date().toISOString() : null,
    } as never).in("id", ids);
    if (error) return toast.error("Failed", { description: error.message });
    toast.success(archive ? "Archived" : "Restored", { description: `${ids.length} product(s)` });
    await Promise.all(ids.map((id) => logActivity(archive ? "archived" : "restored", id)));
    clearSelection();
    load();
  };

  const handleDelete = async (ids: string[]) => {
    const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString() } as never).in("id", ids);
    if (error) return toast.error("Delete failed", { description: error.message });
    toast.success("Deleted", { description: `${ids.length} product(s)` });
    await Promise.all(ids.map((id) => logActivity("deleted", id)));
    clearSelection();
    load();
  };

  const exportCsv = async () => {
    const idsToExport = selectedIds.length ? selectedIds : rows.map((r) => r.id);
    const { data } = await supabase.from("products")
      .select("id,name,slug,sku,barcode,status,price,sale_price,compare_at_price,cost,short_description,description,is_featured,is_best_seller,is_new_arrival,is_trending,tags,category:categories!products_category_id_fkey(name),brand:brands(name),inventory(stock)")
      .in("id", idsToExport);
    if (!data) return;
    const flat = data.map((p: any) => ({
      ...p,
      category: p.category?.name ?? "",
      brand: p.brand?.name ?? "",
      stock: p.inventory?.[0]?.stock ?? 0,
      tags: (p.tags ?? []).join("|"),
    }));
    downloadFile(`products-${Date.now()}.csv`, productsToCsv(flat));
    toast.success(`Exported ${flat.length} product(s)`);
  };

  const downloadTemplate = () => {
    const sample = [{
      name: "Sample Camera", slug: "sample-camera", sku: "CAM-001", barcode: "",
      status: "draft", price: "199.99", sale_price: "", compare_at_price: "249.99",
      cost: "85.00", stock: 50, category: "Cameras", brand: "SentryHaus",
      tags: "wifi|outdoor", is_featured: "false", is_best_seller: "false",
      is_new_arrival: "true", is_trending: "false",
      short_description: "Short blurb", description: "Long description",
    }];
    downloadFile("products-import-template.csv", productsToCsv(sample));
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) return toast.error("Empty CSV");
    const headers = rows[0].map((h) => h.trim());
    const lookupCat = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const lookupBrand = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));
    let ok = 0; let fail = 0; const errors: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => (obj[h] = row[idx] ?? ""));
      if (!obj.name) { fail++; errors.push(`Row ${i + 1}: missing name`); continue; }
      const insert: Record<string, unknown> = {
        name: obj.name,
        slug: obj.slug || slugify(obj.name),
        sku: obj.sku || null,
        barcode: obj.barcode || null,
        status: (obj.status || "draft") as ProductStatus,
        price: obj.price ? Number(obj.price) : 0,
        sale_price: obj.sale_price ? Number(obj.sale_price) : null,
        compare_at_price: obj.compare_at_price ? Number(obj.compare_at_price) : null,
        cost: obj.cost ? Number(obj.cost) : null,
        short_description: obj.short_description || null,
        description: obj.description || null,
        is_featured: obj.is_featured === "true",
        is_best_seller: obj.is_best_seller === "true",
        is_new_arrival: obj.is_new_arrival === "true",
        is_trending: obj.is_trending === "true",
        tags: obj.tags ? obj.tags.split("|").map((t) => t.trim()).filter(Boolean) : [],
        category_id: obj.category ? lookupCat.get(obj.category.toLowerCase()) ?? null : null,
        brand_id: obj.brand ? lookupBrand.get(obj.brand.toLowerCase()) ?? null : null,
      };
      const { error, data } = await supabase.from("products").insert(insert as never).select("id").single();
      if (error) { fail++; errors.push(`Row ${i + 1}: ${error.message}`); continue; }
      if (obj.stock && data) {
        await supabase.from("inventory").upsert({ product_id: data.id, stock: Number(obj.stock) } as never, { onConflict: "product_id" });
      }
      ok++;
    }
    if (fail) toast.error(`Imported ${ok}, failed ${fail}`, { description: errors.slice(0, 3).join("\n") });
    else toast.success(`Imported ${ok} product(s)`);
    load();
  };

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setCategoryFilter("all");
    setBrandFilter("all"); setStockFilter("all"); setPage(1);
  };
  const hasFilters = search || statusFilter !== "all" || categoryFilter !== "all" || brandFilter !== "all" || stockFilter !== "all";

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageShell
      title="Products"
      description="Create, organize, and manage your full catalog."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Products" }]}
      actions={
        <>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="size-4" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv}>
                <Download className="size-4" /> Export {selectedIds.length ? `${selectedIds.length} selected` : "current page"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadTemplate}>
                <Download className="size-4" /> Download import template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Import
          </Button>
          <Button onClick={() => navigate({ to: "/admin/products/new" })}>
            <Plus className="size-4" /> New product
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, SKU, slug…" className="pl-9"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Stock" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="in">In stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">Newest</SelectItem>
            <SelectItem value="created_at:asc">Oldest</SelectItem>
            <SelectItem value="price:desc">Highest price</SelectItem>
            <SelectItem value="price:asc">Lowest price</SelectItem>
            <SelectItem value="name:asc">Name A→Z</SelectItem>
            <SelectItem value="name:desc">Name Z→A</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-4" /> Clear
          </Button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkUpdate({ status: "published" }, "published")}>
              <Eye className="size-4" /> Publish
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkUpdate({ status: "hidden" }, "unpublished")}>
              <EyeOff className="size-4" /> Unpublish
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkCategoryOpen(true)}>
              <Tag className="size-4" /> Set category
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkPriceOpen(true)}>
              Bulk price
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleArchive(selectedIds, true)}>
              <Archive className="size-4" /> Archive
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirmDelete({ ids: selectedIds })}>
              <Trash2 className="size-4" /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="h-32 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                  No products found. {hasFilters ? "Try clearing filters." : <Link to="/admin/products/new" className="text-primary hover:underline">Create your first product</Link>}.
                </TableCell></TableRow>
              ) : rows.map((p) => {
                const stock = p.inventory?.[0]?.stock ?? 0;
                const img = Array.isArray(p.images) ? (p.images as string[])[0] : null;
                return (
                  <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          <ObjectImg value={img} className="size-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <Link to="/admin/products/$id" params={{ id: p.id }} className="font-medium hover:underline truncate block max-w-[280px]">
                            {p.name}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate max-w-[280px]">
                            {p.brand?.name ?? "—"}
                            {p.is_featured && <Badge variant="outline" className="ml-2">Featured</Badge>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.sku ?? "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_VARIANTS[p.status]}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${Number(p.price ?? 0).toFixed(2)}</div>
                      {p.sale_price && <div className="text-xs text-emerald-600">Sale ${Number(p.sale_price).toFixed(2)}</div>}
                    </TableCell>
                    <TableCell>
                      <span className={stock === 0 ? "text-destructive font-medium" : stock <= 5 ? "text-amber-600 font-medium" : ""}>{stock}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category?.name ?? "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/products/$id" params={{ id: p.id }}>
                              <Pencil className="size-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateProduct(p.id)}>
                            <Copy className="size-4" /> Duplicate
                          </DropdownMenuItem>
                          {p.status === "archived" ? (
                            <DropdownMenuItem onClick={() => handleArchive([p.id], false)}>
                              <ArchiveRestore className="size-4" /> Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleArchive([p.id], true)}>
                              <Archive className="size-4" /> Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete({ ids: [p.id] })}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {total > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : "0 products"}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="px-2 text-muted-foreground">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.ids.length} product(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be soft-deleted and removed from the catalog. You can restore them from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDelete) handleDelete(confirmDelete.ids); setConfirmDelete(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bulkPriceOpen} onOpenChange={setBulkPriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk price update</DialogTitle>
            <DialogDescription>Adjust price for {selectedIds.length} product(s) by a percentage. Use negative for discount.</DialogDescription>
          </DialogHeader>
          <Label>Percentage change</Label>
          <Input type="number" step="0.1" placeholder="e.g. -10 or 15" value={bulkPricePct} onChange={(e) => setBulkPricePct(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkPriceOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              const pct = Number(bulkPricePct);
              if (!Number.isFinite(pct)) return toast.error("Enter a valid number");
              const { data } = await supabase.from("products").select("id,price").in("id", selectedIds);
              if (!data) return;
              for (const p of data) {
                const newPrice = Math.round(Number(p.price ?? 0) * (1 + pct / 100) * 100) / 100;
                await supabase.from("products").update({ price: newPrice } as never).eq("id", p.id);
              }
              toast.success(`Updated ${data.length} price(s)`);
              setBulkPriceOpen(false); setBulkPricePct(""); clearSelection(); load();
            }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set category</DialogTitle>
            <DialogDescription>Assign {selectedIds.length} product(s) to a category.</DialogDescription>
          </DialogHeader>
          <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
            <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkCategoryOpen(false)}>Cancel</Button>
            <Button disabled={!bulkCategoryId} onClick={async () => {
              await bulkUpdate({ category_id: bulkCategoryId }, "category set");
              setBulkCategoryOpen(false); setBulkCategoryId("");
            }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}