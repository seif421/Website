import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { SITE } from "@/lib/site-config";

// Sends the order confirmation email. Runs only on the server, so the Gmail app password and the
// order secret never reach the browser. A failure here never blocks the order itself.

type ConfirmationItem = {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  image: string | null;
};
type Confirmation = {
  order_number: string;
  email: string;
  cod: boolean;
  subtotal: number;
  shipping: number;
  total: number;
  address: Record<string, string> | null;
  items: ConfirmationItem[];
};

// The voucher discount is whatever makes subtotal + delivery differ from the total.
function discountOf(c: Confirmation): number {
  return Math.max(0, Math.round((c.subtotal + c.shipping - c.total) * 100) / 100);
}

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase settings");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

export const egp = (n: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n) || 0)} EGP`;

export function buildConfirmationEmail(c: Confirmation) {
  const a = c.address ?? {};
  const address = [a.line1, a.line2, a.city, a.governorate].filter(Boolean).map(esc).join(", ");
  const rows = c.items
    .map(
      (i) => `<tr>
  <td style="padding:12px 0;border-bottom:1px solid #eee;width:72px">${
    i.image
      ? `<img src="${esc(i.image)}" width="64" height="64" alt="" style="display:block;border-radius:8px;object-fit:cover;background:#f4f4f4">`
      : ""
  }</td>
  <td style="padding:12px 8px;border-bottom:1px solid #eee;font-size:14px;color:#111">${esc(i.name)}<br><span style="color:#666;font-size:13px">${esc(i.quantity)} × ${egp(i.unit_price)}</span></td>
  <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;color:#111;text-align:right;white-space:nowrap">${egp(i.subtotal)}</td>
</tr>`,
    )
    .join("");
  const payLine = c.cod
    ? `<p style="margin:16px 0 0;font-size:14px;color:#111"><strong>Payment:</strong> cash on delivery. Please have <strong>${egp(c.total)}</strong> ready for the courier.</p>`
    : "";
  const contact = [
    SITE.whatsapp && `WhatsApp: ${esc(SITE.whatsapp)}`,
    SITE.phone && `Phone: ${esc(SITE.phone)}`,
    SITE.supportEmail && esc(SITE.supportEmail),
  ]
    .filter(Boolean)
    .join(" · ");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:28px">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;color:#666">${esc(SITE.name)}</p>
<h1 style="margin:0 0 8px;font-size:22px;color:#111">Thank you, we received your order</h1>
<p style="margin:0 0 20px;font-size:14px;color:#444">Order number <strong>${esc(c.order_number)}</strong>. We will call or message you shortly to confirm it. Delivery usually takes ${esc(SITE.deliveryDays)} business days after confirmation.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px;color:#111">
<tr><td style="padding:4px 0;color:#666">Subtotal</td><td style="padding:4px 0;text-align:right">${egp(c.subtotal)}</td></tr>
${discountOf(c) > 0 ? `<tr><td style="padding:4px 0;color:#666">Voucher discount</td><td style="padding:4px 0;text-align:right;color:#15803d">-${egp(discountOf(c))}</td></tr>` : ""}
<tr><td style="padding:4px 0;color:#666">Delivery</td><td style="padding:4px 0;text-align:right">${c.shipping > 0 ? egp(c.shipping) : "Free"}</td></tr>
<tr><td style="padding:10px 0 0;font-size:16px;font-weight:bold;border-top:1px solid #eee">Total</td><td style="padding:10px 0 0;font-size:16px;font-weight:bold;text-align:right;border-top:1px solid #eee">${egp(c.total)}</td></tr>
</table>
${payLine}
<p style="margin:16px 0 0;font-size:14px;color:#111"><strong>Delivery to:</strong> ${esc(a.full_name)}, ${address}${a.phone ? `<br>Phone: ${esc(a.phone)}` : ""}</p>
<p style="margin:24px 0 0;font-size:12px;color:#888">Questions about your order? Reply to this email${contact ? ` or contact us: ${contact}` : ""}. Quote your order number ${esc(c.order_number)}.</p>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    `Thank you, we received your order ${c.order_number}.`,
    ...c.items.map((i) => `- ${i.quantity} x ${i.name}: ${egp(i.subtotal)}`),
    `Subtotal: ${egp(c.subtotal)}`,
    discountOf(c) > 0 ? `Voucher discount: -${egp(discountOf(c))}` : "",
    `Delivery: ${c.shipping > 0 ? egp(c.shipping) : "Free"}`,
    `Total: ${egp(c.total)}`,
    c.cod ? `Payment: cash on delivery, ${egp(c.total)}.` : "",
    `We will call or message you shortly to confirm your order.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: `Your ${SITE.name} order ${c.order_number}`, html, text };
}

export const sendOrderConfirmation = createServerFn({ method: "POST" })
  .inputValidator((d: { orderNumber: string }) => {
    if (typeof d?.orderNumber !== "string" || !/^[A-Z0-9-]{4,30}$/i.test(d.orderNumber))
      throw new Error("Invalid order number");
    return { orderNumber: d.orderNumber };
  })
  .handler(async ({ data }): Promise<{ sent: boolean }> => {
    // Emails are sent from the shop's Gmail address using a Google "app password" (no domain needed).
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const secret = process.env.ORDER_SECRET;
    if (!user || !pass || !secret) {
      console.warn(
        "[order email] not configured: set GMAIL_USER, GMAIL_APP_PASSWORD and ORDER_SECRET",
      );
      return { sent: false };
    }
    const supabase = db();
    // The database hands the order over only once, only for a new order, and only with the secret.
    const { data: order, error } = await supabase.rpc(
      "claim_order_confirmation" as never,
      {
        p_order_number: data.orderNumber,
        p_secret: secret,
      } as never,
    );
    if (error || !order) {
      if (error) console.error("[order email] could not load order", error.message);
      return { sent: false };
    }
    const c = order as unknown as Confirmation;
    try {
      const mail = buildConfirmationEmail(c);
      const nodemailer = (await import("nodemailer")).default;
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass: pass.replace(/\s/g, "") },
        connectionTimeout: 8000,
        socketTimeout: 8000,
      });
      await transport.sendMail({
        from: `${SITE.name} <${user}>`,
        to: c.email,
        replyTo: SITE.supportEmail || user,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      return { sent: true };
    } catch (e) {
      console.error("[order email] send failed", e instanceof Error ? e.message : e);
      await supabase.rpc(
        "release_order_confirmation" as never,
        { p_order_number: data.orderNumber, p_secret: secret } as never,
      );
      return { sent: false };
    }
  });
