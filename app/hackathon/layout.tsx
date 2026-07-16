import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Hackathon Agentic Payments Starter",
  description: "Start from an empty folder and run a verified 402, contract-enforced Stellar testnet payment, and protected 200 response with the REAPP SDK.",
  path: "/hackathon",
  keywords: ["agentic payments hackathon", "Stellar hackathon", "402 payment starter"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
