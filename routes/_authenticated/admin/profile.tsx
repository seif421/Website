import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/admin/profile")({
  component: ProfilePage,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company_name: z.string().trim().max(100).optional().or(z.literal("")),
  avatar_url: z.string().trim().url().max(500).optional().or(z.literal("")),
});

function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: "", phone: "", company_name: "", avatar_url: "" });
  const [busy, setBusy] = useState(false);
  const [newPw, setNewPw] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          company_name: data.company_name ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      }
    });
  }, [user]);

  async function save() {
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, email: user.email,
      ...parsed.data,
      phone: parsed.data.phone || null,
      company_name: parsed.data.company_name || null,
      avatar_url: parsed.data.avatar_url || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  }

  async function changePassword() {
    if (newPw.length < 8) return toast.error("At least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewPw("");
    toast.success("Password changed");
  }

  const initials = (form.full_name || user?.email || "A").slice(0, 1).toUpperCase();

  return (
    <PageShell title="My Profile" description="Update your personal information." breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Profile" }]}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {form.avatar_url && <AvatarImage src={form.avatar_url} />}
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="av">Avatar URL</Label>
              <Input id="av" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fn">Full name</Label>
            <Input id="fn" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ph">Phone</Label>
            <Input id="ph" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="co">Company name</Label>
            <Input id="co" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </div>
          <Button onClick={save} disabled={busy}>Save changes</Button>
        </Card>

        <Card className="p-6 space-y-4 h-fit">
          <h3 className="font-semibold">Change password</h3>
          <div className="space-y-1.5">
            <Label htmlFor="np">New password</Label>
            <Input id="np" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <Button onClick={changePassword} disabled={busy || !newPw} variant="outline" className="w-full">Update password</Button>
        </Card>
      </div>
    </PageShell>
  );
}