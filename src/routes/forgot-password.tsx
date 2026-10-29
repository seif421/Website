import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/logo";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — SentryHaus" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) return toast.error("Enter a valid email");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for a reset link.");
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8"><Logo /></div>
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Forgot your password?</h1>
          <p className="mt-1 text-sm text-muted-foreground">We'll send a reset link to your email.</p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button className="w-full" disabled={busy}>Send reset link</Button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link to="/auth" className="text-brand hover:underline">← Back to sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}