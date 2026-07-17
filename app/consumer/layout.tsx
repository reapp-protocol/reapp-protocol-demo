import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Consumer Agent Spending Preview",
  description:
    "Preview how a person can give an AI agent a task, a bounded budget, approved services, and a deadline without handing over open-ended payment authority.",
  path: "/consumer",
  keywords: [
    "consumer AI agent payments",
    "AI spending controls",
    "bounded agent wallet",
    "consumer agent mandates",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
