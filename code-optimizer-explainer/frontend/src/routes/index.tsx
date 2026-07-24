import { createFileRoute } from "@tanstack/react-router";
import { OptimizerApp } from "@/components/optimizer/OptimizerApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OptiCode — Understand and refine any code" },
      {
        name: "description",
        content:
          "Free, open-source AI tool to explain, humanize, prettify, shorten, SEO-optimize, or generate alternatives for any code snippet.",
      },
      { property: "og:title", content: "OptiCode" },
      {
        property: "og:description",
        content:
          "Paste any code and get plain-language explanations, cleaner formatting, or alternative implementations — powered by AI.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/logo.png" },
    ],
  }),
  component: Index,
});

function Index() {
  return <OptimizerApp />;
}
