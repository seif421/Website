import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/admin/page-shell";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: () => (
    <PageShell title="Support" description="Customer messages and tickets." breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Support" }]}>
      <ComingSoon feature="Helpdesk inbox" />
    </PageShell>
  ),
});