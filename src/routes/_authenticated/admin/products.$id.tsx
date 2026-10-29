import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/admin/page-shell";
import { ProductEditor } from "@/components/admin/product-editor";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  return (
    <PageShell
      title="Edit product"
      description="Update every product field, media, pricing, inventory, and metadata."
      breadcrumbs={[
        { label: "Admin", to: "/admin" },
        { label: "Products", to: "/admin/products" },
        { label: "Edit" },
      ]}
    >
      <ProductEditor productId={id} />
    </PageShell>
  );
}