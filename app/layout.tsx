import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

export const metadata: Metadata = {
  title: "Elysium Funded — Where Legends Are Funded",
  description: "Join the elite. Pass our challenge and trade with up to $400,000 in funded capital.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
      <body className={bebas.variable} style={{ backgroundColor: "#070707" }}>
        <LanguageProvider>{children}</LanguageProvider>
        <Script id="crisp-chat" strategy="afterInteractive">{`
          window.$crisp=[];
          window.CRISP_WEBSITE_ID="12bb26b9-91ca-4a8c-8b42-42a66d94b0f4";
          (function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
        `}</Script>
      </body>
    </html>
  );
}
