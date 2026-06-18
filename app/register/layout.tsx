import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte | Traders Rewards",
  description:
    "Créez votre compte Traders Rewards gratuitement et commencez votre challenge trading. La prop firm française pour accéder à du capital simulé jusqu'à 200 000€.",
  alternates: {
    canonical: "https://www.traders-rewards.eu/register",
  },
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
