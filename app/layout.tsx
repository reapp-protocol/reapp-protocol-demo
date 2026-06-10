import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REAPP — Agent Pay-Per-Use Demo",
  description:
    "An AI agent makes pay-per-use content payments, enforced on-chain by the REAPP MandateRegistry on Stellar testnet. Built on @reapp-sdk/core.",
};

// Mobile: lock to device width, disable pinch/zoom so the layout can't be
// scrolled horizontally on phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0e0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
