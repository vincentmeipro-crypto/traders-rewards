import type { Metadata } from "next";
import { Outfit, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import CrispChat from "@/components/CrispChat";
import PWARegister from "@/components/PWARegister";
import RefTracker from "@/components/RefTracker";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["300", "400", "500", "600", "700", "800", "900"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.traders-rewards.eu"),
  title: "Performez votre Trading Démo. Recevez de vraies récompenses.",
  description: "Accédez à 200 000€ de capital simulé. Gagnez des récompenses jusqu'à 90% de vos gains simulés.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Traders Rewards",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    type: "website",
    siteName: "Traders Rewards",
    title: "Performez votre Trading Démo. Recevez de vraies récompenses.",
    description: "Accédez à 200 000€ de capital simulé. Gagnez des récompenses jusqu'à 90% de vos gains simulés.",
    images: [{ url: "/logo-elysium-rewards.png", width: 1080, height: 1080, alt: "Traders Rewards" }],
  },
  twitter: {
    card: "summary",
    title: "Performez votre Trading Démo. Recevez de vraies récompenses.",
    description: "Accédez à 200 000€ de capital simulé. Gagnez des récompenses jusqu'à 90% de vos gains simulés.",
    images: ["/logo-elysium-rewards.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${bebas.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#EBF5FF" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className={`${outfit.variable} ${bebas.variable}`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        {/* CrispChat removed — support via menu */}
        <PWARegister />
        <RefTracker />
      </body>
    </html>
  );
}
