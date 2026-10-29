import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown, ChevronRight, Loader2, Plus, Pencil, Trash2, ImagePlus,
  ArrowUp, ArrowDown, Star, Search, X,
} from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { ObjectImg } from "@/hooks/use-object-src";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slugify, uploadAsset, logAdminActivity } from "@/lib/admin/products-helpers";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

type Category = {
  id: string; name: string; slug: string; description: string | null;
  image_url: string | null; icon: string | null;
  parent_id: string | null; is_active: boolean; is_featured: boolean;
  sort_order: number; meta_title: string | null; meta_description: string | null;
};

type FormState = Omit<Category, "id" | "sort_order"> & { id?: string };

const empty: FormState = {
  name: "", slug: "", description: "", image_url: "", icon: "",
  parent_id: null, is_active: true, is_featured: false,
  meta_title: "", meta_description: "",
};

function CategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ open: boolean; form: FormState }>({ open: false, form: empty });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,description,image_url,icon,parent_id,is_active,is_featured,sort_order,meta_title,meta_description")
      .is("deleted_at", null)
      .order("sort_order")
      .order("name");
    if (error) toast.error("Failed to load", { description: error.message });
    setRows((data ?? []) as Category[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const tree = useMemo(() => {
    const roots: Category[] = [];
    const childrenOf = new Map<string, Category[]>();
    for (const c of rows) {
      if (!c.parent_id) roots.push(c);
      else {
        const arr = childrenOf.get(c.parent_id) ?? [];
        arr.push(c);
        childrenOf.set(c.parent_id, arr);
      }
    }
    const filter = search.trim().toLowerCase();
    return { roots, childrenOf, filter };
  }, [rows, search]);

  const matches = (c: Category) =>
    !tree.filter || c.name.toLowerCase().includes(tree.filter) || c.slug.toLowerCase().includes(tree.filter);

  const openNew = (parent_id: string | null = null) => setDialog({ open: true, form: { ...empty, parent_id } });
  const openEdit = (c: Category) => setDialog({ open: true, form: { ...c } });

  const save = async () => {
    const f = dialog.form;
    if (!f.name.trim()) return toast.error("Name is required");
    const slug = (f.slug || slugify(f.name)).trim();
    if (!slug) return toast.error("Slug is required");
    setSaving(true);
    try {
      const payload = {
        name: f.name.trim(), slug,
        description: f.description || null,
        image_url: f.image_url || null, icon: f.icon || null,
        parent_id: f.parent_id || null,
        is_active: f.is_active, is_featured: f.is_featured,
        meta_title: f.meta_title || null, meta_description: f.meta_description || null,
      };
      if (f.id) {
        const { error } = await supabase.from("categories").update(payload as never).eq("id", f.id);
        if (error) throw error;
        await logAdminActivity("updated", "category", f.id);
        toast.success("Category updated");
      } else {
        const max = Math.max(0, ...rows.filter((r) => r.parent_id === f.parent_id).map((r) => r.sort_order));
        const { data, error } = await supabase
          .from("categories")
          .insert({ ...payload, sort_order: max + 1 } as never)
          .select("id").single();
        if (error) throw error;
        await logAdminActivity("created", "category", data!.id);
        toast.success("Category created");
      }
      setDialog({ open: false, form: empty });
      load();
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
    } finally { setSaving(false); }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("Max 4MB");
    setUploading(true);
    try {
      const url = await uploadAsset(file, "categories");
      setDialog((d) => ({ ...d, form: { ...d.form, image_url: url } }));
    } catch (e: any) { toast.error("Upload failed", { description: e.message }); }
    finally { setUploading(false); }
  };

  const move = async (c: Category, direction: -1 | 1) => {
    const siblings = rows.filter((r) => r.parent_id === c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex((s) => s.id === c.id);
    const swap = siblings[idx + direction];
    if (!swap) return;
    await Promise.all([
      supabase.from("categories").update({ sort_order: swap.sort_order } as never).eq("id", c.id),
      supabase.from("categories").update({ sort_order: c.sort_order } as never).eq("id", swap.id),
    ]);
    load();
  };

  const toggleFeatured = async (c: Category) => {
    await supabase.from("categories").update({ is_featured: !c.is_featured } as never).eq("id", c.id);
    load();
  };

  const del = async () => {
    if (!toDelete) return;
    const children = rows.filter((r) => r.parent_id === toDelete.id);
    if (children.length) {
      toast.error("Move or delete child categories first");
      setToDelete(null);
      return;
    }
    const { error } = await supabase
      .from("categories")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", toDelete.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    await logAdminActivity("deleted", "category", toDelete.id);
    toast.success("Category deleted");
    setToDelete(null);
    load();
  };

  const toggleExpanded = (id: string) => {
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const renderRow = (c: Category, depth: number) => {
    const children = (tree.childrenOf.get(c.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);
    const open = expanded.has(c.id);
    const siblings = rows.filter((r) => r.parent_id === c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const first = siblings[0]?.id === c.id;
    const last = siblings[siblings.length - 1]?.id === c.id;
    const show = matches(c) || children.some(matches);
    if (!show) return null;
    return (
      <div key={c.id}>
        <div
          className="flex items-center gap-2 rounded-lg border bg-card p-2 hover:bg-muted/40"
          style={{ marginLeft: depth * 20 }}
        >
          <button
            className="text-muted-foreground disabled:opacity-30"
            onClick={() => toggleExpanded(c.id)}
            disabled={children.length === 0}
          >
            {children.length ? (open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />) : <span className="inline-block size-4" />}
          </button>
          {c.image_url ? (
            <ObjectImg value={c.image_url} alt="" className="size-8 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-xs text-muted-foreground">—</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium">{c.name}</span>
              {!c.is_active && <Badge variant="secondary">Hidden</Badge>}
              {c.is_featured && <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300">Featured</Badge>}
            </div>
            <div className="truncate text-xs text-muted-foreground">/{c.slug}</div>
          </div>
          <div className="hidden gap-1 sm:flex">
            <Button variant="ghost" size="icon" disabled={first} onClick={() => move(c, -1)}><ArrowUp className="size-4" /></Button>
            <Button variant="ghost" size="icon" disabled={last} onClick={() => move(c, 1)}><ArrowDown className="size-4" /></Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => toggleFeatured(c)} title="Toggle featured">
            <Star className={"size-4 " + (c.is_featured ? "fill-blue-500 text-blue-500" : "")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openNew(c.id)} title="Add subcategory">
            <Plus className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setToDelete(c)}><Trash2 className="size-4" /></Button>
        </div>
        {open && children.length > 0 && (
          <div className="mt-2 space-y-2">{children.map((cc) => renderRow(cc, depth + 1))}</div>
        )}
      </div>
    );
  };

  const parentOptions = rows.filter((r) => r.id !== dialog.form.id);
  const roots = tree.roots.sort((a, b) => a.sort_order - b.sort_order);

  return (
    <PageShell
      title="Categories"
      description="Organize products into a nested category tree."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Categories" }]}
      actions={<Button onClick={() => openNew(null)}><Plus className="size-4" /> New category</Button>}
    >
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search categories" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : roots.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No categories yet. Create your first one to organize the catalog.
        </div>
      ) : (
        <div className="space-y-2">{roots.map((r) => renderRow(r, 0))}</div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{dialog.form.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="general">
            <TabsList><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="media">Media</TabsTrigger><TabsTrigger value="seo">SEO</TabsTrigger></TabsList>
            <TabsContent value="general" className="space-y-3 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Name *</Label>
                  <Input value={dialog.form.name}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value, slug: d.form.slug || slugify(e.target.value) } }))} /></div>
                <div className="space-y-1.5"><Label>Slug *</Label>
                  <Input value={dialog.form.slug} onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, slug: slugify(e.target.value) } }))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Description</Label>
                <Textarea rows={3} value={dialog.form.description ?? ""}
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, description: e.target.value } }))} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Parent</Label>
                  <Select
                    value={dialog.form.parent_id ?? "_none"}
                    onValueChange={(v) => setDialog((d) => ({ ...d, form: { ...d.form, parent_id: v === "_none" ? null : v } }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No parent (top-level)</SelectItem>
                      {parentOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Icon (lucide name)</Label>
                  <Input value={dialog.form.icon ?? ""} placeholder="ShieldCheck"
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, icon: e.target.value } }))} /></div>
              </div>
              <div className="flex flex-wrap gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm"><Switch checked={dialog.form.is_active}
                  onCheckedChange={(v) => setDialog((d) => ({ ...d, form: { ...d.form, is_active: v } }))} /> Active</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={dialog.form.is_featured}
                  onCheckedChange={(v) => setDialog((d) => ({ ...d, form: { ...d.form, is_featured: v } }))} /> Featured</label>
              </div>
            </TabsContent>
            <TabsContent value="media" className="space-y-3 pt-3">
              <Label>Category image</Label>
              <div className="flex items-center gap-3">
                {dialog.form.image_url ? (
                  <div className="relative">
                    <ObjectImg value={dialog.form.image_url} alt="" className="size-24 rounded-lg border object-cover" />
                    <button type="button"
                      onClick={() => setDialog((d) => ({ ...d, form: { ...d.form, image_url: "" } }))}
                      className="absolute -right-1 -top-1 rounded-full bg-background p-1 shadow"><X className="size-3" /></button>
                  </div>
                ) : null}
                <label className="flex h-24 w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:bg-muted">
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                  Upload
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])} />
                </label>
              </div>
              <div className="space-y-1.5"><Label>Or paste image URL</Label>
                <Input value={dialog.form.image_url ?? ""} onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, image_url: e.target.value } }))} /></div>
            </TabsContent>
            <TabsContent value="seo" className="space-y-3 pt-3">
              <div className="space-y-1.5"><Label>Meta title</Label>
                <Input maxLength={60} value={dialog.form.meta_title ?? ""}
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, meta_title: e.target.value } }))} /></div>
              <div className="space-y-1.5"><Label>Meta description</Label>
                <Textarea rows={3} maxLength={160} value={dialog.form.meta_description ?? ""}
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, meta_description: e.target.value } }))} /></div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, form: empty })}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : null} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This category will be removed from the catalog. Products previously assigned will be uncategorized.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}