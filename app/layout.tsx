import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REAPP — Agent Pay-Per-Use Demo",
  description:
    "An AI agent makes pay-per-use content payments, enforced on-chain by the REAPP MandateRegistry on Stellar testnet. Built on @reapp-sdk/core.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
