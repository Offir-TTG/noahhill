import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import UIProviders from "@/components/ui-providers";
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

export const metadata: Metadata = {
  title: "Noah Hill — Official Site",
  description:
    "The official home of Noah Hill. Listen to the new single 'hurt somebody', watch videos, and find tour dates.",
  openGraph: {
    title: "Noah Hill — hurt somebody (out now)",
    description: "The official home of Noah Hill.",
    type: "website",
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
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--ink)] text-[var(--cream)] selection:bg-[var(--cream)] selection:text-[var(--ink)]">
        <UIProviders>{children}</UIProviders>
      </body>
    </html>
  );
}
