// Plain-language order status for customers.

export const STATUS_LABEL: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  paid: "Confirmed",
  processing: "Being prepared",
  packed: "Being prepared",
  ready_to_ship: "Being prepared",
  shipped: "On its way",
  delivered: "Delivered",
  completed: "Delivered",
  cancelled: "Cancelled",
  refund_requested: "Refund requested",
  refunded: "Refunded",
  returned: "Returned",
  failed_payment: "Not completed",
};

export const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  paid: "bg-sky-100 text-sky-800",
  processing: "bg-sky-100 text-sky-800",
  packed: "bg-sky-100 text-sky-800",
  ready_to_ship: "bg-sky-100 text-sky-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
  refund_requested: "bg-rose-100 text-rose-800",
  refunded: "bg-rose-100 text-rose-800",
  returned: "bg-rose-100 text-rose-800",
  failed_payment: "bg-rose-100 text-rose-800",
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s.replace(/_/g, " ");

/** Steps of the progress bar. Returns -1 for orders that stopped (cancelled, refunded…). */
export function progressStep(s: string): number {
  if (["pending"].includes(s)) return 0;
  if (["confirmed", "paid", "processing", "packed", "ready_to_ship"].includes(s)) return 1;
  if (s === "shipped") return 2;
  if (["delivered", "completed"].includes(s)) return 3;
  return -1;
}

export const PROGRESS_STEPS = ["Placed", "Confirmed", "On its way", "Delivered"];
