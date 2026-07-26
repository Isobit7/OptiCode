import { createFileRoute } from "@tanstack/react-router";
import { HeroPreviewPage } from "@/components/hero/HeroPreviewPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OptiCode — Understand and refine any code" },
      {
        name: "description",
        content:
          "Free, open-source AI tool to explain, humanize, security-audit, translate, prettify, or generate alternatives for any code snippet.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <HeroPreviewPage />;
}
