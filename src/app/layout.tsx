import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import UIProviders from "@/components/ui-providers";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060a0d",
  colorScheme: "dark",
};

/**
 * Defaults only. The homepage overrides title, description and image from the
 * database in generateMetadata, so a share preview cannot drift from the site
 * the way a hardcoded "out now" did.
 */
export const metadata: Metadata = {
  // Makes every relative OpenGraph and canonical URL resolve against the real
  // domain instead of localhost.
  metadataBase: new URL(SITE_URL),
  title: "Noah Hill",
  description: "The official home of Noah Hill.",
  openGraph: {
    title: "Noah Hill",
    description: "The official home of Noah Hill.",
    type: "website",
    siteName: "Noah Hill",
  },
  twitter: {
    // The default is a small square thumbnail; this shows the full image.
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--ink)] text-[var(--cream)] selection:bg-[var(--cream)] selection:text-[var(--ink)]">
        <UIProviders>{children}</UIProviders>
      </body>
    </html>
  );
}
