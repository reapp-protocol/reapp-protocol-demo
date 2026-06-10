import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

const SITE =
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

const title = "REAPP — agent payments, enforced on-chain";
const description =
  "An AI agent makes pay-per-use payments, capped on-chain by the REAPP MandateRegistry on Stellar. Built on @reapp-sdk/core.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title,
  description,
  // og:image + twitter:image are generated from app/opengraph-image.tsx automatically.
  openGraph: { title, description, siteName: "REAPP", type: "website", url: "/" },
  twitter: { card: "summary_large_image", title, description },
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
      <body className="min-h-screen antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
