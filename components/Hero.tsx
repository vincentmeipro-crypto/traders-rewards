"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, Gift, TrendingUp } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { DEFAULT_HERO_PROMOTION_PRESENTATION, getHeroPromotionPresentation, type HeroPromotionPresentation } from "@/lib/hero-promotion-config";
import styles from "./Hero.module.css";

export default function Hero() {
  const { lang } = useLanguage();
  const L = (fr: string, es: string, en: string) => lang === "fr" ? fr : lang === "es" ? es : en;
  const [promotion, setPromotion] = useState<HeroPromotionPresentation>(DEFAULT_HERO_PROMOTION_PRESENTATION);

  useEffect(() => {
    setPromotion(getHeroPromotionPresentation(DEFAULT_HERO_PROMOTION_PRESENTATION));
    const controller = new AbortController();
    async function loadPromotion() {
      try {
        const response = await fetch("/api/hero-promotion", { cache: "no-store", signal: controller.signal });
        if (response.ok) setPromotion(await response.json());
      } catch {
        // Keep the existing fallback if the promotion service is unavailable.
      }
    }
    void loadPromotion();
    return () => controller.abort();
  }, []);

  const steps = [
    { Icon: ClipboardList, title: L("Choisissez votre challenge", "Elige tu challenge", "Choose your challenge"), text: L("Sélectionnez le challenge qui vous correspond.", "Selecciona el challenge que más te convenga.", "Select the challenge that suits you.") },
    { Icon: TrendingUp, title: L("Validez votre challenge", "Supera tu challenge", "Complete your challenge"), text: L("Atteignez les objectifs du challenge.", "Alcanza los objetivos del challenge.", "Reach your challenge objectives.") },
    { Icon: Gift, title: L("Accédez aux récompenses", "Accede a las recompensas", "Unlock your rewards"), text: L("Découvrez les 5 niveaux de récompenses.", "Descubre los 5 niveles de recompensas.", "Discover the 5 reward levels.") },
  ];

  return (
    <section id="hero" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.badge}><span />{L("Programme éducatif • Trading simulé", "Programa educativo • Trading simulado", "Educational program • Simulated trading")}</p>
          <h1 id="hero-title" className={styles.title}>
            <span>{L("Validez 1 challenge.", "Supera 1 challenge.", "Complete 1 challenge.")}</span>
            <span className={styles.gold}>{L("Débloquez 5 récompenses.", "Desbloquea 5 recompensas.", "Unlock 5 rewards.")}</span>
          </h1>
          <p className={styles.description}><span className={styles.desktopDescription}>{L("Découvrez le fonctionnement des récompenses et choisissez votre challenge.", "Descubre cómo funcionan las recompensas y elige tu challenge.", "Discover how rewards work and choose your challenge.")}</span><span className={styles.mobileDescription}>{L("Choisissez votre challenge et découvrez les 5 niveaux de récompenses.", "Elige tu challenge y descubre los 5 niveles de recompensas.", "Choose your challenge and discover the 5 reward levels.")}</span></p>
          <div className={styles.actions}>
            {promotion.visible && (
              <div className={styles.promotion}>
                <p className={styles.eyebrow}>{promotion.headline || L("Offres du moment", "Ofertas actuales", "Current offers")}</p>
                <div className={styles.offers}>
                  <div className={styles.offer}>
                    <span>{promotion.leftLabel}</span>
                    <strong>−{promotion.leftDiscount}<small> %</small></strong>
                  </div>
                  <div className={styles.offerFeatured}>
                    <span>{promotion.rightLabel}</span>
                    <strong>−{promotion.rightDiscount}<small> %</small></strong>
                  </div>
                </div>
              </div>
            )}
            <a href="#pricing" className={styles.cta}>{L("Voir les challenges et les prix", "Ver challenges y precios", "View challenges and prices")}<ArrowRight size={23} aria-hidden="true" /></a>
            <a href="#rules" className={styles.secondary}>{L("Comment ça marche ?", "¿Cómo funciona?", "How does it work?")}</a>
          </div>
        </div>
        <div className={styles.visual}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/HEROOOOOOO.png" alt="" fetchPriority="high" />
        </div>
      </div>
      <ol className={styles.steps} aria-label={L("Votre parcours", "Tu recorrido", "Your journey")}>
        {steps.map(({ Icon, title, text }, index) => (
          <li key={index} className={styles.step}>
            <span className={styles.icon}><Icon size={27} strokeWidth={1.5} aria-hidden="true" /></span>
            <div><span className={styles.number}>0{index + 1}</span><h2>{title}</h2><p>{text}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
