import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tax Manager — Free US Tax Preparation 2025",
  description:
    "Prepare your 2025 federal and state income tax return for free. Covers W-2, 1099, self-employment, investments, rentals, and all other tax situations.",
  keywords: ["tax preparation", "1040", "free tax filing", "2025 taxes"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-gray-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
