// One place for the facts that appear in the shop text and legal pages.
// Change a value here and every page updates. Only put things here that are TRUE.
export const SITE = {
  name: "SentryHaus",
  // Days a customer has to return an item after it arrives.
  returnDays: 30,
  // Warranty length in months. Check with your supplier before you advertise a longer one.
  warrantyMonths: 12,
  // How long before an order is handed to the carrier (business days).
  processingDays: "1–3",
  // Typical delivery time after dispatch (business days). Honest range for imported stock.
  deliveryDays: "7–15",
  // Set a number (e.g. 99) to advertise free shipping over that amount. null = do not advertise.
  freeShippingOver: null as number | null,
  // Set real links to show social icons in the footer. Leave empty to hide them.
  social: { instagram: "", x: "", facebook: "", youtube: "" },
  lastUpdated: "30 October 2026",
};
