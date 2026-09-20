import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";

import { PwaRegister } from "@/components/pwa-register";
import { SiteHeader } from "@/components/site-header";
import { DEFAULT_NEIGHBORHOOD } from "@/lib/mock-data";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Neighborhood Marketplace",
    template: "%s · Neighborhood Marketplace",
  },
  description:
    "Shops and service people on your street. Pay cash or UPI at the counter or doorstep.",
  applicationName: "Neighborhood Marketplace",
  appleWebApp: {
    capable: true,
    title: "Nhood Market",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#44403c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerList = await headers();
  const neighborhood =
    cookieStore.get("neighborhood")?.value ?? DEFAULT_NEIGHBORHOOD.name;
  const host = headerList.get("host");

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-stone-50 font-sans text-stone-900 antialiased`}
      >
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
          <SiteHeader neighborhood={neighborhood} />
          <main className="flex-1 px-4 py-5">{children}</main>
          <footer className="px-4 pb-8 text-center text-xs text-stone-500">
            {host ? `${neighborhood} · ${host}` : neighborhood}
            <span className="block pt-1">
              Offline cash / UPI only. No payment gateways.
            </span>
          </footer>
        </div>
        <PwaRegister />
      </body>
    </html>
  );
}
