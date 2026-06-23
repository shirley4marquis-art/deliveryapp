import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://royalruns.co.uk";
const ogImage = `${siteUrl}/images/royal-runs/courier-van-loading.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "TBC | UK Parcel Delivery & Courier Service",
  description:
    "TBC is a trusted UK courier and parcel delivery service. Fast, secure, and reliable same-day and next-day delivery across England, Scotland, Wales, and Northern Ireland. Track your parcel live.",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "TBC",
    title: "TBC — Fast & Reliable UK Parcel Delivery",
    description:
      "Book shipments, track every scan, and manage deliveries across the UK with TBC — a professional courier platform built for speed and trust.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "TBC courier loading parcels into a branded delivery van",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TBC — Fast & Reliable UK Parcel Delivery",
    description:
      "Book shipments, track every scan, and manage deliveries across the UK with TBC — a professional courier platform built for speed and trust.",
    images: [ogImage],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-[#07152f]">
        {children}
      </body>
    </html>
  );
}
