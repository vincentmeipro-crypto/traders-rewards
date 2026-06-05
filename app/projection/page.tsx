"use client";

export default function ProjectionPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: "#f8faff", minHeight: "100vh", padding: "40px 24px", color: "#0D1B3E" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        <div className="no-print" style={{ textAlign: "right", marginBottom: 24 }}>
          <button onClick={() => window.print()} style={{ background: "#1565C0", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🖨 Imprimer / PDF
          </button>
        </div>

        {/* HEADER */}
        <div style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1a2f5e 100%)", borderRadius: 20, padding: "40px 48px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src="/nouveau-logo.png" alt="Elysium" style={{ height: 64, width: "auto", filter: "brightness(10)" }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "6px", color: "#fff", textTransform: "uppercase" }}>ELYSIUM</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "4px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>— REWARDS —</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>DOCUMENT DE PROJECTION</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#C9A84C", letterSpacing: "2px", textTransform: "uppercase" }}>Investisseur — Confidentiel</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Généré le {new Date().toLocaleDateString("fr-FR")}</div>
          </div>
        </div>

        {/* SECTION 1 — MARCHÉ MONDIAL */}
        <div style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #1565C0 100%)", borderRadius: 20, padding: "36px 40px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", bottom: -60, right: 60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", display: "inline-block" }} />
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Opportunité de marché</span>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 6px 0" }}>Le marché PropFirm mondial</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 28px 0" }}>Un secteur en explosion porté par la démocratisation du trading</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { value: "$6 Mds", label: "Marché mondial 2024", sub: "en chiffre d'affaires annuel" },
                { value: "+30 %", label: "Croissance annuelle", sub: "TCAC — projection 2025–2028" },
                { value: "$15 Mds", label: "Marché estimé 2027", sub: "à taux de croissance constant" },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "20px 16px", textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#C9A84C", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2 — MARCHÉ FRANCE / EUROPE */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", marginBottom: 20, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1565C0", display: "inline-block" }} />
            <span style={{ color: "#1565C0", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Cible prioritaire</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0D1B3E", margin: "0 0 6px 0" }}>Marché France & Europe — Traders particuliers</h2>
          <p style={{ color: "#6b7a99", fontSize: 14, margin: "0 0 24px 0" }}>Elysium cible en priorité la France et l'Europe avant toute expansion internationale</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ background: "#f8faff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e0eaff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <img src="https://flagcdn.com/40x30/fr.png" alt="FR" style={{ width: 28, height: 21, borderRadius: 3 }} />
                <span style={{ fontWeight: 800, fontSize: 16, color: "#0D1B3E" }}>France</span>
              </div>
              {[
                { label: "Traders retail actifs", value: "~800 000" },
                { label: "3ème marché européen", value: "CFDs / Forex" },
                { label: "Cible PropFirm qualifiée", value: "50 000 – 120 000" },
                { label: "PropFirms 100% françaises", value: "Quasi inexistant" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 3 ? "1px solid #e8f0ff" : "none" }}>
                  <span style={{ fontSize: 13, color: "#6b7a99" }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1B4FD8" }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#f8faff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e0eaff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <img src="https://flagcdn.com/40x30/eu.png" alt="EU" style={{ width: 28, height: 21, borderRadius: 3 }} />
                <span style={{ fontWeight: 800, fontSize: 16, color: "#0D1B3E" }}>Europe & Francophonie</span>
              </div>
              {[
                { label: "Traders retail actifs (Europe)", value: "~15 millions" },
                { label: "Espace francophone mondial", value: "300 M locuteurs" },
                { label: "Traders actifs francophones", value: "~2 – 3 millions" },
                { label: "Croissance adoption PropFirm", value: "+40 %/an" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 3 ? "1px solid #e8f0ff" : "none" }}>
                  <span style={{ fontSize: 13, color: "#6b7a99" }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1B4FD8" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #f0f4ff, #e8f0ff)", borderRadius: 12, padding: "16px 20px", border: "1px solid #c5d5f5" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#0D1B3E", fontWeight: 600, lineHeight: 1.6 }}>
              🎯 <strong>Avantage concurrentiel Elysium :</strong> premier acteur PropFirm 100% francophone dans un marché dominé par des acteurs anglophones (FTMO, MyFundedFX, E8 Funding) — interface, support et paiement 100% en français.
            </p>
          </div>
        </div>

        {/* SECTION 3 — SYNTHÈSE STRATÉGIQUE */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", marginBottom: 20, border: "2px solid #C9A84C", boxShadow: "0 4px 24px rgba(201,168,76,0.1)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fdf8ee", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", display: "inline-block" }} />
            <span style={{ color: "#C9A84C", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Analyse stratégique</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0D1B3E", margin: "0 0 20px 0" }}>Synthèse — Objectif & réalisme de marché</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#f8faff", borderRadius: 14, padding: "20px", border: "1px solid #e0eaff" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1565C0", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Calcul conservateur France seule</div>
              <div style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.8 }}>
                50 000 traders qualifiés (bas de fourchette)<br/>
                × 1% de conversion mensuelle<br/>
                <span style={{ fontWeight: 800, color: "#0D1B3E", fontSize: 15 }}>= 500 challenges / mois</span>
              </div>
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff3cd", borderRadius: 8, border: "1px solid #f0d080" }}>
                <div style={{ fontSize: 12, color: "#856404", fontWeight: 600 }}>⚠ Approche valable sur 12–18 mois. Sans renouvellement, marché France saturé en ~8 ans à ce rythme.</div>
              </div>
            </div>
            <div style={{ background: "#f0fff4", borderRadius: 14, padding: "20px", border: "1px solid #b8f0d0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a7a4a", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Réel potentiel francophone</div>
              <div style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.8 }}>
                2–3M traders actifs francophones<br/>
                × 1% de conversion mensuelle<br/>
                <span style={{ fontWeight: 800, color: "#1a7a4a", fontSize: 15 }}>= 2 000 – 3 000 challenges / mois</span>
              </div>
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#d4edda", borderRadius: 8, border: "1px solid #a8d5b5" }}>
                <div style={{ fontSize: 12, color: "#1a7a4a", fontWeight: 600 }}>✅ France + BE + CH + Canada + Maghreb = marché pérenne sans saturation à moyen terme.</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { label: "Scénario base (projection)", value: "300 / mois", sub: "Conservative — cette projection", color: "#1B4FD8" },
              { label: "Objectif Y2 (France + EU)", value: "500 / mois", sub: "Réaliste à 12–18 mois", color: "#C9A84C" },
              { label: "Potentiel francophone global", value: "2 000+ / mois", sub: "Horizon 3–5 ans", color: "#1a7a4a" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#f8faff", borderRadius: 12, padding: "16px", textAlign: "center", border: "1px solid #e0eaff" }}>
                <div style={{ fontSize: 10, color: "#9aa5be", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#9aa5be", marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4 — CHIFFRES CLÉS */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", marginBottom: 20, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1565C0", display: "inline-block" }} />
            <span style={{ color: "#1565C0", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Modèle économique</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0D1B3E", margin: "0 0 20px 0" }}>Chiffres clés de rentabilité</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Prix moyen challenge (promo 50%)", value: "183 EUR", hi: true },
              { label: "Charges mensuelles (fixes)", value: "10 000 EUR", hi: false },
              { label: "Récompenses clients (≈10% CA — 10% clients × 3% profit)", value: "≈ 10 % du CA", hi: false },
              { label: "Résultat S1 — Juin à Déc. 2026", value: "+ 112 935 EUR", hi: true },
              { label: "Résultat S2+ par semestre (plateau 300/mois)", value: "+ 236 460 EUR", hi: true },
              { label: "CA mensuel au plafond (300 ventes)", value: "54 900 EUR / mois", hi: false },
              { label: "CA annuel stabilisé (2027+)", value: "658 800 EUR / an", hi: false },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: row.hi ? "linear-gradient(135deg, #f0f4ff, #e8f2ff)" : "#f8faff", borderRadius: 10, border: `1px solid ${row.hi ? "#c5d5f5" : "#eef2fa"}` }}>
                <span style={{ fontSize: 13, color: "#4a5568" }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.hi ? "#1B4FD8" : "#0D1B3E", whiteSpace: "nowrap", marginLeft: 16 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5 — OFFRES D'INVESTISSEMENT */}
        <div style={{ background: "linear-gradient(135deg, #0D1B3E, #1a2f5e)", borderRadius: 20, padding: "36px 40px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 24, textAlign: "center" }}>OFFRES D'INVESTISSEMENT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { invest: "5 000 €", parts: "5%", color: "#C9A84C", sub: "Ticket d'entrée" },
              { invest: "10 000 €", parts: "10%", color: "#fff", sub: "Ticket partenaire" },
            ].map((t, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px 24px", textAlign: "center", border: `1px solid ${i === 1 ? "rgba(255,255,255,0.3)" : "rgba(201,168,76,0.4)"}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>{t.sub}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: t.color, lineHeight: 1 }}>{t.invest}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.6)", margin: "8px 0" }}>→ {t.parts} des parts</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>Dividendes = {t.parts} bénéfice net / semestre</div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 6 — TABLE 5% */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", marginBottom: 20, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fdf8ee", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", display: "inline-block" }} />
            <span style={{ color: "#C9A84C", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Palier 1 — 5 000 € / 5% des parts</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0D1B3E", margin: "0 0 20px 0" }}>Projection des dividendes — 5%</h2>
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e0eaff", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr", background: "#0D1B3E", padding: "12px 20px", gap: 8 }}>
              {["Semestre", "CA Total", "Résultat Net", "Dividendes 5%", "ROI cumulé"].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</div>
              ))}
            </div>
            {[
              { sem: "S1  Juin – Déc. 2026",  ca: "192 150 €", net: "+112 935 €", div: "5 647 €",  roi: "113 %" },
              { sem: "S2  Janv. – Juin 2027", ca: "329 400 €", net: "+236 460 €", div: "11 823 €", roi: "349 %", bold: true },
              { sem: "S3  Juil. – Déc. 2027", ca: "329 400 €", net: "+236 460 €", div: "11 823 €", roi: "586 %" },
              { sem: "S4  Janv. – Juin 2028", ca: "329 400 €", net: "+236 460 €", div: "11 823 €", roi: "822 %" },
              { sem: "S5  Juil. – Déc. 2028", ca: "329 400 €", net: "+236 460 €", div: "11 823 €", roi: "1 059 %" },
            ].map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr", padding: "12px 20px", gap: 8, borderBottom: i < 4 ? "1px solid #e8f0ff" : "none", background: row.bold ? "#eef5ff" : (i % 2 === 0 ? "#fff" : "#f8faff") }}>
                <div style={{ fontSize: 13, fontWeight: row.bold ? 800 : 500, color: "#0D1B3E" }}>{row.sem}</div>
                <div style={{ fontSize: 13, color: "#4a5568" }}>{row.ca}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1565C0" }}>{row.net}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C" }}>{row.div}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#C9A84C" }}>{row.roi}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Capital investi",          value: "5 000 €",  color: "#6b7a99" },
              { label: "1er versement (S2)",        value: "11 823 €", color: "#C9A84C" },
              { label: "Dividendes cumulés 3 ans",  value: "52 939 €", color: "#1B4FD8" },
              { label: "ROI total 3 ans",           value: "1 059 %",  color: "#C9A84C" },
            ].map((c, i) => (
              <div key={i} style={{ background: "#f8faff", borderRadius: 12, padding: "18px 12px", textAlign: "center", border: "1px solid #e0eaff" }}>
                <div style={{ fontSize: 10, color: "#9aa5be", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 7 — TABLE 10% */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", marginBottom: 20, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1B4FD8", display: "inline-block" }} />
            <span style={{ color: "#1B4FD8", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Palier 2 — 10 000 € / 10% des parts</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0D1B3E", margin: "0 0 20px 0" }}>Projection des dividendes — 10%</h2>
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e0eaff", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr", background: "#0D1B3E", padding: "12px 20px", gap: 8 }}>
              {["Semestre", "CA Total", "Résultat Net", "Dividendes 10%", "ROI cumulé"].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</div>
              ))}
            </div>
            {[
              { sem: "S1  Juin – Déc. 2026",  ca: "192 150 €", net: "+112 935 €", div: "11 294 €", roi: "113 %" },
              { sem: "S2  Janv. – Juin 2027", ca: "329 400 €", net: "+236 460 €", div: "23 646 €", roi: "349 %", bold: true },
              { sem: "S3  Juil. – Déc. 2027", ca: "329 400 €", net: "+236 460 €", div: "23 646 €", roi: "586 %" },
              { sem: "S4  Janv. – Juin 2028", ca: "329 400 €", net: "+236 460 €", div: "23 646 €", roi: "822 %" },
              { sem: "S5  Juil. – Déc. 2028", ca: "329 400 €", net: "+236 460 €", div: "23 646 €", roi: "1 059 %" },
            ].map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr", padding: "12px 20px", gap: 8, borderBottom: i < 4 ? "1px solid #e8f0ff" : "none", background: row.bold ? "#eef5ff" : (i % 2 === 0 ? "#fff" : "#f8faff") }}>
                <div style={{ fontSize: 13, fontWeight: row.bold ? 800 : 500, color: "#0D1B3E" }}>{row.sem}</div>
                <div style={{ fontSize: 13, color: "#4a5568" }}>{row.ca}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1565C0" }}>{row.net}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1B4FD8" }}>{row.div}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#C9A84C" }}>{row.roi}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Capital investi",          value: "10 000 €",  color: "#6b7a99" },
              { label: "1er versement (S2)",        value: "23 646 €",  color: "#1B4FD8" },
              { label: "Dividendes cumulés 3 ans",  value: "105 878 €", color: "#1B4FD8" },
              { label: "ROI total 3 ans",           value: "1 059 %",   color: "#C9A84C" },
            ].map((c, i) => (
              <div key={i} style={{ background: "#f8faff", borderRadius: 12, padding: "18px 12px", textAlign: "center", border: "1px solid #e0eaff" }}>
                <div style={{ fontSize: 10, color: "#9aa5be", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ background: "linear-gradient(135deg, #f0f4ff, #e8f2ff)", borderRadius: 14, padding: "20px 32px", textAlign: "center", border: "1px solid #c5d5f5", marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1B4FD8" }}>
            5 000 € → 52 939 € de dividendes sur 3 ans (ROI 1 059%)&nbsp;&nbsp;|&nbsp;&nbsp;10 000 € → 105 878 € sur 3 ans (ROI 1 059%)
          </p>
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: "#9aa5be", fontStyle: "italic", marginTop: 8 }}>Document confidentiel — Usage exclusif réservé au destinataire</p>

      </div>
    </div>
  );
}
