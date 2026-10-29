import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/logo";
import { ShieldCheck, Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/setup-admin")({
  head: () => ({
    meta: [
      { title: "Initial setup — SentryHaus" },
      { name: "description", content: "One-time super admin setup for a fresh SentryHaus installation." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc("admin_setup_status");
      if (!alive) return;
      if (error) {
        setAdminExists(true); // fail closed
      } else {
        const status = data as { admin_exists: boolean } | null;
        setAdminExists(Boolean(status?.admin_exists));
      }
      setChecking(false);
    })();
    return () => { alive = false; };
  }, []);

  async function claim() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("setup_first_admin");
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("setup_already_completed") ? "Setup already completed." : "Setup failed.");
      setAdminExists(true);
      return;
    }
    toast.success("You are now the Super Admin.");
    // Refresh session/roles then redirect
    await supabase.auth.refreshSession();
    navigate({ to: "/admin", replace: true });
  }

  const blocked = adminExists === true;

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8"><Logo /></div>
        <Card className="p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              {blocked ? <Lock className="size-5" /> : <ShieldCheck className="size-5" />}
            </div>
            <div>
              <h1 className="font-semibold">First-time setup</h1>
              <p className="text-xs text-muted-foreground">One-time super admin initialization</p>
            </div>
          </div>

          {checking || loading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking setup status…
            </div>
          ) : blocked ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm">
                Setup is already completed. This page is permanently disabled.
              </p>
              <Button asChild variant="outline" className="w-full"><Link to="/auth">Sign in</Link></Button>
            </div>
          ) : !user ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm">
                To claim Super Admin, first sign in or create your account. The very next
                click will make that account the store's Super Admin.
              </p>
              <Button asChild className="w-full"><Link to="/auth">Sign in / create account</Link></Button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-sm">
                Signed in as <span className="font-medium">{user.email}</span>. Click below to
                claim the Super Admin role. This can only be done once.
              </p>
              <Button className="w-full" onClick={claim} disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Claim Super Admin
              </Button>
            </div>
          )}
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to store</Link>
        </p>
      </div>
    </div>
  );
}