import type { Metadata } from "next";
import { DM_Sans, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import CrispChat from "@/components/CrispChat";
import PWARegister from "@/components/PWARegister";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700", "800", "900"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

export const metadata: Metadata = {
  metadataBase: new URL("https://elysium-funded.vercel.app"),
  title: "Elysium Funded — Performez votre Trading Démo. Recevez de vraies récompenses.",
  description: "Accédez à 200 000$ de capital simulé. Gagnez des récompenses jusqu'à 90% de vos gains simulés.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Elysium Funded",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    type: "website",
    siteName: "Elysium Funded",
    title: "Performez votre Trading Démo. Recevez de vraies récompenses.",
    description: "Accédez à 200 000$ de capital simulé. Gagnez des récompenses jusqu'à 90% de vos gains simulés.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Elysium Funded" }],
  },
  twitter: {
    card: "summary",
    title: "Performez votre Trading Démo. Recevez de vraies récompenses.",
    description: "Accédez à 200 000$ de capital simulé. Gagnez des récompenses jusqu'à 90% de vos gains simulés.",
    images: ["/icon-512.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bebas.variable}`}>
      <head>
        <meta name="theme-color" content="#070707" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${dmSans.variable} ${bebas.variable}`} style={{ backgroundColor: "#070707" }}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <CrispChat />
        <PWARegister />
      </body>
    </html>
  );
}
