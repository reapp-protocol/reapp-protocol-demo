import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Agentic Payments for Express",
  description: "A live Express agentic payments flow that verifies REAPP settlement, contract events, token transfer, resource scope, and one-time redemption before fulfillment.",
  path: "/express",
  keywords: ["Express middleware", "pay-per-use API", "payment verification"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
