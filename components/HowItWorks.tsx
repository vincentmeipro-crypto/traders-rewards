"use client";

import { useLanguage } from "@/lib/LanguageContext";

const ICONS = ["◎", "◈", "◉"];

export default function HowItWorks() {
  const { T } = useLanguage();

  return (
    <section id="how-it-works" className="how-section">
      <div className="how-shell">
        <div className="how-heading">
          <div className="how-label">{T.how.label}</div>
          <h2>
            {T.how.title} <span>{T.how.titleGold}</span>
          </h2>
          <p>{T.how.sub}</p>
        </div>

        <div className="how-grid">
          {T.how.steps.map((step, i) => (
            <article key={i} className={`how-card${i === 1 ? " how-card-featured" : ""}`}>
              <div className="how-card-glow" aria-hidden="true" />
              <div className="how-card-top">
                <div className="how-number">0{i + 1}</div>
                <div className="how-icon" aria-hidden="true">
                  <span>{ICONS[i]}</span>
                </div>
              </div>
              <div className="how-card-copy">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style jsx>{`
        .how-section {
          position: relative;
          overflow: hidden;
          padding: 88px 24px 96px;
          background: #000;
        }

        .how-section::before {
          content: "";
          position: absolute;
          top: 15%;
          left: 50%;
          width: min(920px, 86vw);
          height: 390px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(156,207,234, 0.055), transparent 68%);
          filter: blur(14px);
          pointer-events: none;
        }

        .how-shell {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin: 0 auto;
        }

        .how-heading {
          max-width: 680px;
          margin: 0 auto 58px;
          text-align: center;
        }

        .how-label {
          margin-bottom: 15px;
          color: #9CCFEA;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.4px;
          text-transform: uppercase;
        }

        h2 {
          margin: 0 0 16px;
          color: #fff;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 850;
          letter-spacing: -1.5px;
          line-height: 1.08;
        }

        h2 span {
          color: #9CCFEA;
        }

        .how-heading > p {
          max-width: 520px;
          margin: 0 auto;
          color: rgba(255, 255, 255, 0.5);
          font-size: 16px;
          line-height: 1.7;
        }

        .how-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
        }

        .how-card {
          position: relative;
          min-width: 0;
          min-height: 302px;
          overflow: hidden;
          padding: 31px 28px 30px;
          border: 1px solid rgba(255, 255, 255, 0.095);
          border-radius: 20px;
          background: linear-gradient(155deg, #151515 0%, #0d0d0e 58%, #08090a 100%);
          box-shadow: 0 30px 74px rgba(0, 0, 0, 0.8), 0 12px 30px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.035);
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }

        .how-card:hover {
          transform: translateY(-4px);
          border-color: rgba(156,207,234, 0.26);
          box-shadow: 0 36px 86px rgba(0, 0, 0, 0.88), 0 0 25px rgba(156,207,234, 0.08), 0 14px 34px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.045);
        }

        .how-card-featured {
          z-index: 2;
          transform: translateY(-8px);
          border-color: rgba(156,207,234, 0.4);
          background: linear-gradient(155deg, #181a1c 0%, #101315 54%, #090b0d 100%);
          box-shadow: 0 38px 94px rgba(0, 0, 0, 0.9), 0 0 38px rgba(156,207,234, 0.14), 0 14px 36px rgba(0, 0, 0, 0.66), inset 0 1px 0 rgba(255, 255, 255, 0.055);
        }

        .how-card-featured:hover {
          transform: translateY(-11px);
          border-color: rgba(156,207,234, 0.56);
          box-shadow: 0 42px 102px rgba(0, 0, 0, 0.92), 0 0 44px rgba(156,207,234, 0.18), 0 16px 38px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .how-card-glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(circle at 50% 0%, rgba(156,207,234, 0.055), transparent 49%);
          pointer-events: none;
        }

        .how-card-featured .how-card-glow {
          background: radial-gradient(circle at 50% 0%, rgba(156,207,234, 0.15), transparent 54%);
        }

        .how-card-top {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 45px;
        }

        .how-number {
          color: rgba(255, 255, 255, 0.055);
          font-size: 64px;
          font-weight: 900;
          letter-spacing: -4px;
          line-height: 0.82;
        }

        .how-card-featured .how-number {
          color: rgba(156,207,234, 0.11);
        }

        .how-icon {
          display: grid;
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.9);
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.025));
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .how-card-featured .how-icon {
          border-color: rgba(156,207,234, 0.72);
          color: #061018;
          background: linear-gradient(145deg, #8dd5ff, #9CCFEA);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45), 0 0 24px rgba(156,207,234, 0.22);
        }

        .how-icon span {
          font-size: 18px;
          line-height: 1;
        }

        .how-card-copy {
          position: relative;
        }

        h3 {
          margin: 0 0 11px;
          color: #fff;
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -0.35px;
          line-height: 1.28;
        }

        .how-card-copy p {
          margin: 0;
          color: rgba(255, 255, 255, 0.54);
          font-size: 14px;
          line-height: 1.7;
        }

        @media (max-width: 899px) {
          .how-section {
            padding: 68px 20px 72px;
          }

          .how-heading {
            margin-bottom: 38px;
          }

          .how-grid {
            grid-template-columns: 1fr;
            gap: 14px;
            max-width: 620px;
            margin: 0 auto;
          }

          .how-card,
          .how-card-featured,
          .how-card:hover,
          .how-card-featured:hover {
            min-height: 0;
            transform: none;
          }

          .how-card {
            display: grid;
            grid-template-columns: 76px minmax(0, 1fr);
            gap: 22px;
            align-items: center;
            padding: 24px;
          }

          .how-card-featured {
            border-color: rgba(156,207,234, 0.42);
          }

          .how-card-top {
            display: grid;
            gap: 12px;
            justify-items: start;
            margin: 0;
          }

          .how-number {
            font-size: 43px;
            letter-spacing: -3px;
          }

          .how-icon {
            width: 42px;
            height: 42px;
            flex-basis: 42px;
          }
        }

        @media (max-width: 520px) {
          .how-section {
            padding: 58px 16px 62px;
          }

          .how-heading {
            margin-bottom: 30px;
          }

          .how-label {
            margin-bottom: 12px;
            font-size: 10px;
          }

          h2 {
            margin-bottom: 13px;
            font-size: clamp(1.85rem, 9vw, 2.35rem);
            letter-spacing: -1.2px;
          }

          .how-heading > p {
            font-size: 14px;
            line-height: 1.6;
          }

          .how-grid {
            gap: 12px;
          }

          .how-card {
            grid-template-columns: 58px minmax(0, 1fr);
            gap: 16px;
            padding: 19px 18px;
            border-radius: 17px;
          }

          .how-card-top {
            gap: 9px;
          }

          .how-number {
            font-size: 34px;
          }

          .how-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
          }

          .how-icon span {
            font-size: 16px;
          }

          h3 {
            margin-bottom: 7px;
            font-size: 16px;
          }

          .how-card-copy p {
            font-size: 13px;
            line-height: 1.55;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .how-card {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}
