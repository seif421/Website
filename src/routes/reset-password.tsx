import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/logo";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — Rivvo" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error(t("Use at least 8 characters"));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("Password updated"));
    navigate({ to: "/auth", search: { redirect: "/" } });
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo />
        </div>
        <Card className="p-6">
          <h1 className="text-xl font-semibold">{t("Set a new password")}</h1>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rp">{t("New password")}</Label>
              <Input
                id="rp"
                type="password"
                dir="ltr"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={busy}>
              {t("Update password")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
