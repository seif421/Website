import { useCallback, useEffect, useState } from "react";
import { Home, Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  MAX_ADDRESSES, deleteAddress, fetchAddresses, makeDefaultAddress, saveAddress,
  type AddressInput, type SavedAddress,
} from "@/lib/store/addresses";

const input =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

const blank: AddressInput = { label: "", fullName: "", phone: "", governorate: "", city: "", line1: "", line2: "" };

export function AddressManager({ userId, defaultName }: { userId: string; defaultName?: string }) {
  const [list, setList] = useState<SavedAddress[] | null>(null);
  const [zones, setZones] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id?: string; form: AddressInput } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await fetchAddresses(userId));
    } catch {
      setList([]);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    // The delivery list is a new database function, so the generated types do not list it yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc("delivery_zones").then(({ data }: { data: { governorate: string }[] | null }) => {
      if (Array.isArray(data)) setZones(data.map((z) => z.governorate));
    });
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await saveAddress(userId, editing.form, editing.id, list?.length ?? 0);
      toast.success(editing.id ? "Address updated" : "Address saved");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error("Could not save the address", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (err) {
      toast.error("Something went wrong", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const set = (patch: Partial<AddressInput>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });
  const full = (list?.length ?? 0) >= MAX_ADDRESSES;

  return (
    <Card id="addresses" className="mt-8 scroll-mt-24 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Saved addresses</h2>
          <p className="text-xs text-muted-foreground">
            Save where you want your orders delivered. We fill it in for you at checkout.
          </p>
        </div>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            disabled={full}
            onClick={() => setEditing({ form: { ...blank, fullName: defaultName ?? "" } })}
          >
            <Plus className="size-4" /> {full ? `Maximum ${MAX_ADDRESSES} addresses` : "Add address"}
          </Button>
        )}
      </div>

      {list === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {list.length === 0 && !editing && (
            <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No saved addresses yet. Add one now, or tick "Save this address" at your next checkout.
            </p>
          )}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {list.map((a) => (
              <li key={a.id} className="rounded-lg border p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Home className="size-4 text-brand" aria-hidden /> {a.label || "Address"}
                  </p>
                  {a.isDefault && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">Default</span>
                  )}
                </div>
                <p className="mt-2">{a.fullName}</p>
                <p className="text-muted-foreground">{a.phone}</p>
                <p className="mt-1 text-muted-foreground">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.city}, {a.governorate}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setEditing({
                        id: a.id,
                        form: { label: a.label, fullName: a.fullName, phone: a.phone, governorate: a.governorate, city: a.city, line1: a.line1, line2: a.line2, isDefault: a.isDefault },
                      })
                    }
                  >
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  {!a.isDefault && (
                    <Button size="sm" variant="ghost" onClick={() => act(() => makeDefaultAddress(userId, a.id), "Default address changed")}>
                      <Star className="size-3.5" /> Make default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm("Delete this address?")) void act(() => deleteAddress(userId, a.id), "Address deleted");
                    }}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <form onSubmit={submit} className="mt-5 space-y-4 rounded-lg border bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-brand" aria-hidden /> {editing.id ? "Edit address" : "New address"}
          </p>
          <label className="block text-sm font-medium">
            Name this address <span className="font-normal text-muted-foreground">(for example Home or Work)</span>
            <input className={input} maxLength={30} value={editing.form.label} onChange={(e) => set({ label: e.target.value })} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Full name
              <input className={input} required minLength={3} maxLength={100} value={editing.form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            </label>
            <label className="block text-sm font-medium">
              Mobile number
              <input
                className={input}
                required
                type="tel"
                inputMode="tel"
                placeholder="01012345678"
                pattern="(\+?20|0)?1[0125][0-9]{8}"
                title="An Egyptian mobile number, for example 01012345678"
                value={editing.form.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </label>
            <label className="block text-sm font-medium">
              Governorate
              <select className={input} required value={editing.form.governorate} onChange={(e) => set({ governorate: e.target.value })}>
                <option value="" disabled>Choose…</option>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              City or area
              <input className={input} required minLength={2} maxLength={80} value={editing.form.city} onChange={(e) => set({ city: e.target.value })} />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Street, building and apartment
            <input className={input} required minLength={6} maxLength={150} value={editing.form.line1} onChange={(e) => set({ line1: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            Landmark <span className="font-normal text-muted-foreground">(optional)</span>
            <input className={input} maxLength={150} value={editing.form.line2} onChange={(e) => set({ line2: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Save address
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
