import type { Metadata } from "next";
import { DM_Sans, Bebas_Neue } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700", "800", "900"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

export const metadata: Metadata = {
  title: "Elysium Funded — Where Legends Are Funded",
  description: "Join the elite. Pass our challenge and trade with up to $400,000 in funded capital.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bebas.variable}`}>
      <body className={`${dmSans.variable} ${bebas.variable}`} style={{ backgroundColor: "#070707" }}>
        <LanguageProvider>
          <style>{`
            body, * { font-family: var(--font-inter), 'DM Sans', system-ui, sans-serif !important; }
            .bebas, [class*="bebas"] { font-family: var(--font-bebas), sans-serif !important; }
          `}</style>
          {children}
        </LanguageProvider>
        <Script id="crisp-chat" strategy="afterInteractive">{`
          window.$crisp=[];
          window.CRISP_WEBSITE_ID="12bb26b9-91ca-4a8c-8b42-42a66d94b0f4";
          (function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
        `}</Script>
      </body>
    </html>
  );
}
