import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";
import "../lib/polyfills";

export const metadata: Metadata = {
  title: "OrbitPayroll",
  description: "Web3 payroll platform for organizations",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OrbitPayroll",
  },
  formatDetection: {
    telephone: false,
  },
};

// Force dynamic rendering — all pages depend on wallet/auth state via providers
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
