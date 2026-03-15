import type { Metadata } from "next";
import { IBM_Plex_Sans, Libre_Baskerville } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const libre = Libre_Baskerville({
  variable: "--font-libre",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "TaxOps ZA",
  description: "South African tax compliance and SARS workflow management platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${libre.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

