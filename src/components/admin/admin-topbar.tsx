import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search, LogOut, User, Moon, Sun, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

const MOCK_NOTIFICATIONS = [
  { id: 1, title: "New order #SH-A1B2C3D4", body: "$249.00 — Smart Doorbell Pro", time: "2m ago" },
  { id: 2, title: "Low stock alert", body: "Indoor Cam 2K — 3 left", time: "1h ago" },
  { id: 3, title: "New review", body: "5★ on Smart Lock Vault", time: "3h ago" },
  { id: 4, title: "Payment failed", body: "Order #SH-9F8E7D — retry needed", time: "Yesterday" },
];

export function AdminTopbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("admin-theme") : null;
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("admin-theme", next ? "dark" : "light");
  }

  const initials = (user?.email ?? "A").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur px-3 sm:px-4">
      <SidebarTrigger />
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products, orders, customers…"
          className="h-9 pl-9"
        />
      </div>
      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-4" />
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">{MOCK_NOTIFICATIONS.length}</Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          <ul className="max-h-80 divide-y overflow-y-auto">
            {MOCK_NOTIFICATIONS.map((n) => (
              <li key={n.id} className="px-4 py-3 hover:bg-muted/40">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{n.time}</p>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full hover:opacity-80">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{user?.email ?? "Account"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/admin/profile"><User className="size-4" /> Profile</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/admin/settings"><Settings className="size-4" /> Settings</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/auth", replace: true }); }}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}