import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { SITE } from "@/lib/site-config";
import { esc, egp } from "@/lib/store/order-email";

// Welcome, "shipped" and "delivered" emails. They run only on the server so the Gmail app password
// and the order secret never reach the browser. A failure here never blocks anything the customer or admin does.

type Item = {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  image: string | null;
};
type StatusOrder = {
  order_number: string;
  email: string;
  cod: boolean;
  subtotal: number;
  shipping: number;
  total: number;
  carrier: string | null;
  tracking_number: string | null;
  address: Record<string, string> | null;
  items: Item[];
};
type Mail = { subject: string; html: string; text: string };

function db(accessToken?: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase settings");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
  });
}

async function deliver(to: string, mail: Mail) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("Email is not configured");
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
    to,
    replyTo: SITE.supportEmail || user,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}

const waDigits = SITE.whatsapp.replace(/\D/g, "");

function contactLine() {
  const parts = [
    SITE.whatsapp && `WhatsApp: ${esc(SITE.whatsapp)}`,
    SITE.phone && `Phone: ${esc(SITE.phone)}`,
    SITE.supportEmail && esc(SITE.supportEmail),
  ].filter(Boolean);
  return parts.join(" · ");
}

function button(href: string, label: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:999px">${esc(label)}</a>`;
}

function shell(heading: string, inner: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:28px">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;color:#666">${esc(SITE.name)}</p>
<h1 style="margin:0 0 12px;font-size:22px;color:#111">${esc(heading)}</h1>
${inner}
<p style="margin:24px 0 0;font-size:12px;color:#888">${footer}</p>
</td></tr></table></td></tr></table></body></html>`;
}

function itemRows(items: Item[]) {
  return items
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
}

function totals(o: StatusOrder) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px;color:#111">
<tr><td style="padding:4px 0;color:#666">Subtotal</td><td style="padding:4px 0;text-align:right">${egp(o.subtotal)}</td></tr>
<tr><td style="padding:4px 0;color:#666">Delivery</td><td style="padding:4px 0;text-align:right">${o.shipping > 0 ? egp(o.shipping) : "Free"}</td></tr>
<tr><td style="padding:10px 0 0;font-size:16px;font-weight:bold;border-top:1px solid #eee">Total</td><td style="padding:10px 0 0;font-size:16px;font-weight:bold;text-align:right;border-top:1px solid #eee">${egp(o.total)}</td></tr>
</table>`;
}

function addressBlock(o: StatusOrder) {
  const a = o.address ?? {};
  const line = [a.line1, a.line2, a.city, a.governorate].filter(Boolean).map(esc).join(", ");
  return `<p style="margin:16px 0 0;font-size:14px;color:#111"><strong>Delivery to:</strong> ${esc(a.full_name)}, ${line}${a.phone ? `<br>Phone: ${esc(a.phone)}` : ""}</p>`;
}

export function buildWelcomeEmail(fullName: string): Mail {
  const first = fullName.trim().split(/\s+/)[0] || "";
  const hi = first ? `Welcome, ${first}` : "Welcome";
  const inner = `<p style="margin:0 0 16px;font-size:14px;color:#444">Your ${esc(SITE.name)} account is ready. Here is how shopping with us works:</p>
<ul style="margin:0 0 20px;padding-left:18px;font-size:14px;color:#444;line-height:1.7">
<li>Pay cash when your order arrives. No card needed.</li>
<li>We call or message you to confirm every order.</li>
<li>Delivery usually takes ${esc(SITE.deliveryDays)} business days after confirmation.</li>
<li>You have ${esc(SITE.returnDays)} days to return an item after it arrives.</li>
</ul>
<p style="margin:0">${button(`${SITE.url}/shop`, "Start shopping")}</p>`;
  const html = shell(
    hi,
    inner,
    `Questions? Reply to this email${contactLine() ? ` or contact us: ${contactLine()}` : ""}.`,
  );
  const text = [
    `${hi}!`,
    `Your ${SITE.name} account is ready.`,
    `- Pay cash when your order arrives.`,
    `- We call or message you to confirm every order.`,
    `- Delivery usually takes ${SITE.deliveryDays} business days after confirmation.`,
    `- You have ${SITE.returnDays} days to return an item after it arrives.`,
    `Start shopping: ${SITE.url}/shop`,
  ].join("\n");
  return { subject: `Welcome to ${SITE.name}`, html, text };
}

export function buildShippedEmail(o: StatusOrder): Mail {
  const track =
    o.carrier || o.tracking_number
      ? `<p style="margin:16px 0 0;font-size:14px;color:#111"><strong>Courier:</strong> ${esc([o.carrier, o.tracking_number && `tracking ${o.tracking_number}`].filter(Boolean).join(", "))}</p>`
      : "";
  const pay = o.cod
    ? `<p style="margin:16px 0 0;font-size:14px;color:#111"><strong>Payment:</strong> cash on delivery. Please have <strong>${egp(o.total)}</strong> ready for the courier.</p>`
    : "";
  const inner = `<p style="margin:0 0 20px;font-size:14px;color:#444">Good news, your order <strong>${esc(o.order_number)}</strong> has been shipped and is on its way to you. Delivery usually takes ${esc(SITE.deliveryDays)} business days. The courier may call you before arriving, so please keep your phone on.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(o.items)}</table>
${totals(o)}${pay}${track}${addressBlock(o)}`;
  const html = shell(
    "Your order has been shipped",
    inner,
    `Questions about your delivery? Reply to this email${contactLine() ? ` or contact us: ${contactLine()}` : ""}. Quote your order number ${esc(o.order_number)}.`,
  );
  const text = [
    `Your order ${o.order_number} has been shipped.`,
    ...o.items.map((i) => `- ${i.quantity} x ${i.name}: ${egp(i.subtotal)}`),
    `Total: ${egp(o.total)}`,
    o.cod ? `Payment: cash on delivery, ${egp(o.total)}.` : "",
    o.carrier || o.tracking_number
      ? `Courier: ${[o.carrier, o.tracking_number].filter(Boolean).join(" ")}`
      : "",
    `Delivery usually takes ${SITE.deliveryDays} business days.`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject: `Your ${SITE.name} order ${o.order_number} has been shipped`, html, text };
}

export function buildDeliveredEmail(o: StatusOrder): Mail {
  const wa = waDigits
    ? `<p style="margin:12px 0 0">${button(`https://wa.me/${waDigits}?text=${encodeURIComponent(`Hello, my feedback on order ${o.order_number}: `)}`, "Send feedback on WhatsApp")}</p>`
    : "";
  const inner = `<p style="margin:0 0 20px;font-size:14px;color:#444">Your order <strong>${esc(o.order_number)}</strong> was delivered successfully. Thank you for shopping with ${esc(SITE.name)}!</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(o.items)}</table>
${totals(o)}
<div style="margin-top:24px;padding:16px;background:#f6f6f6;border-radius:10px">
<p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#111">How did we do?</p>
<p style="margin:0;font-size:14px;color:#444;line-height:1.6">We would love your feedback. Just reply to this email and tell us about the product quality, the delivery and how we treated you. Photos are welcome. It takes one minute and helps us improve.</p>
${wa}
</div>
<p style="margin:16px 0 0;font-size:14px;color:#444">Something not right? Tell us within ${esc(SITE.returnDays)} days and we will help you with a return or exchange.</p>`;
  const html = shell(
    "Your order was delivered",
    inner,
    `Reply to this email${contactLine() ? ` or contact us: ${contactLine()}` : ""}. Quote your order number ${esc(o.order_number)}.`,
  );
  const text = [
    `Your order ${o.order_number} was delivered successfully. Thank you for shopping with ${SITE.name}!`,
    ...o.items.map((i) => `- ${i.quantity} x ${i.name}: ${egp(i.subtotal)}`),
    `Total: ${egp(o.total)}`,
    ``,
    `How did we do? Reply to this email and tell us about the product quality, the delivery and our service. Photos are welcome.`,
    SITE.whatsapp ? `Or message us on WhatsApp: ${SITE.whatsapp}` : "",
    `Something not right? Tell us within ${SITE.returnDays} days and we will help.`,
  ]
    .filter((l) => l !== "")
    .join("\n");
  return {
    subject: `Your ${SITE.name} order ${o.order_number} was delivered. How did we do?`,
    html,
    text,
  };
}

// Welcome email: the signed-in customer claims their own welcome once, so it only ever goes to their own address.
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { accessToken: string }) => {
    if (
      typeof d?.accessToken !== "string" ||
      d.accessToken.length < 20 ||
      d.accessToken.length > 4000
    )
      throw new Error("Invalid session");
    return { accessToken: d.accessToken };
  })
  .handler(async ({ data }): Promise<{ sent: boolean }> => {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return { sent: false };
    const supabase = db(data.accessToken);
    const { data: claim, error } = await supabase.rpc("claim_welcome_email" as never);
    if (error || !claim) {
      if (error) console.error("[welcome email] claim failed", error.message);
      return { sent: false };
    }
    const c = claim as unknown as { email: string; full_name: string };
    try {
      await deliver(c.email, buildWelcomeEmail(c.full_name));
      return { sent: true };
    } catch (e) {
      console.error("[welcome email] send failed", e instanceof Error ? e.message : e);
      await supabase.rpc("release_welcome_email" as never);
      return { sent: false };
    }
  });

// Shipped / delivered emails. The database only hands the order over if it really has that status and
// the email was not sent before, so repeating this call can never send a duplicate.
export const sendOrderStatusEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { orderNumber: string; kind: "shipped" | "delivered" }) => {
    if (typeof d?.orderNumber !== "string" || !/^[A-Z0-9-]{4,30}$/i.test(d.orderNumber))
      throw new Error("Invalid order number");
    if (d.kind !== "shipped" && d.kind !== "delivered") throw new Error("Invalid email type");
    return { orderNumber: d.orderNumber, kind: d.kind };
  })
  .handler(async ({ data }): Promise<{ sent: boolean }> => {
    const secret = process.env.ORDER_SECRET;
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !secret) {
      console.warn(
        "[status email] not configured: set GMAIL_USER, GMAIL_APP_PASSWORD and ORDER_SECRET",
      );
      return { sent: false };
    }
    const supabase = db();
    const { data: order, error } = await supabase.rpc(
      "claim_order_status_email" as never,
      {
        p_order_number: data.orderNumber,
        p_kind: data.kind,
        p_secret: secret,
      } as never,
    );
    if (error || !order) {
      if (error) console.error("[status email] could not load order", error.message);
      return { sent: false };
    }
    const o = order as unknown as StatusOrder;
    try {
      await deliver(
        o.email,
        data.kind === "shipped" ? buildShippedEmail(o) : buildDeliveredEmail(o),
      );
      return { sent: true };
    } catch (e) {
      console.error("[status email] send failed", e instanceof Error ? e.message : e);
      await supabase.rpc(
        "release_order_status_email" as never,
        { p_order_number: data.orderNumber, p_kind: data.kind, p_secret: secret } as never,
      );
      return { sent: false };
    }
  });

export function buildSupportReplyEmail(m: {
  name: string;
  order_number: string | null;
  message: string;
  reply: string;
}): Mail {
  const first = m.name.trim().split(/\s+/)[0] || "";
  const html = (t: string) => esc(t).replace(/\r?\n/g, "<br>");
  const inner = `<p style="margin:0 0 6px;font-size:14px;color:#111">Hi${first ? ` ${esc(first)}` : ""},</p>
<p style="margin:0 0 20px;font-size:14px;color:#111;line-height:1.6">${html(m.reply)}</p>
<div style="padding:14px 16px;background:#f6f6f6;border-radius:10px">
<p style="margin:0 0 6px;font-size:12px;color:#888">Your message${m.order_number ? ` (order ${esc(m.order_number)})` : ""}</p>
<p style="margin:0;font-size:13px;color:#555;line-height:1.5">${html(m.message)}</p>
</div>`;
  const footer = `Need anything else? Just reply to this email${contactLine() ? ` or contact us: ${contactLine()}` : ""}.`;
  const text = [
    `Hi${first ? ` ${first}` : ""},`,
    "",
    m.reply,
    "",
    "---",
    `Your message${m.order_number ? ` (order ${m.order_number})` : ""}:`,
    m.message,
    "",
    `Need anything else? Just reply to this email.`,
  ].join("\n");
  return {
    subject: `Re: your message to ${SITE.name}`,
    html: shell(`Your answer from ${SITE.name}`, inner, footer),
    text,
  };
}

// Staff answer a contact-form message. The database checks that the caller is staff and saves the answer once;
// this function then emails it to the customer and puts the message back if the email fails.
export const sendSupportReply = createServerFn({ method: "POST" })
  .inputValidator((d: { accessToken: string; id: string; reply: string }) => {
    if (
      typeof d?.accessToken !== "string" ||
      d.accessToken.length < 20 ||
      d.accessToken.length > 4000
    )
      throw new Error("Invalid session");
    if (typeof d.id !== "string" || !/^[0-9a-f-]{36}$/i.test(d.id))
      throw new Error("Invalid message");
    if (typeof d.reply !== "string" || d.reply.length > 5000) throw new Error("Invalid answer");
    return { accessToken: d.accessToken, id: d.id, reply: d.reply };
  })
  .handler(async ({ data }): Promise<{ sent: boolean; error?: string }> => {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
      return { sent: false, error: "Email sending is not set up." };
    const supabase = db(data.accessToken);
    const { data: claim, error } = await supabase.rpc(
      "claim_support_reply" as never,
      { p_id: data.id, p_reply: data.reply } as never,
    );
    if (error || !claim)
      return { sent: false, error: error?.message ?? "Could not save the answer." };
    const m = claim as unknown as {
      name: string;
      email: string;
      order_number: string | null;
      message: string;
      reply: string;
    };
    try {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email))
        throw new Error("The customer's email address is not valid.");
      await deliver(m.email, buildSupportReplyEmail(m));
      return { sent: true };
    } catch (e) {
      console.error("[support reply] send failed", e instanceof Error ? e.message : e);
      await supabase.rpc("release_support_reply" as never, { p_id: data.id } as never);
      return {
        sent: false,
        error: "The email could not be sent. Your answer was not saved, so you can try again.",
      };
    }
  });
