import { createFileRoute } from "@tanstack/react-router";
import { OptimizerApp } from "@/components/optimizer/app/OptimizerApp";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "OptiCode Chat — AI Companion" },
      {
        name: "description",
        content: "Chat interface for code optimization and explanation.",
      },
    ],
  }),
  component: ChatRoute,
});

function ChatRoute() {
  return <OptimizerApp />;
}
