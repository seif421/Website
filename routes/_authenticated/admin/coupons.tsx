import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { money, shortDate } from "@/lib/admin/formatters";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: CouponsPage,
});

type Coupon = {
  id: string; code: string; description: string | null;
  discount_type: string; discount_value: number;
  min_order_amount: number | null; max_discount: number | null;
  max_uses: number | null; used_count: number; max_uses_per_user: number | null;
  starts_at: string | null; expires_at: string | null;
  is_active: boolean; applies_to: string; auto_apply: boolean;
  buy_x: number | null; get_y: number | null;
};
const empty: Partial<Coupon> = { code: "", discount_type: "percent", discount_value: 10, applies_to: "all", is_active: true, auto_apply: false };

function CouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Coupon>>(empty);

  async function load() {
    const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Coupon[]);
  }
  useEffect(() => { load(); }, []);

  function reset(c?: Partial<Coupon>) { setEditing(c ?? empty); setOpen(true); }

  async function save() {
    const payload = { ...editing, code: (editing.code ?? "").trim().toUpperCase() };
    if (!payload.code) return toast.error("Code required");
    if (!payload.discount_value || Number(payload.discount_value) <= 0) return toast.error("Discount value must be > 0");
    const { error } = editing.id
      ? await supabase.from("coupons").update(payload as never).eq("id", editing.id)
      : await supabase.from("coupons").insert(payload as never);
    if (error) return toast.error(error.code === "23505" ? "Code already exists" : error.message);
    toast.success("Saved"); setOpen(false); load();
  }
  async function del(id: string) {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function dup(c: Coupon) {
    const copy = { ...c, code: `${c.code}-COPY`, id: undefined, used_count: 0 } as Partial<Coupon>;
    delete (copy as { id?: string }).id;
    const { error } = await supabase.from("coupons").insert(copy as never);
    if (error) return toast.error(error.message);
    toast.success("Duplicated"); load();
  }
  async function toggle(c: Coupon) {
    await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id); load();
  }

  return (
    <PageShell title="Coupons" description="Run promotions and discount campaigns."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Coupons" }]}
      actions={<Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button onClick={() => reset()}><Plus className="size-4" /> New coupon</Button></DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing.id ? "Edit coupon" : "Create coupon"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Code</Label><Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Discount type</Label>
              <Select value={editing.discount_type ?? "percent"} onValueChange={(v) => setEditing({ ...editing, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                  <SelectItem value="free_shipping">Free shipping</SelectItem>
                  <SelectItem value="bxgy">Buy X Get Y</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input type="number" step="0.01" value={editing.discount_value ?? 0} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} /></div>
            <div><Label>Min order</Label><Input type="number" step="0.01" value={editing.min_order_amount ?? ""} onChange={(e) => setEditing({ ...editing, min_order_amount: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><Label>Max discount</Label><Input type="number" step="0.01" value={editing.max_discount ?? ""} onChange={(e) => setEditing({ ...editing, max_discount: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><Label>Max uses</Label><Input type="number" value={editing.max_uses ?? ""} onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><Label>Max uses per user</Label><Input type="number" value={editing.max_uses_per_user ?? ""} onChange={(e) => setEditing({ ...editing, max_uses_per_user: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><Label>Applies to</Label>
              <Select value={editing.applies_to ?? "all"} onValueChange={(v) => setEditing({ ...editing, applies_to: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Entire store</SelectItem>
                  <SelectItem value="products">Specific products</SelectItem>
                  <SelectItem value="categories">Specific categories</SelectItem>
                  <SelectItem value="customers">Specific customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editing.discount_type === "bxgy" && (<>
              <div><Label>Buy X</Label><Input type="number" value={editing.buy_x ?? ""} onChange={(e) => setEditing({ ...editing, buy_x: Number(e.target.value) })} /></div>
              <div><Label>Get Y</Label><Input type="number" value={editing.get_y ?? ""} onChange={(e) => setEditing({ ...editing, get_y: Number(e.target.value) })} /></div>
            </>)}
            <div><Label>Starts at</Label><Input type="datetime-local" value={editing.starts_at ? String(editing.starts_at).slice(0,16) : ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
            <div><Label>Expires at</Label><Input type="datetime-local" value={editing.expires_at ? String(editing.expires_at).slice(0,16) : ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> <Label>Active</Label></div>
            <div className="flex items-center gap-2"><Switch checked={!!editing.auto_apply} onCheckedChange={(v) => setEditing({ ...editing, auto_apply: v })} /> <Label>Auto-apply</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>}>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead>
            <TableHead>Used</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">No coupons yet.</TableCell></TableRow> : rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell className="capitalize text-sm">{c.discount_type.replace("_"," ")}</TableCell>
                <TableCell>{c.discount_type === "percent" ? `${c.discount_value}%` : c.discount_type === "free_shipping" ? "Free ship" : money(c.discount_value)}</TableCell>
                <TableCell className="text-sm">{c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.expires_at ? shortDate(c.expires_at) : "—"}</TableCell>
                <TableCell><Badge variant={c.is_active ? "default" : "secondary"} onClick={() => toggle(c)} className="cursor-pointer">{c.is_active ? "Active" : "Off"}</Badge></TableCell>
                <TableCell className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => reset(c)}>Edit</Button>
                  <Button variant="ghost" size="icon" onClick={() => dup(c)}><Copy className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="size-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}