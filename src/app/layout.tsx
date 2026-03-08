import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MTS Angola - Sistema Multi-Agente v4.0",
  description: "Sistema de gestao multi-agente para servicos maritimos. Waste Management, Shipchandler, Hull Cleaning, Offshore Support.",
  keywords: ["MTS Angola", "Maritime Services", "Waste Management", "Shipchandler", "Hull Cleaning", "Offshore Support", "Angola Ports"],
  authors: [{ name: "MTS Angola Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "MTS Angola - Sistema Multi-Agente",
    description: "Sistema de gestao multi-agente para servicos maritimos 24/7",
    url: "https://mts-angola.com",
    siteName: "MTS Angola",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MTS Angola - Sistema Multi-Agente",
    description: "Sistema de gestao multi-agente para servicos maritimos 24/7",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
