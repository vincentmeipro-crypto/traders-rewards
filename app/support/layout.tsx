import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Contactez-nous | Traders Rewards",
  description:
    "Besoin d'aide ? Contactez l'équipe Traders Rewards. Support en français pour toutes vos questions sur les challenges trading, les comptes reward et vos récompenses.",
  alternates: {
    canonical: "https://www.traders-rewards.eu/support",
  },
  openGraph: {
    title: "Support | Traders Rewards",
    description: "Contactez l'équipe Traders Rewards — support en français disponible 7j/7.",
    url: "https://www.traders-rewards.eu/support",
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
