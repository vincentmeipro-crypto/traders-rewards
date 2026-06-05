"use client";

export default function ProjectionPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: "#f8faff", minHeight: "100vh", padding: "40px 24px", color: "#0D1B3E" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-break { page-break-before: always; }
        }
        .stat-card { background: linear-gradient(135deg, #1565C0, #1B4FD8); border-radius: 16px; padding: 24px; color: white; text-align: center; }
        .market-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e0eaff; box-shadow: 0 4px 20px rgba(21,101,192,0.08); }
        .table-row:nth-child(even) { background: #f0f7ff; }
        .gold { color: #C9A84C; }
        .blue { color: #1B4FD8; }
        .navy { color: #0D1B3E; }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Download button */}
        <div className="no-print" style={{ textAlign: "right", marginBottom: 24 }}>
          <button onClick={() => window.print()} style={{ background: "#1565C0", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🖨 Imprimer / PDF
          </button>
        </div>

        {/* HEADER */}
        <div style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1a2f5e 100%)", borderRadius: 20, padding: "40px 48px", marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
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
        <div style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #1565C0 100%)", borderRadius: 20, padding: "36px 40px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", bottom: -60, right: 60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", display: "inline-block" }} />
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Opportunité de marché</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8, margin: "0 0 8px 0" }}>Le marché PropFirm mondial</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 32, margin: "0 0 32px 0" }}>Un secteur en explosion porté par la démocratisation du trading</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { value: "$6 Mds", label: "Marché mondial 2024", sub: "en chiffre d'affaires annuel" },
                { value: "+30 %", label: "Croissance annuelle", sub: "TCAC — projection 2025-2028" },
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
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", marginBottom: 24, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1565C0", display: "inline-block" }} />
            <span style={{ color: "#1565C0", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Cible prioritaire</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0D1B3E", marginBottom: 6, margin: "0 0 6px 0" }}>Marché France & Europe — Traders particuliers</h2>
          <p style={{ color: "#6b7a99", fontSize: 14, marginBottom: 28, margin: "0 0 28px 0" }}>Elysium cible en priorité la France et l'Europe avant toute expansion internationale</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
            {/* France */}
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

            {/* Europe */}
            <div style={{ background: "#f8faff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e0eaff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <img src="https://flagcdn.com/40x30/eu.png" alt="EU" style={{ width: 28, height: 21, borderRadius: 3 }} />
                <span style={{ fontWeight: 800, fontSize: 16, color: "#0D1B3E" }}>Europe</span>
              </div>
              {[
                { label: "Traders retail actifs", value: "~15 millions" },
                { label: "France, DE, ES, IT, BE, NL…", value: "Marché francophone" },
                { label: "Adoption PropFirm (2-5%)", value: "300 000 – 750 000" },
                { label: "Croissance adoption", value: "+40%/an" },
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
              🎯 <strong>Avantage concurrentiel Elysium :</strong> premier acteur PropFirm 100% francophone, interface en français, support en français, paiement en € — dans un marché dominé par des acteurs anglophones (FTMO, MyFundedFX, E8 Funding).
            </p>
          </div>
        </div>

        {/* SECTION 3 — CHIFFRES CLÉS */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", marginBottom: 24, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1565C0", display: "inline-block" }} />
            <span style={{ color: "#1565C0", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Modèle économique</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0D1B3E", marginBottom: 24, margin: "0 0 24px 0" }}>Chiffres clés de rentabilité</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Prix moyen challenge (promo 50%)", value: "183 EUR", highlight: true },
              { label: "Charges mensuelles", value: "10 000 EUR", highlight: false },
              { label: "Récompenses clients (10% CA × 3% profit)", value: "≈ 10% du CA", highlight: false },
              { label: "Résultat S1 (Juin – Déc. 2026)", value: "+ 112 935 EUR", highlight: true },
              { label: "Résultat S2+ (par semestre, plateau)", value: "+ 236 460 EUR", highlight: true },
              { label: "CA mensuel au plafond (300 ventes)", value: "54 900 EUR / mois", highlight: false },
              { label: "CA annuel stabilisé (2027+)", value: "658 800 EUR / an", highlight: false },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: row.highlight ? "linear-gradient(135deg, #f0f4ff, #e8f2ff)" : "#f8faff", borderRadius: 10, border: `1px solid ${row.highlight ? "#c5d5f5" : "#eef2fa"}` }}>
                <span style={{ fontSize: 13, color: "#4a5568" }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.highlight ? "#1B4FD8" : "#0D1B3E", whiteSpace: "nowrap", marginLeft: 16 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4 — OFFRE */}
        <div style={{ background: "linear-gradient(135deg, #0D1B3E, #1a2f5e)", borderRadius: 20, padding: "36px 40px", marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>OFFRE D'INVESTISSEMENT</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#C9A84C", lineHeight: 1, marginBottom: 8 }}>5 000 € — 10% des parts</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Investissement requis pour 10% des parts — dividendes versés chaque semestre</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>Dividendes = 10% du bénéfice net (uniquement si résultat positif)</div>
        </div>

        {/* SECTION 5 — PROJECTION TABLE */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", marginBottom: 24, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1565C0", display: "inline-block" }} />
            <span style={{ color: "#1565C0", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Projection des dividendes</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0D1B3E", marginBottom: 24, margin: "0 0 24px 0" }}>Projection des dividendes</h2>

          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e0eaff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr", background: "#0D1B3E", padding: "14px 20px", gap: 8 }}>
              {["Semestre", "CA Total", "Résultat Net", "Dividendes 10%", "ROI cumulé"].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</div>
              ))}
            </div>
            {[
              { sem: "S1  Juin – Déc. 2026",    ca: "192 150 €",  net: "+112 935 €", div: "11 293 €", roi: "226 %",  bold: false },
              { sem: "S2  Janv. – Juin 2027",   ca: "329 400 €",  net: "+236 460 €", div: "23 646 €", roi: "699 %",  bold: true  },
              { sem: "S3  Juil. – Déc. 2027",   ca: "329 400 €",  net: "+236 460 €", div: "23 646 €", roi: "1 172 %", bold: false },
              { sem: "S4  Janv. – Juin 2028",   ca: "329 400 €",  net: "+236 460 €", div: "23 646 €", roi: "1 645 %", bold: false },
              { sem: "S5  Juil. – Déc. 2028",   ca: "329 400 €",  net: "+236 460 €", div: "23 646 €", roi: "2 118 %", bold: false },
            ].map((row, i) => (
              <div key={i} className="table-row" style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr", padding: "14px 20px", gap: 8, borderBottom: i < 4 ? "1px solid #e8f0ff" : "none", background: row.bold ? "#eef5ff" : (i % 2 === 0 ? "#fff" : "#f8faff") }}>
                <div style={{ fontSize: 13, fontWeight: row.bold ? 800 : 500, color: "#0D1B3E" }}>{row.sem}</div>
                <div style={{ fontSize: 13, color: "#4a5568" }}>{row.ca}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1565C0" }}>{row.net}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0D1B3E" }}>{row.div}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#C9A84C" }}>{row.roi}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#9aa5be", marginTop: 12, fontStyle: "italic" }}>* S1 basé sur une montée en charge progressive. S2 : plateau 300 ventes/mois. S3–S5 : extension sur la même base.</p>
        </div>

        {/* SECTION 6 — BILAN */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", marginBottom: 24, border: "1px solid #e0eaff", boxShadow: "0 4px 24px rgba(21,101,192,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fdf8ee", borderRadius: 100, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", display: "inline-block" }} />
            <span style={{ color: "#C9A84C", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Bilan — Investissement 5 000 € / 10% des parts</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { label: "Capital investi",         value: "5 000 €",   color: "#6b7a99" },
              { label: "1er versement (S2)",       value: "23 646 €",  color: "#1B4FD8" },
              { label: "Dividendes cumulés 3 ans", value: "105 877 €", color: "#1B4FD8" },
              { label: "ROI total 3 ans",          value: "2 118 %",   color: "#C9A84C" },
            ].map((c, i) => (
              <div key={i} style={{ background: "#f8faff", borderRadius: 14, padding: "24px 16px", textAlign: "center", border: "1px solid #e0eaff" }}>
                <div style={{ fontSize: 11, color: "#9aa5be", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>{c.label}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ background: "linear-gradient(135deg, #f0f4ff, #e8f2ff)", borderRadius: 14, padding: "20px 32px", textAlign: "center", border: "1px solid #c5d5f5", marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1B4FD8" }}>
            Pour 5 000 € investis → 105 877 € de dividendes cumulés sur 3 ans — ROI total 2 118 %
          </p>
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: "#9aa5be", fontStyle: "italic" }}>Document confidentiel — Usage exclusif réservé au destinataire</p>

      </div>
    </div>
  );
}
