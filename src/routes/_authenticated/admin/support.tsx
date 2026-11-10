import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { sendSupportReply } from "@/lib/store/status-emails";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/support")({ component: SupportPage });

type Msg = {
  id: string;
  name: string;
  email: string;
  order_number: string | null;
  message: string;
  status: "new" | "read" | "answered";
  reply: string | null;
  replied_at: string | null;
  created_at: string;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
const badge: Record<Msg["status"], string> = {
  new: "bg-amber-100 text-amber-900",
  read: "bg-muted text-muted-foreground",
  answered: "bg-emerald-100 text-emerald-900",
};
const label: Record<Msg["status"], string> = { new: "New", read: "Read", answered: "Answered" };

function SupportPage() {
  const [rows, setRows] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Msg["status"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    // The table is new, so the generated types may not list it yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Msg[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const newCount = rows.filter((r) => r.status === "new").length;

  async function open(m: Msg) {
    setSelectedId(m.id);
    setReply("");
    if (m.status === "new") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("contact_messages")
        .update({ status: "read" })
        .eq("id", m.id);
      if (!error)
        setRows((prev) => prev.map((r) => (r.id === m.id ? { ...r, status: "read" } : r)));
    }
  }

  async function send() {
    if (!selected || sending) return;
    if (reply.trim().length < 2) return toast.error("Write your answer first.");
    setSending(true);
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) {
      setSending(false);
      return toast.error("Please sign in again.");
    }
    const r = await sendSupportReply({
      data: { accessToken: token, id: selected.id, reply },
    }).catch(() => ({ sent: false, error: "Something went wrong. Please try again." }));
    setSending(false);
    if (!r.sent) return toast.error(r.error ?? "The email could not be sent.");
    toast.success(`Answer emailed to ${selected.email}`);
    setReply("");
    load();
  }

  return (
    <PageShell
      title="Support"
      description="Messages from the Contact us page. Write your answer and Rivvo emails it to the customer."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Support" }]}
    >
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="p-0">
          <div className="flex flex-wrap gap-2 border-b border-border p-3">
            {(["all", "new", "read", "answered"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {f === "all"
                  ? `All (${rows.length})`
                  : f === "new"
                    ? `New (${newCount})`
                    : label[f]}
              </button>
            ))}
          </div>
          <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
            {loading && <li className="p-4 text-sm text-muted-foreground">Loading…</li>}
            {!loading && shown.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No messages here yet.</li>
            )}
            {shown.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => open(m)}
                  className={`block w-full p-3 text-left hover:bg-muted/60 ${m.id === selectedId ? "bg-muted" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-sm ${m.status === "new" ? "font-bold" : "font-medium"}`}
                    >
                      {m.name}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge[m.status]}`}
                    >
                      {label[m.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{when(m.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Choose a message on the left to read it and answer.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="font-display text-lg font-semibold">{selected.name}</p>
                <p className="text-sm text-muted-foreground">
                  <a className="underline" href={`mailto:${selected.email}`}>
                    {selected.email}
                  </a>{" "}
                  · {when(selected.created_at)}
                  {selected.order_number && (
                    <>
                      {" "}
                      · Order <strong className="text-foreground">{selected.order_number}</strong>
                    </>
                  )}
                </p>
              </div>
              <div className="whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm">
                {selected.message}
              </div>

              {selected.status === "answered" ? (
                <div>
                  <p className="mb-1 text-sm font-semibold">
                    Your answer{selected.replied_at ? ` (${when(selected.replied_at)})` : ""}
                  </p>
                  <div className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm">
                    {selected.reply}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This was emailed to the customer. If they write back, the reply arrives in the
                    Rivvo Gmail inbox.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold" htmlFor="reply">
                    Your answer
                  </label>
                  <Textarea
                    id="reply"
                    rows={7}
                    maxLength={5000}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write your answer here. The customer gets it by email from Rivvo."
                  />
                  <Button onClick={send} disabled={sending || reply.trim().length < 2}>
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}{" "}
                    Send answer by email
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
