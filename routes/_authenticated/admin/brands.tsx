import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, Plus, Pencil, Trash2, ImagePlus, Star, Search, X, ExternalLink,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slugify, uploadAsset, logAdminActivity } from "@/lib/admin/products-helpers";

export const Route = createFileRoute("/_authenticated/admin/brands")({
  component: BrandsPage,
});

type Brand = {
  id: string; name: string; slug: string; description: string | null;
  logo_url: string | null; website: string | null; is_featured: boolean;
  meta_title: string | null; meta_description: string | null;
};

type FormState = Omit<Brand, "id"> & { id?: string };
const empty: FormState = {
  name: "", slug: "", description: "", logo_url: "", website: "",
  is_featured: false, meta_title: "", meta_description: "",
};

function BrandsPage() {
  const [rows, setRows] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; form: FormState }>({ open: false, form: empty });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Brand | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("brands")
      .select("id,name,slug,description,logo_url,website,is_featured,meta_title,meta_description")
      .is("deleted_at", null).order("name");
    if (error) toast.error("Failed to load", { description: error.message });
    setRows((data ?? []) as Brand[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((b) => {
    const s = search.trim().toLowerCase();
    return !s || b.name.toLowerCase().includes(s) || b.slug.toLowerCase().includes(s);
  });

  const openNew = () => setDialog({ open: true, form: empty });
  const openEdit = (b: Brand) => setDialog({ open: true, form: { ...b } });

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
        logo_url: f.logo_url || null,
        website: f.website || null,
        is_featured: f.is_featured,
        meta_title: f.meta_title || null,
        meta_description: f.meta_description || null,
      };
      if (f.id) {
        const { error } = await supabase.from("brands").update(payload as never).eq("id", f.id);
        if (error) throw error;
        await logAdminActivity("updated", "brand", f.id);
        toast.success("Brand updated");
      } else {
        const { data, error } = await supabase.from("brands").insert(payload as never).select("id").single();
        if (error) throw error;
        await logAdminActivity("created", "brand", data!.id);
        toast.success("Brand created");
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
      const url = await uploadAsset(file, "brands");
      setDialog((d) => ({ ...d, form: { ...d.form, logo_url: url } }));
    } catch (e: any) { toast.error("Upload failed", { description: e.message }); }
    finally { setUploading(false); }
  };

  const toggleFeatured = async (b: Brand) => {
    await supabase.from("brands").update({ is_featured: !b.is_featured } as never).eq("id", b.id);
    load();
  };

  const del = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("brands")
      .update({ deleted_at: new Date().toISOString() } as never).eq("id", toDelete.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    await logAdminActivity("deleted", "brand", toDelete.id);
    toast.success("Brand deleted");
    setToDelete(null);
    load();
  };

  return (
    <PageShell
      title="Brands"
      description="Manage brand logos, websites, and featured brands."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Brands" }]}
      actions={<Button onClick={openNew}><Plus className="size-4" /> New brand</Button>}
    >
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search brands" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No brands yet.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <div key={b.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                {b.logo_url ? (
                  <ObjectImg value={b.logo_url} alt={b.name} className="size-14 shrink-0 rounded-lg border object-contain bg-muted/40 p-1" />
                ) : (
                  <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">{b.name.slice(0, 2).toUpperCase()}</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{b.name}</h3>
                    {b.is_featured && <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300">Featured</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">/{b.slug}</div>
                  {b.website && (
                    <a href={b.website} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="size-3" /> Website
                    </a>
                  )}
                </div>
              </div>
              {b.description && <p className="line-clamp-2 text-xs text-muted-foreground">{b.description}</p>}
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggleFeatured(b)}>
                  <Star className={"size-4 " + (b.is_featured ? "fill-blue-500 text-blue-500" : "")} />
                  {b.is_featured ? "Unfeature" : "Feature"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Pencil className="size-4" /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setToDelete(b)}><Trash2 className="size-4" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{dialog.form.id ? "Edit brand" : "New brand"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="general">
            <TabsList><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="media">Logo</TabsTrigger><TabsTrigger value="seo">SEO</TabsTrigger></TabsList>
            <TabsContent value="general" className="space-y-3 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Name *</Label>
                  <Input value={dialog.form.name}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value, slug: d.form.slug || slugify(e.target.value) } }))} /></div>
                <div className="space-y-1.5"><Label>Slug *</Label>
                  <Input value={dialog.form.slug} onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, slug: slugify(e.target.value) } }))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Description</Label>
                <Textarea rows={4} value={dialog.form.description ?? ""}
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, description: e.target.value } }))} /></div>
              <div className="space-y-1.5"><Label>Website</Label>
                <Input type="url" placeholder="https://…" value={dialog.form.website ?? ""}
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, website: e.target.value } }))} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={dialog.form.is_featured}
                onCheckedChange={(v) => setDialog((d) => ({ ...d, form: { ...d.form, is_featured: v } }))} /> Featured brand</label>
            </TabsContent>
            <TabsContent value="media" className="space-y-3 pt-3">
              <Label>Brand logo</Label>
              <div className="flex items-center gap-3">
                {dialog.form.logo_url ? (
                  <div className="relative">
                    <ObjectImg value={dialog.form.logo_url} alt="" className="size-24 rounded-lg border object-contain bg-muted/40 p-2" />
                    <button type="button"
                      onClick={() => setDialog((d) => ({ ...d, form: { ...d.form, logo_url: "" } }))}
                      className="absolute -right-1 -top-1 rounded-full bg-background p-1 shadow"><X className="size-3" /></button>
                  </div>
                ) : null}
                <label className="flex h-24 w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:bg-muted">
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
                </label>
              </div>
              <div className="space-y-1.5"><Label>Or paste image URL</Label>
                <Input value={dialog.form.logo_url ?? ""} onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, logo_url: e.target.value } }))} /></div>
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
            <AlertDialogDescription>Products previously assigned will keep the reference; you can reassign them later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}