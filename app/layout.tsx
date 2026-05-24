import type { Metadata } from "next";
import { DM_Sans, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import CrispChat from "@/components/CrispChat";
import PWARegister from "@/components/PWARegister";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700", "800", "900"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

export const metadata: Metadata = {
  metadataBase: new URL("https://elysiumfunded.eu"),
  title: "Elysium — Performez votre Trading Démo. Recevez de vraies récompenses.",
  description: "Accédez à 200 000$ de capital simulé. Gagnez des récompenses jusqu'à 90% de vos gains simulés.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Elysium",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    type: "website",
    siteName: "Elysium",
    title: "Performez votre Trading Démo. Recevez de vraies récompenses.",
    description: "Accédez à 200 000$ de capital simulé. Gagnez des récompenses jusqu'à 90% de vos gains simulés.",
    images: [{ url: "/logo-white.jpg", width: 1080, height: 1080, alt: "Elysium" }],
  },
  twitter: {
    card: "summary",
    title: "Performez votre Trading Démo. Recevez de vraies récompenses.",
    description: "Accédez à 200 000$ de capital simulé. Gagnez des récompenses jusqu'à 90% de vos gains simulés.",
    images: ["/logo-white.jpg"],
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
