import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadAsset } from "@/lib/admin/products-helpers";
import { imageUrl } from "@/lib/store/format";
import { toast } from "sonner";

// The table is new, so the generated types do not list it yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("site_content");

export function useContent<T>(key: string, merge: (raw: unknown) => T) {
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

export function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />} Save changes
      </Button>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ImageField({ value, onChange, folder = "site" }: { value: string; onChange: (v: string) => void; folder?: string }) {
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

