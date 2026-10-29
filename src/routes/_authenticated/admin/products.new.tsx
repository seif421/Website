import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/admin/page-shell";
import { ProductEditor } from "@/components/admin/product-editor";

export const Route = createFileRoute("/_authenticated/admin/products/new")({
  component: () => (
    <PageShell
      title="New product"
      description="Create a new product for your catalog."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Products", to: "/admin/products" }, { label: "New" }]}
    >
      <ProductEditor />
    </PageShell>
  ),
});