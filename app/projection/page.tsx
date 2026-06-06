"use client";

export default function ProjectionPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: "#f8faff", minHeight: "100vh", padding: "40px 24px", color: "#1565C0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div style={{ maxWidth: 980, margin: "0 auto" }}>

        <div className="no-print" style={{ textAlign: "right", marginBottom: 24 }}>
          <button onClick={() => window.print()} style={{ background: "#1565C0", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🖨 Imprimer / PDF
          </button>
        </div>

        {/* HEADER */}
        <div style={{ background: "linear-gradient(135deg, #1565C0 0%, #1a2f5e 100%)", borderRadius: 20, padding: "40px 48px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src="/nouveau-logo.png" alt="Elysium" style={{ height: 64, width: "auto", filter: "brightness(10)" }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "6px", color: "#fff", textTransform: "uppercase" }}>ELYSIUM</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "4px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>— REWARDS —</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>DOCUMENT DE PROJECTION</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#C9A84C", letterSpacing: "2px", textTransform: "uppercase" }}>Investisseur — Confidentiel</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Généré le {new Date().toLocaleDateString("fr-FR")}</div>
          </div>
        </div>

        {/* MARCHÉ MONDIAL */}
        <div style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #1565C0 100%)", borderRadius: 20, padding: "32px 40px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", borderRadius: 100, padding: "5px 14px", marginBottom: 16 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", display: "inline-block" }} />
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Opportunité de marché</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 6px 0" }}>Le marché PropFirm mondial</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "0 0 24px 0" }}>Un secteur en explosion porté par la démocratisation du trading</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { value: "$6 Mds", label: "Marché mondial 2024", sub: "chiffre d'affaires annuel" },
                { value: "+30 %", label: "Croissance annuelle", sub: "TCAC — projection 2025–2028" },
                { value: "$15 Mds", label: "Marché estimé 2027", sub: "à taux de croissance constant" },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "18px 14px", textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#C9A84C", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginTop: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MARCHÉ FRANCE / EUROPE */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "32px 40px", marginBottom: 20, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 100, padding: "5px 14px", marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1565C0", display: "inline-block" }} />
            <span style={{ color: "#1565C0", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Cible prioritaire</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1565C0", margin: "0 0 4px 0" }}>Marché France & Europe — Traders particuliers</h2>
          <p style={{ color: "#6b7a99", fontSize: 13, margin: "0 0 20px 0" }}>Elysium cible en priorité la France et l'Europe avant toute expansion internationale</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {[
              { flag: "fr", title: "France", rows: [
                { l: "Traders retail actifs", v: "~800 000" },
                { l: "3ème marché européen", v: "CFDs / Forex" },
                { l: "Cible PropFirm qualifiée", v: "50 000 – 120 000" },
                { l: "PropFirms 100% françaises", v: "Quasi inexistant" },
              ]},
              { flag: "eu", title: "Europe & Francophonie", rows: [
                { l: "Traders retail actifs (Europe)", v: "~15 millions" },
                { l: "Espace francophone mondial", v: "300 M locuteurs" },
                { l: "Traders actifs francophones", v: "~2 – 3 millions" },
                { l: "Croissance adoption PropFirm", v: "+40 %/an" },
              ]},
            ].map((col, i) => (
              <div key={i} style={{ background: "#f8faff", borderRadius: 12, padding: "18px 20px", border: "1px solid #e0eaff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <img src={`https://flagcdn.com/40x30/${col.flag}.png`} alt={col.flag} style={{ width: 26, height: 19, borderRadius: 3 }} />
                  <span style={{ fontWeight: 800, fontSize: 15, color: "#1565C0" }}>{col.title}</span>
                </div>
                {col.rows.map((r, j) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: j < 3 ? "1px solid #e8f0ff" : "none" }}>
                    <span style={{ fontSize: 12, color: "#6b7a99" }}>{r.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1B4FD8" }}>{r.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ background: "linear-gradient(135deg, #f0f4ff, #e8f0ff)", borderRadius: 10, padding: "14px 18px", border: "1px solid #c5d5f5" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#1565C0", fontWeight: 600 }}>
              🎯 <strong>Avantage concurrentiel :</strong> premier acteur PropFirm 100% francophone dans un marché dominé par des acteurs anglophones (FTMO, MyFundedFX, E8 Funding).
            </p>
          </div>
        </div>

        {/* SYNTHÈSE STRATÉGIQUE */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "32px 40px", marginBottom: 20, border: "2px solid #C9A84C", boxShadow: "0 4px 24px rgba(201,168,76,0.1)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fdf8ee", borderRadius: 100, padding: "5px 14px", marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", display: "inline-block" }} />
            <span style={{ color: "#C9A84C", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Analyse stratégique</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1565C0", margin: "0 0 18px 0" }}>Synthèse — Objectif & réalisme de marché</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div style={{ background: "#f8faff", borderRadius: 12, padding: "18px", border: "1px solid #e0eaff" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#1565C0", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>Calcul conservateur — France seule</div>
              <div style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.8 }}>
                50 000 traders qualifiés (bas de fourchette)<br/>
                × 1% de conversion mensuelle<br/>
                <strong style={{ color: "#1565C0", fontSize: 14 }}>= 500 challenges / mois</strong>
              </div>
              <div style={{ marginTop: 10, padding: "9px 12px", background: "#fff3cd", borderRadius: 8, border: "1px solid #f0d080", fontSize: 11, color: "#856404", fontWeight: 600 }}>
                ⚠ Objectif réaliste Y2 — sans renouvellement, marché France saturé en ~8 ans à ce rythme.
              </div>
            </div>
            <div style={{ background: "#f0fff4", borderRadius: 12, padding: "18px", border: "1px solid #b8f0d0" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#1a7a4a", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>Réel potentiel — Espace francophone</div>
              <div style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.8 }}>
                2–3M traders actifs francophones<br/>
                × 1% de conversion mensuelle<br/>
                <strong style={{ color: "#1a7a4a", fontSize: 14 }}>= 2 000 – 3 000 challenges / mois</strong>
              </div>
              <div style={{ marginTop: 10, padding: "9px 12px", background: "#d4edda", borderRadius: 8, border: "1px solid #a8d5b5", fontSize: 11, color: "#1a7a4a", fontWeight: 600 }}>
                ✅ France + BE + CH + Canada + Maghreb = marché pérenne sans saturation.
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { label: "Scénario base (cette projection)", value: "300 / mois", sub: "Conservateur", color: "#1B4FD8" },
              { label: "Objectif Y2 — France + EU",        value: "500 / mois", sub: "Réaliste 12–18 mois", color: "#C9A84C" },
              { label: "Potentiel francophone global",     value: "2 000+ / mois", sub: "Horizon 3–5 ans", color: "#1a7a4a" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#f8faff", borderRadius: 10, padding: "14px", textAlign: "center", border: "1px solid #e0eaff" }}>
                <div style={{ fontSize: 10, color: "#9aa5be", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#9aa5be", marginTop: 3 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CHIFFRES CLÉS */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "32px 40px", marginBottom: 20, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 100, padding: "5px 14px", marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1565C0", display: "inline-block" }} />
            <span style={{ color: "#1565C0", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Modèle économique</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1565C0", margin: "0 0 18px 0" }}>Chiffres clés de rentabilité</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {[
              { label: "Prix moyen challenge (promo 50%)",                              value: "183 EUR",            hi: true  },
              { label: "Charges mensuelles (fixes)",                                    value: "10 000 EUR",         hi: false },
              { label: "Récompenses clients (20% traders × 3% profit × 80% split)",   value: "≈ 20 % du CA",       hi: false },
              { label: "CA mensuel au plafond (300 ventes/mois)",                       value: "54 900 EUR / mois",  hi: false },
              { label: "Résultat net mensuel au plafond",                               value: "32 920 EUR / mois",  hi: true  },
              { label: "Marge nette mensuelle au plafond",                              value: "59,9 %",             hi: true  },
              { label: "CA annuel stabilisé (2027+)",                                   value: "658 800 EUR / an",   hi: false },
              { label: "Résultat annuel stabilisé",                                     value: "395 040 EUR / an",   hi: true  },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", background: row.hi ? "linear-gradient(135deg, #f0f4ff, #e8f2ff)" : "#f8faff", borderRadius: 10, border: `1px solid ${row.hi ? "#c5d5f5" : "#eef2fa"}` }}>
                <span style={{ fontSize: 12, color: "#4a5568" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: row.hi ? "#1B4FD8" : "#1565C0", whiteSpace: "nowrap", marginLeft: 12 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* OFFRES */}
        <div style={{ background: "linear-gradient(135deg, #1565C0, #1a2f5e)", borderRadius: 20, padding: "32px 40px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 20, textAlign: "center" }}>OFFRES D'INVESTISSEMENT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { invest: "5 000 €", parts: "5%", color: "#C9A84C", sub: "Ticket d'entrée" },
              { invest: "10 000 €", parts: "10%", color: "#fff", sub: "Ticket partenaire" },
            ].map((t, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px", textAlign: "center", border: `1px solid ${i === 1 ? "rgba(255,255,255,0.25)" : "rgba(201,168,76,0.4)"}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>{t.sub}</div>
                <div style={{ fontSize: 34, fontWeight: 900, color: t.color, lineHeight: 1 }}>{t.invest}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.6)", margin: "8px 0" }}>→ {t.parts} des parts</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Dividendes versés chaque semestre si bénéfice positif</div>
              </div>
            ))}
          </div>
        </div>

        {/* TABLE helper */}
        {([
          { pct: "5%", invest: "5 000 €", divRate: 0.05,
            rows: [
              { sem: "S1  Juin – Déc. 2026",  ca: "192 150 €", charges: "60 000 €", payouts: "38 430 €", net: "93 720 €", margin: "48,8 %", div: "4 686 €",  roi: "94 %"   },
              { sem: "S2  Janv. – Juin 2027", ca: "329 400 €", charges: "60 000 €", payouts: "65 880 €", net: "203 520 €", margin: "61,8 %", div: "10 176 €", roi: "297 %", bold: true },
              { sem: "S3  Juil. – Déc. 2027", ca: "329 400 €", charges: "60 000 €", payouts: "65 880 €", net: "203 520 €", margin: "61,8 %", div: "10 176 €", roi: "501 %" },
              { sem: "S4  Janv. – Juin 2028", ca: "329 400 €", charges: "60 000 €", payouts: "65 880 €", net: "203 520 €", margin: "61,8 %", div: "10 176 €", roi: "704 %" },
              { sem: "S5  Juil. – Déc. 2028", ca: "329 400 €", charges: "60 000 €", payouts: "65 880 €", net: "203 520 €", margin: "61,8 %", div: "10 176 €", roi: "908 %" },
            ],
            bilan: [
              { label: "Capital investi",         value: "5 000 €",  color: "#6b7a99" },
              { label: "1er versement (S1)",       value: "4 686 €",  color: "#C9A84C" },
              { label: "Dividendes cumulés 3 ans", value: "45 390 €", color: "#1B4FD8" },
              { label: "ROI total 3 ans",          value: "908 %",    color: "#C9A84C" },
            ],
          },
          { pct: "10%", invest: "10 000 €", divRate: 0.10,
            rows: [
              { sem: "S1  Juin – Déc. 2026",  ca: "192 150 €", charges: "60 000 €", payouts: "38 430 €", net: "93 720 €", margin: "48,8 %", div: "9 372 €",  roi: "94 %"   },
              { sem: "S2  Janv. – Juin 2027", ca: "329 400 €", charges: "60 000 €", payouts: "65 880 €", net: "203 520 €", margin: "61,8 %", div: "20 352 €", roi: "297 %", bold: true },
              { sem: "S3  Juil. – Déc. 2027", ca: "329 400 €", charges: "60 000 €", payouts: "65 880 €", net: "203 520 €", margin: "61,8 %", div: "20 352 €", roi: "501 %" },
              { sem: "S4  Janv. – Juin 2028", ca: "329 400 €", charges: "60 000 €", payouts: "65 880 €", net: "203 520 €", margin: "61,8 %", div: "20 352 €", roi: "704 %" },
              { sem: "S5  Juil. – Déc. 2028", ca: "329 400 €", charges: "60 000 €", payouts: "65 880 €", net: "203 520 €", margin: "61,8 %", div: "20 352 €", roi: "908 %" },
            ],
            bilan: [
              { label: "Capital investi",         value: "10 000 €",  color: "#6b7a99" },
              { label: "1er versement (S1)",       value: "9 372 €",   color: "#1B4FD8" },
              { label: "Dividendes cumulés 3 ans", value: "90 780 €",  color: "#1B4FD8" },
              { label: "ROI total 3 ans",          value: "908 %",     color: "#C9A84C" },
            ],
          },
        ] as const).map((tier, ti) => (
          <div key={ti} style={{ background: "#fff", borderRadius: 20, padding: "32px 40px", marginBottom: 20, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: ti === 0 ? "#fdf8ee" : "#f0f4ff", borderRadius: 100, padding: "5px 14px", marginBottom: 18 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ti === 0 ? "#C9A84C" : "#1B4FD8", display: "inline-block" }} />
              <span style={{ color: ti === 0 ? "#C9A84C" : "#1B4FD8", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Palier {ti + 1} — {tier.invest} / {tier.pct} des parts</span>
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: "#1565C0", margin: "0 0 18px 0" }}>Projection — {tier.pct} des dividendes</h2>

            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e0eaff", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1.2fr 1fr 1.2fr 1fr", background: "#1565C0", padding: "11px 16px", gap: 6 }}>
                {["Semestre", "CA Total", "Charges", "Récompenses", "Résultat Net", "Marge %", "Dividendes"].map((h, i) => (
                  <div key={i} style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.8px" }}>{h}</div>
                ))}
              </div>
              {tier.rows.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1.2fr 1fr 1.2fr 1fr", padding: "11px 16px", gap: 6, borderBottom: i < 4 ? "1px solid #e8f0ff" : "none", background: (row as any).bold ? "#eef5ff" : (i % 2 === 0 ? "#fff" : "#f8faff") }}>
                  <div style={{ fontSize: 12, fontWeight: (row as any).bold ? 800 : 500, color: "#1565C0" }}>{row.sem}</div>
                  <div style={{ fontSize: 12, color: "#4a5568" }}>{row.ca}</div>
                  <div style={{ fontSize: 12, color: "#4a5568" }}>{row.charges}</div>
                  <div style={{ fontSize: 12, color: "#e05252", fontWeight: 600 }}>{row.payouts}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1565C0" }}>{row.net}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1a7a4a" }}>{row.margin}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: ti === 0 ? "#C9A84C" : "#1B4FD8" }}>{row.div}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {tier.bilan.map((c, i) => (
                <div key={i} style={{ background: "#f8faff", borderRadius: 10, padding: "16px 10px", textAlign: "center", border: "1px solid #e0eaff" }}>
                  <div style={{ fontSize: 9, color: "#9aa5be", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* FOOTER */}
        <div style={{ background: "linear-gradient(135deg, #f0f4ff, #e8f2ff)", borderRadius: 14, padding: "18px 28px", textAlign: "center", border: "1px solid #c5d5f5", marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1B4FD8" }}>
            5 000 € → 45 390 € de dividendes sur 3 ans (ROI 908 %)&nbsp;&nbsp;|&nbsp;&nbsp;10 000 € → 90 780 € sur 3 ans (ROI 908 %)
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#6b7a99" }}>Hypothèse : 20% des traders certifiés effectuent un retrait à 3% de profit — marge nette plateau : 59,9%</p>
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: "#9aa5be", fontStyle: "italic", marginTop: 8 }}>Document confidentiel — Usage exclusif réservé au destinataire</p>

      </div>
    </div>
  );
}
