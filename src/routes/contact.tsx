import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/layout";
import { pageHead } from "@/components/site/legal-page";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => pageHead("Contact us", "Send a message to the SentryHaus team."),
  component: ContactPage,
});

const input =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function ContactPage() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    // Hidden field: real people leave it empty, simple bots fill it in.
    if (String(data.get("website") ?? "")) return;
    setState("sending");
    const order = String(data.get("order") ?? "").trim();
    // The table is new, so the generated types may not list it yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("contact_messages").insert({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      order_number: order || null,
      message: String(data.get("message") ?? "").trim(),
    });
    if (error) {
      setState("error");
      return;
    }
    form.reset();
    setState("sent");
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-3 text-muted-foreground">
          Questions about a product or an order? Send us a message and we will reply by email.
        </p>

        {state === "sent" ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6" role="status">
            <p className="font-display text-lg font-semibold">Thank you, your message was sent.</p>
            <p className="mt-1 text-sm text-muted-foreground">We will reply to the email address you gave us.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-sm font-medium">
              Your name
              <input name="name" required maxLength={100} autoComplete="name" className={`${input} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input name="email" type="email" required maxLength={200} autoComplete="email" className={`${input} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              Order number <span className="font-normal text-muted-foreground">(optional)</span>
              <input name="order" maxLength={60} className={`${input} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              Message
              <textarea name="message" required minLength={5} maxLength={3000} rows={6} className={`${input} mt-1`} />
            </label>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            {state === "error" && (
              <p className="text-sm text-destructive" role="alert">
                Sorry, the message could not be sent. Please try again in a moment.
              </p>
            )}
            <button
              type="submit"
              disabled={state === "sending"}
              className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {state === "sending" ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </section>
    </SiteLayout>
  );
}
