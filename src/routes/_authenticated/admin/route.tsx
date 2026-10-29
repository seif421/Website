import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { loading, isStaff, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [suspended, setSuspended] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setSuspended(null); return; }
    supabase.from("profiles").select("suspended").eq("id", user.id).maybeSingle()
      .then(({ data }) => setSuspended(Boolean(data?.suspended)));
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (suspended) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Account suspended</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This account has been suspended. Contact an administrator to restore access.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/auth", replace: true }); }}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Access denied</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account <span className="font-medium">{user?.email}</span> doesn't have permission
            to access the admin dashboard. Contact your administrator to be granted access.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild><Link to="/">Back to store</Link></Button>
            <Button asChild variant="outline"><Link to="/account">My account</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}