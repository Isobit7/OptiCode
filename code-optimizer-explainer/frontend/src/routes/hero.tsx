import { createFileRoute } from "@tanstack/react-router";
import { HeroPreviewPage } from "@/components/hero/HeroPreviewPage";

export const Route = createFileRoute("/hero")({
  head: () => ({
    meta: [
      { title: "Liquid Chrome Hero — OptiCode Preview" },
      {
        name: "description",
        content:
          "Liquid-metal WebGL hero preview adapted for the OptiCode design system.",
      },
    ],
  }),
  component: HeroRoute,
});

function HeroRoute() {
  return <HeroPreviewPage />;
}
