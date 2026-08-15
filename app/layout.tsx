// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketWatch — Real-Time Multi-Source Watchlist",
  description:
    "Track stocks, crypto, forex, and indices in real-time from Yahoo Finance, Binance, OKX and more. Powered by WebAssembly for blazing-fast performance.",
  keywords: ["stock watchlist", "crypto watchlist", "binance", "yahoo finance", "okx", "market tracker"],
  openGraph: {
    title: "MarketWatch",
    description: "Track Every Market, All in One Place",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
