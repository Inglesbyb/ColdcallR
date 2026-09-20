import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "ColdcallR — B2B Sales Intelligence",
  description:
    "Mobile-first sales intelligence tool for commercial security reps. Tag leads, filter by crime data, and plot your route on a live map.",
  keywords: [
    "cold calling",
    "sales intelligence",
    "Liverpool",
    "CCTV",
    "intruder alarm",
    "B2B leads",
    "commercial security",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ColdcallR",
  },
  openGraph: {
    title: "ColdcallR",
    description: "B2B Sales Intelligence for Commercial Security",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevent zoom on mobile — map handles it
  userScalable: false,
  themeColor: "#07090f",
  viewportFit: "cover", // Extend into iPhone notch/island
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full bg-gradient-dark text-slate-100 antialiased overscroll-none font-inter">
        {children}
      </body>
    </html>
  );
}
