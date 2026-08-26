import type { Metadata } from "next";
import { Outfit, Bebas_Neue, Playfair_Display, Geist } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import PWARegister from "@/components/PWARegister";
import RefTracker from "@/components/RefTracker";
import ChatWidgetGate from "@/components/chat/ChatWidgetGate";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["300", "400", "500", "600", "700", "800", "900"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["700", "800", "900"] });

const SITE_URL = "https://www.traders-rewards.eu";
const TITLE = "Traders Rewards | Programme Éducatif de Trading";
const DESCRIPTION =
  "Transformez votre trading démo en vraies Rewards. Choisissez un Challenge 25K, 50K ou 100K, validez un objectif unique de +6% et progressez jusqu'au statut Trader Reward.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Traders Rewards",
  },
  description: DESCRIPTION,
  keywords: [
    "programme éducatif trading",
    "programme trading france",
    "challenge trading france",
    "challenge forex france",
    "programme trader france",
    "compte récompense trading",
    "traders rewards",
    "trading démo récompensé",
    "challenge trading",
    "compte récompense trading",
    "trading simulé récompensé",
    "programme trading paris",
    "formation trader récompensée",
    "capital simulé trading",
    "challenge trading 25K",
    "challenge trading 50K",
    "challenge trading 100K",
    "reward account",
    "trader reward",
  ],
  authors: [{ name: "Traders Rewards", url: SITE_URL }],
  creator: "Traders Rewards",
  publisher: "Traders Rewards",
  verification: {
    google: "znNrwyTz0rCqi1p2pGyNn3izIrAlaC_IyvMZdRyxyWY",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "fr": SITE_URL,
      "en": SITE_URL,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Traders Rewards",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "geo.region": "FR",
    "geo.placename": "France",
    "language": "French",
    "og:locale": "fr_FR",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "Traders Rewards",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Traders Rewards — Challenge de trading simulé et Rewards",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@TradersRewards",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Traders Rewards",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/traders-rewards-logo.png`,
      },
      description: "Programme de trading simulé avec Challenges 25K, 50K et 100K et parcours progressif de cinq Rewards.",
      address: {
        "@type": "PostalAddress",
        addressCountry: "EE",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: `${SITE_URL}/support`,
        availableLanguage: ["French", "English"],
      },
      sameAs: [
        "https://www.instagram.com/tradersrewards",
        "https://twitter.com/TradersRewards",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Traders Rewards",
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: ["fr-FR", "en-US"],
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "fr-FR",
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Comment démarrer avec Traders Rewards ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Choisissez un Challenge 25K, 50K ou 100K. L'objectif unique est de +6%, avec un minimum de 2 journées et un maximum de 30 jours calendaires.",
          },
        },
        {
          "@type": "Question",
          name: "Comment fonctionne le parcours Traders Rewards ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Après validation du Challenge, vous activez votre Reward Account et progressez à travers 5 Rewards successives jusqu'au statut Trader Reward.",
          },
        },
        {
          "@type": "Question",
          name: "Y a-t-il une limite de temps pour passer le challenge ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Le Challenge doit être validé dans un délai maximum de 30 jours calendaires. Le Reward Account dispose ensuite d'un temps illimité.",
          },
        },
        {
          "@type": "Question",
          name: "Quels sont les objectifs de profit du challenge ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Le Challenge comporte une seule étape avec un objectif de profit de +6%.",
          },
        },
        {
          "@type": "Question",
          name: "Quelles sont les règles de drawdown ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Il n'y a pas de Daily Drawdown séparé. Le Trailing Drawdown EOD est de 4% sur les comptes 25K et 50K, et de 3% sur le compte 100K.",
          },
        },
        {
          "@type": "Question",
          name: "Comment et quand suis-je payé ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "La première Reward est accessible après avoir atteint le seuil Safety Net + cap et validé au moins 5 journées qualifiantes sur le Reward Account, sous réserve du respect des règles du programme.",
          },
        },
        {
          "@type": "Question",
          name: "Le trading est-il réel ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Non. Tous les comptes et toutes les opérations sont simulés. Les Rewards approuvées sont versées conformément aux conditions du programme.",
          },
        },
      ],
    },
    {
      "@type": "FinancialService",
      "@id": `${SITE_URL}/#service`,
      name: "Challenge Trading — Programme Éducatif",
      provider: { "@id": `${SITE_URL}/#organization` },
      description: "Programme de trading simulé : validez un Challenge en une étape puis progressez à travers 5 niveaux de Rewards jusqu'au statut Trader Reward.",
      areaServed: {
        "@type": "GeoShape",
        name: "Europe",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Challenges Trading",
        itemListElement: [
          {
            "@type": "Offer",
            name: "Challenge 50K",
            description: "Challenge en une étape sur compte simulé 50K, objectif +6%, Trailing Drawdown EOD 4%.",
            priceCurrency: "EUR",
            price: "29",
            url: `${SITE_URL}/#pricing`,
          },
          {
            "@type": "Offer",
            name: "Challenge 100K",
            description: "Challenge en une étape sur compte simulé 100K, objectif +6%, Trailing Drawdown EOD 3%.",
            priceCurrency: "EUR",
            price: "59",
            url: `${SITE_URL}/#pricing`,
          },
        ],
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn(outfit.variable, bebas.variable, playfair.variable, "font-sans", geist.variable)}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="canonical" href={SITE_URL} />
        {/* Hreflang pour multilangue */}
        <link rel="alternate" hrefLang="fr" href={SITE_URL} />
        <link rel="alternate" hrefLang="en" href={SITE_URL} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${outfit.variable} ${bebas.variable}`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <PWARegister />
        <RefTracker />
        <ChatWidgetGate />
      </body>
    </html>
  );
}
