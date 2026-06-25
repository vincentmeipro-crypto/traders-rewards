import type { Metadata } from "next";
import { Outfit, Bebas_Neue, Playfair_Display } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import PWARegister from "@/components/PWARegister";
import RefTracker from "@/components/RefTracker";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["300", "400", "500", "600", "700", "800", "900"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["700", "800", "900"] });

const SITE_URL = "https://www.traders-rewards.eu";
const TITLE = "Traders Rewards | Propfirm Française";
const DESCRIPTION =
  "Transformez votre trading démo en vraies récompenses. La propfirm FRANÇAISE qui récompense les traders disciplinés. Capital simulé jusqu'à 400 000 € · Partage des profits jusqu'à 90%.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Traders Rewards",
  },
  description: DESCRIPTION,
  keywords: [
    "propfirm française",
    "propfirm france",
    "propfirm france",
    "challenge trading france",
    "challenge forex france",
    "funded trader france",
    "compte financé trading",
    "traders rewards",
    "prop trading france",
    "challenge trading",
    "compte récompense trading",
    "trading sans risque",
    "propfirm paris",
    "financement trader",
    "capital simulé trading",
    "challenge 1 step",
    "challenge 2 step",
    "instant reward trading",
    "propfirm française",
    "meilleure propfirm france",
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
        alt: "Traders Rewards — Propfirm Française",
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
      description: "Prop firm française spécialisée dans le challenge trading. Accédez à du capital simulé et touchez jusqu'à 90% de vos profits.",
      address: {
        "@type": "PostalAddress",
        addressCountry: "FR",
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
            text: "Choisissez votre challenge (2-Step ou 1-Step), sélectionnez la taille de votre compte ($10K à $200K), effectuez le paiement et recevez vos identifiants instantanément par email.",
          },
        },
        {
          "@type": "Question",
          name: "Combien puis-je gagner avec la propfirm Traders Rewards ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vous conservez jusqu'à 90% de vos profits simulés (90% pour le 1-Step, 80% pour le 2-Step). Sur un compte $100K avec 6% de profit, vous touchez environ €4,800.",
          },
        },
        {
          "@type": "Question",
          name: "Y a-t-il une limite de temps pour passer le challenge ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Non. Il n'y a absolument aucune limite de temps sur nos challenges. Tradez à votre rythme, en jours, semaines ou mois.",
          },
        },
        {
          "@type": "Question",
          name: "Quels sont les objectifs de profit du challenge ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "2-Step : Phase 1 = +10%, Phase 2 = +5%. 1-Step : une seule phase avec un objectif de +8%. L'Instant Reward n'a pas d'objectif de profit.",
          },
        },
        {
          "@type": "Question",
          name: "Quelles sont les règles de drawdown ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "2-Step : 5% de perte journalière maximum et 10% total. 1-Step : 3% journalier et 8% trailing total (EOD).",
          },
        },
        {
          "@type": "Question",
          name: "Comment et quand suis-je payé ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Première récompense disponible dès le 15ème jour. Ensuite tous les 15 jours. Traitement sous 24-48h via crypto ou virement bancaire (IBAN).",
          },
        },
        {
          "@type": "Question",
          name: "Traders Rewards est-elle une vraie propfirm française ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui, Traders Rewards est une propfirm basée en France, avec un support en français et des paiements en euros. C'est la propfirm française de référence pour les traders européens.",
          },
        },
      ],
    },
    {
      "@type": "FinancialService",
      "@id": `${SITE_URL}/#service`,
      name: "Challenge Trading — Propfirm",
      provider: { "@id": `${SITE_URL}/#organization` },
      description: "Programme d'évaluation de traders : passez un challenge, devenez Trader Reward et touchez jusqu'à 90% de vos profits sur capital simulé.",
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
            name: "Challenge 2-Step $10,000",
            description: "Challenge trading 2 phases, compte simulé $10,000, objectif Phase 1 : +10%, Phase 2 : +5%, partage des profits : 80%",
            priceCurrency: "EUR",
            price: "99",
            url: `${SITE_URL}/#pricing`,
          },
          {
            "@type": "Offer",
            name: "Challenge 1-Step $50,000",
            description: "Challenge trading 1 phase, compte simulé $50,000, objectif : +8%, partage des profits : 90%",
            priceCurrency: "EUR",
            price: "249",
            url: `${SITE_URL}/#pricing`,
          },
          {
            "@type": "Offer",
            name: "Instant Reward $50,000",
            description: "Compte Reward immédiat $50,000, sans objectif de profit, partage 90%",
            priceCurrency: "EUR",
            price: "1300",
            url: `${SITE_URL}/#pricing`,
          },
        ],
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${outfit.variable} ${bebas.variable} ${playfair.variable}`}>
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
      </body>
    </html>
  );
}
