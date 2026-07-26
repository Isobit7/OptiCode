import { createFileRoute } from "@tanstack/react-router";
import { OptimizerApp } from "@/components/optimizer/app/OptimizerApp";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "OptiCode Workspace — AI Code Optimizer & Explainer" },
      {
        name: "description",
        content:
          "Interactive AI workspace for code explanation, humanization, security auditing, flowcharting, and code translation.",
      },
    ],
  }),
  component: AppRoute,
});

function AppRoute() {
  return <OptimizerApp />;
}
