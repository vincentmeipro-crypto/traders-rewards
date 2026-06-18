import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Programme Partenariat & Affiliation | Traders Rewards",
  description:
    "Rejoignez le programme d'affiliation Traders Rewards et gagnez jusqu'à 20% de commission. Partagez votre lien, recommandez notre prop firm française et touchez vos commissions chaque semaine.",
  keywords: [
    "affiliation prop firm",
    "partenariat trading",
    "programme affiliation trading france",
    "gagner argent trading affiliation",
    "commission prop firm",
    "programme partenaire traders rewards",
  ],
  openGraph: {
    title: "Programme Partenariat — Traders Rewards | Jusqu'à 20% de commission",
    description:
      "Partagez votre lien de parrainage et gagnez jusqu'à 20% de commission sur chaque challenge vendu. Programme d'affiliation de la prop firm française Traders Rewards.",
    url: "https://www.traders-rewards.eu/partenariat",
  },
  alternates: {
    canonical: "https://www.traders-rewards.eu/partenariat",
  },
};

export default function PartenariatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
