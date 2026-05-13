import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Elysium Funded — Where Legends Are Funded",
  description: "Join the elite. Pass our challenge and trade with up to $400,000 in funded capital.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ backgroundColor: "#070707" }}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
