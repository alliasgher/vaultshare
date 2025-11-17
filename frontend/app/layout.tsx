import type { Metadata } from "next";
import { Inter } from "next/font/google";
import PDFWorkerInit from "@/components/PDFWorkerInit";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "VaultShare - Secure File Sharing",
  description: "Share files securely with password protection and expiration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <PDFWorkerInit />
        {children}
      </body>
    </html>
  );
}
