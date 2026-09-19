import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Liverpool SecureMap — B2B Sales Intelligence",
  description:
    "Mobile-first sales intelligence map for commercial security reps covering the Liverpool metro area. Real-time crime data, company intelligence, and visit tracking.",
  keywords: [
    "commercial security",
    "sales intelligence",
    "Liverpool",
    "CCTV",
    "intruder alarm",
    "B2B leads",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SecureMap",
  },
  openGraph: {
    title: "Liverpool SecureMap",
    description: "B2B Sales Intelligence for Commercial Security",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevent zoom on mobile — map handles it
  userScalable: false,
  themeColor: "#0f172a",
  viewportFit: "cover", // Extend into iPhone notch/island
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full bg-slate-950 text-slate-100 antialiased overscroll-none font-inter">
        {children}
      </body>
    </html>
  );
}
