import { createFileRoute, redirect } from "@tanstack/react-router";

// Hidden: customer emails (welcome, order, shipped, delivered) are written in the code, so this editor did nothing.
export const Route = createFileRoute("/_authenticated/admin/email-templates")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
