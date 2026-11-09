import { createFileRoute, redirect } from "@tanstack/react-router";

// There is no warranty on Rivvo products, so this page no longer exists. Old links go to the home page.
export const Route = createFileRoute("/warranty")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
