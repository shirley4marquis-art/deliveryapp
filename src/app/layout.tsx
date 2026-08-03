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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Royal Runs | UK Parcel Delivery & Courier Service",
  description:
    "Royal Runs is a trusted UK courier and parcel delivery service. Fast, secure, and reliable same-day and next-day delivery across England, Scotland, Wales, and Northern Ireland. Track your parcel live.",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Royal Runs",
    title: "Royal Runs — Fast & Reliable UK Parcel Delivery",
    description:
      "Book shipments, track every scan, and manage deliveries across the UK with Royal Runs — a professional courier platform built for speed and trust.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Royal Runs — Fast & Reliable UK Parcel Delivery",
    description:
      "Book shipments, track every scan, and manage deliveries across the UK with Royal Runs — a professional courier platform built for speed and trust.",
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
