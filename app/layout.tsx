import type { Metadata } from "next";
import { DM_Sans, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import CrispChat from "@/components/CrispChat";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700", "800", "900"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

export const metadata: Metadata = {
  title: "Elysium — Where Legends Are Certified",
  description: "Join the elite. Pass our challenge and trade with up to $400,000 in allocated capital.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bebas.variable}`}>
      <body className={`${dmSans.variable} ${bebas.variable}`} style={{ backgroundColor: "#070707" }}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <CrispChat />
      </body>
    </html>
  );
}
