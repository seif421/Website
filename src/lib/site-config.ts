// One place for the facts that appear in the shop text and legal pages.
// Change a value here and every page updates. Only put things here that are TRUE.
export const SITE = {
  name: "Rivvo",
  // Public address of the website, used for links inside emails. Change it when you buy a domain.
  url: "https://rivvo-shop.vercel.app",
  // Days a customer has to return an item after it arrives.
  returnDays: 30,
  // Warranty length in months. Check with your supplier before you advertise a longer one.
  warrantyMonths: 12,
  // How long before an order is handed to the courier (business days).
  processingDays: "1–2",
  // Typical delivery time after dispatch (business days). Confirm with your supplier and courier.
  deliveryDays: "2–5",
  // Set a number (e.g. 1500) to advertise free delivery over that amount in EGP.
  // Keep it equal to the "Free delivery over" value in Admin > Delivery fees. null = do not advertise.
  freeShippingOver: null as number | null,
  // Your real contact details. Leave empty to hide them. WhatsApp number in international format, e.g. "201012345678".
  whatsapp: "+201010540342",
  phone: "",
  // Where customers can write to you. Also used as the reply address of order emails. Leave empty to hide.
  supportEmail: "rivvo.shops@gmail.com",
  // Set real links to show social icons in the footer. Leave empty to hide them.
  social: { instagram: "", x: "", facebook: "", youtube: "" },
  lastUpdated: "30 October 2026",
};
