import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, Plus, Pencil, Trash2, Search, ExternalLink, Truck, Mail, Phone,
  Building2, Boxes, ImagePlus, X,
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

export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  component: SuppliersPage,
});

type Supplier = {
  id: string; name: string; slug: string | null; platform: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
  website: string | null; address: string | null; notes: string | null;
  is_active: boolean;
  lead_time_days: number | null; external_supplier_id: string | null;
  payment_terms: string | null; currency: string;
  api_endpoint: string | null; logo_url: string | null;
};

type FormState = Omit<Supplier, "id"> & { id?: string };
const empty: FormState = {
  name: "", slug: "", platform: "manual",
  contact_name: "", contact_email: "", contact_phone: "",
  website: "", address: "", notes: "", is_active: true,
  lead_time_days: null, external_supplier_id: "",
  payment_terms: "", currency: "USD",
  api_endpoint: "", logo_url: "",
};

const PLATFORMS = [
  { value: "manual", label: "Manual" },
  { value: "cj_dropshipping", label: "CJ Dropshipping" },
  { value: "aliexpress", label: "AliExpress" },
  { value: "spocket", label: "Spocket" },
  { value: "wholesale", label: "Wholesale" },
  { value: "custom", label: "Custom API" },
];

function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; form: FormState }>({ open: false, form: empty });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("suppliers")
      .select("id,name,slug,platform,contact_name,contact_email,contact_phone,website,address,notes,is_active,lead_time_days,external_supplier_id,payment_terms,currency,api_endpoint,logo_url")
      .order("name");
    if (error) toast.error("Failed to load", { description: error.message });
    setRows((data ?? []) as Supplier[]);
    const { data: counts } = await supabase
      .from("products")
      .select("supplier_id")
      .not("supplier_id", "is", null)
      .is("deleted_at", null);
    const map: Record<string, number> = {};
    (counts ?? []).forEach((r: any) => { if (r.supplier_id) map[r.supplier_id] = (map[r.supplier_id] ?? 0) + 1; });
    setProductCounts(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [s.name, s.contact_email, s.platform, s.external_supplier_id]
      .filter(Boolean).some((v) => (v as string).toLowerCase().includes(q));
  });

  const openNew = () => setDialog({ open: true, form: empty });
  const openEdit = (s: Supplier) => setDialog({ open: true, form: { ...s } });

  const save = async () => {
    const f = dialog.form;
    if (!f.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload = {
        name: f.name.trim(),
        slug: (f.slug || slugify(f.name)).trim() || null,
        platform: f.platform || null,
        contact_name: f.contact_name || null,
        contact_email: f.contact_email || null,
        contact_phone: f.contact_phone || null,
        website: f.website || null,
        address: f.address || null,
        notes: f.notes || null,
        is_active: f.is_active,
        lead_time_days: f.lead_time_days ?? null,
        external_supplier_id: f.external_supplier_id || null,
        payment_terms: f.payment_terms || null,
        currency: f.currency || "USD",
        api_endpoint: f.api_endpoint || null,
        logo_url: f.logo_url || null,
      };
      if (f.id) {
        const { error } = await supabase.from("suppliers").update(payload as never).eq("id", f.id);
        if (error) throw error;
        await logAdminActivity("updated", "supplier", f.id);
        toast.success("Supplier updated");
      } else {
        const { data, error } = await supabase.from("suppliers").insert(payload as never).select("id").single();
        if (error) throw error;
        await logAdminActivity("created", "supplier", data!.id);
        toast.success("Supplier created");
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
      const url = await uploadAsset(file, "suppliers");
      setDialog((d) => ({ ...d, form: { ...d.form, logo_url: url } }));
    } catch (e: any) { toast.error("Upload failed", { description: e.message }); }
    finally { setUploading(false); }
  };

  const del = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", toDelete.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    await logAdminActivity("deleted", "supplier", toDelete.id);
    toast.success("Supplier deleted");
    setToDelete(null);
    load();
  };

  return (
    <PageShell
      title="Suppliers"
      description="Manage supplier contacts, lead times, and dropshipping platforms."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Suppliers" }]}
      actions={<Button onClick={openNew}><Plus className="size-4" /> New supplier</Button>}
    >
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search suppliers" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No suppliers yet. Add your first supplier to start managing dropshipping data.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                {s.logo_url ? (
                  <ObjectImg value={s.logo_url} alt={s.name} className="size-12 shrink-0 rounded-lg border object-contain bg-muted/40 p-1" />
                ) : (
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted"><Building2 className="size-5 text-muted-foreground" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{s.name}</h3>
                    {!s.is_active && <Badge variant="secondary">Inactive</Badge>}
                    {s.platform && <Badge variant="outline" className="text-xs">{PLATFORMS.find((p) => p.value === s.platform)?.label ?? s.platform}</Badge>}
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {s.contact_email && <div className="flex items-center gap-1 truncate"><Mail className="size-3 shrink-0" />{s.contact_email}</div>}
                    {s.contact_phone && <div className="flex items-center gap-1 truncate"><Phone className="size-3 shrink-0" />{s.contact_phone}</div>}
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 truncate text-primary hover:underline">
                        <ExternalLink className="size-3 shrink-0" />{s.website}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted/30 p-2">
                  <div className="font-semibold">{productCounts[s.id] ?? 0}</div>
                  <div className="text-muted-foreground">Products</div>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <div className="font-semibold flex items-center justify-center gap-1"><Truck className="size-3" />{s.lead_time_days ?? "—"}</div>
                  <div className="text-muted-foreground">Lead days</div>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <div className="font-semibold">{s.currency}</div>
                  <div className="text-muted-foreground">Currency</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="size-4" /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setToDelete(s)}><Trash2 className="size-4" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{dialog.form.id ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
              <TabsTrigger value="integration">Integration</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-3 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Name *</Label>
                  <Input value={dialog.form.name}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))} /></div>
                <div className="space-y-1.5"><Label>Slug</Label>
                  <Input value={dialog.form.slug ?? ""} onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, slug: slugify(e.target.value) } }))} /></div>
                <div className="space-y-1.5"><Label>Platform</Label>
                  <Select value={dialog.form.platform ?? "manual"}
                    onValueChange={(v) => setDialog((d) => ({ ...d, form: { ...d.form, platform: v } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Website</Label>
                  <Input value={dialog.form.website ?? ""} placeholder="https://…"
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, website: e.target.value } }))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Notes</Label>
                <Textarea rows={3} value={dialog.form.notes ?? ""}
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, notes: e.target.value } }))} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={dialog.form.is_active}
                onCheckedChange={(v) => setDialog((d) => ({ ...d, form: { ...d.form, is_active: v } }))} /> Active</label>
              <div className="space-y-1.5"><Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {dialog.form.logo_url ? (
                    <div className="relative">
                      <ObjectImg value={dialog.form.logo_url} alt="" className="size-16 rounded-lg border object-contain bg-muted/40 p-1" />
                      <button type="button"
                        onClick={() => setDialog((d) => ({ ...d, form: { ...d.form, logo_url: "" } }))}
                        className="absolute -right-1 -top-1 rounded-full bg-background p-1 shadow"><X className="size-3" /></button>
                    </div>
                  ) : null}
                  <label className="flex h-16 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:bg-muted">
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
                  </label>
                </div></div>
            </TabsContent>
            <TabsContent value="contact" className="space-y-3 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Contact name</Label>
                  <Input value={dialog.form.contact_name ?? ""}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, contact_name: e.target.value } }))} /></div>
                <div className="space-y-1.5"><Label>Email</Label>
                  <Input type="email" value={dialog.form.contact_email ?? ""}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, contact_email: e.target.value } }))} /></div>
                <div className="space-y-1.5"><Label>Phone</Label>
                  <Input value={dialog.form.contact_phone ?? ""}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, contact_phone: e.target.value } }))} /></div>
                <div className="space-y-1.5"><Label>External supplier ID</Label>
                  <Input value={dialog.form.external_supplier_id ?? ""}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, external_supplier_id: e.target.value } }))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Address</Label>
                <Textarea rows={2} value={dialog.form.address ?? ""}
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, address: e.target.value } }))} /></div>
            </TabsContent>
            <TabsContent value="terms" className="space-y-3 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Lead time (days)</Label>
                  <Input type="number" min="0" value={dialog.form.lead_time_days ?? ""}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, lead_time_days: e.target.value ? Number(e.target.value) : null } }))} /></div>
                <div className="space-y-1.5"><Label>Currency</Label>
                  <Input value={dialog.form.currency} maxLength={3}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, currency: e.target.value.toUpperCase() } }))} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label>Payment terms</Label>
                  <Input placeholder="Net 30, Prepaid, etc." value={dialog.form.payment_terms ?? ""}
                    onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, payment_terms: e.target.value } }))} /></div>
              </div>
            </TabsContent>
            <TabsContent value="integration" className="space-y-3 pt-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Boxes className="mb-1 size-4" />
                Store the API endpoint you'll use to sync products, orders, and stock. Full CJ Dropshipping sync is wired in the next stage; credentials should be saved via the secret vault (not here).
              </div>
              <div className="space-y-1.5"><Label>API endpoint</Label>
                <Input value={dialog.form.api_endpoint ?? ""} placeholder="https://api.cjdropshipping.com/..."
                  onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, api_endpoint: e.target.value } }))} /></div>
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
            <AlertDialogDescription>
              Products currently tied to this supplier will keep their supplier fields for history, but the supplier record will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}