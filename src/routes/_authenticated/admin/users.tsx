import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, ShieldCheck, UserX, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  suspended: boolean;
  last_login_at: string | null;
  created_at: string;
  roles: AppRole[];
};

const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin", admin: "Admin", manager: "Manager", staff: "Staff", customer: "Customer",
};

function UsersPage() {
  const { isSuperAdmin, isAdmin, user: me } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,suspended,last_login_at,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const roleMap = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      roleMap.set(r.user_id, arr);
    });
    setRows(((profiles ?? []) as Row[]).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) =>
      (r.email ?? "").toLowerCase().includes(query) ||
      (r.full_name ?? "").toLowerCase().includes(query),
    );
  }, [rows, q]);

  async function grantRole(userId: string, role: AppRole) {
    if (!isSuperAdmin && (role === "super_admin" || role === "admin")) {
      toast.error("Only Super Admin can grant this role.");
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success(`Granted ${ROLE_LABEL[role]}`);
    load();
  }
  async function revokeRole(userId: string, role: AppRole) {
    if (userId === me?.id && (role === "super_admin" || role === "admin")) {
      toast.error("You cannot revoke your own admin role.");
      return;
    }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${ROLE_LABEL[role]}`);
    load();
  }
  async function toggleSuspend(userId: string, next: boolean) {
    if (userId === me?.id) return toast.error("You cannot suspend yourself.");
    const { error } = await supabase.from("profiles").update({
      suspended: next,
      suspended_at: next ? new Date().toISOString() : null,
    }).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success(next ? "User suspended" : "User reinstated");
    load();
  }
  async function resetPassword(email: string | null) {
    if (!email) return toast.error("No email on file.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent.");
  }

  return (
    <PageShell
      title="Users & Roles"
      description="Manage admin, manager, staff, and customer accounts."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Users" }]}
    >
      <Card className="p-4">
        <div className="flex items-center gap-2 pb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name…" className="pl-9" />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} users</div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users match.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.roles.length === 0 ? <Badge variant="outline">customer</Badge> :
                        r.roles.map((role) => (
                          <Badge key={role} variant={role === "super_admin" || role === "admin" ? "default" : "secondary"}>
                            {ROLE_LABEL[role]}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.last_login_at ? new Date(r.last_login_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    {r.suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="outline">Active</Badge>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Grant role</DropdownMenuLabel>
                        {isSuperAdmin && <DropdownMenuItem onClick={() => grantRole(r.id, "super_admin")}><ShieldCheck className="size-4" /> Super Admin</DropdownMenuItem>}
                        {isSuperAdmin && <DropdownMenuItem onClick={() => grantRole(r.id, "admin")}><ShieldCheck className="size-4" /> Admin</DropdownMenuItem>}
                        {isAdmin && <DropdownMenuItem onClick={() => grantRole(r.id, "manager")}>Manager</DropdownMenuItem>}
                        {isAdmin && <DropdownMenuItem onClick={() => grantRole(r.id, "staff")}>Staff</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Revoke role</DropdownMenuLabel>
                        {r.roles.filter((x) => x !== "customer").map((role) => (
                          <DropdownMenuItem key={role} onClick={() => revokeRole(r.id, role)}>Remove {ROLE_LABEL[role]}</DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => resetPassword(r.email)}>Send password reset</DropdownMenuItem>
                        {r.suspended ? (
                          <DropdownMenuItem onClick={() => toggleSuspend(r.id, false)}><UserCheck className="size-4" /> Reinstate</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => toggleSuspend(r.id, true)} className="text-destructive"><UserX className="size-4" /> Suspend</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </PageShell>
  );
}