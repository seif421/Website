import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Boxes,
  Tag, Star, BarChart3, LineChart, Megaphone, Settings, UserCog,
  ScrollText, LifeBuoy, ShieldCheck, Award, Truck, ListTree,
  Ship, Undo2, Bell, Gift, Mail,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; roles?: ("admin" | "manager" | "staff")[] };

const overview: Item[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Analytics", url: "/admin/analytics", icon: LineChart, roles: ["admin"] },
  { title: "Reports", url: "/admin/reports", icon: BarChart3, roles: ["admin", "manager"] },
];
const commerce: Item[] = [
  { title: "Products", url: "/admin/products", icon: Package, roles: ["admin", "manager"] },
  { title: "Categories", url: "/admin/categories", icon: FolderTree, roles: ["admin", "manager"] },
  { title: "Brands", url: "/admin/brands", icon: Award, roles: ["admin", "manager"] },
  { title: "Suppliers", url: "/admin/suppliers", icon: Truck, roles: ["admin", "manager"] },
  { title: "Attributes", url: "/admin/attributes", icon: ListTree, roles: ["admin", "manager"] },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Returns", url: "/admin/returns", icon: Undo2 },
  { title: "Shipping", url: "/admin/shipping", icon: Ship, roles: ["admin", "manager"] },
  { title: "Customers", url: "/admin/customers", icon: Users, roles: ["admin", "manager"] },
  { title: "Inventory", url: "/admin/inventory", icon: Boxes },
  { title: "Coupons", url: "/admin/coupons", icon: Tag, roles: ["admin", "manager"] },
  { title: "Gift Cards", url: "/admin/gift-cards", icon: Gift, roles: ["admin", "manager"] },
  { title: "Reviews", url: "/admin/reviews", icon: Star },
];
const growth: Item[] = [
  { title: "Marketing", url: "/admin/marketing", icon: Megaphone, roles: ["admin", "manager"] },
  { title: "Email Templates", url: "/admin/email-templates", icon: Mail, roles: ["admin", "manager"] },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Support", url: "/admin/support", icon: LifeBuoy },
];
const system: Item[] = [
  { title: "Users", url: "/admin/users", icon: UserCog, roles: ["admin"] },
  { title: "Activity Logs", url: "/admin/activity", icon: ScrollText, roles: ["admin"] },
  { title: "Settings", url: "/admin/settings", icon: Settings, roles: ["admin"] },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasAnyRole, isAdmin } = useAuth();

  const can = (item: Item) => {
    if (!item.roles) return true;
    if (isAdmin) return true;
    return hasAnyRole(item.roles);
  };

  const isActive = (url: string) => (url === "/admin" ? pathname === "/admin" : pathname.startsWith(url));

  const renderGroup = (label: string, items: Item[]) => {
    const visible = items.filter(can);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup key={label}>
        {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="size-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-1">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">SentryHaus</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Overview", overview)}
        {renderGroup("Commerce", commerce)}
        {renderGroup("Growth", growth)}
        {renderGroup("System", system)}
      </SidebarContent>
    </Sidebar>
  );
}