import { supabase } from "@/integrations/supabase/client";

export const ORDER_STATUSES = [
  "pending","confirmed","paid","processing","packed","ready_to_ship",
  "shipped","delivered","completed","cancelled","refund_requested",
  "refunded","returned","failed_payment",
] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  paid: "Paid",
  processing: "Processing",
  packed: "Packed",
  ready_to_ship: "Ready to Ship",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  refund_requested: "Refund Requested",
  refunded: "Refunded",
  returned: "Returned",
  failed_payment: "Failed Payment",
};

export const ORDER_STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  packed: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  ready_to_ship: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  shipped: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-emerald-600/20 text-emerald-800 dark:text-emerald-200",
  cancelled: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  refund_requested: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  refunded: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  returned: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  failed_payment: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function money(v: number | string | null | undefined, currency = "USD") {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export function shortDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function relativeTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(d);
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function downloadBlob(name: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export async function addOrderTimeline(order_id: string, event: string, message?: string, metadata?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("order_timeline").insert({
    order_id, event, message: message ?? null,
    metadata: (metadata ?? {}) as never,
    actor_id: user?.id ?? null,
  });
}

export async function notifyStaff(type: string, title: string, message?: string, link?: string, metadata?: Record<string, unknown>) {
  await supabase.from("notifications").insert({
    audience: "staff", type, title,
    message: message ?? null,
    link: link ?? null,
    metadata: (metadata ?? {}) as never,
  });
}