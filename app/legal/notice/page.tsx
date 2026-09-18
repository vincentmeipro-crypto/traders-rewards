import { LEGAL_ENTITY as company, LEGAL_UPDATED_ON } from "@/lib/legal-entity";

export const metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  const facts = [
    ["Éditeur et prestataire", company.name],
    ["Forme juridique", `${company.legalForm}, société à responsabilité limitée de droit estonien`],
    ["Numéro d’immatriculation", company.registryCode],
    ["Registre", company.registry],
    ["Date d’immatriculation", company.registeredOn],
    ["Siège social", company.address],
    ["Capital social", `${company.shareCapitalEur} €`],
    ["Représentant légal", `${company.representative}, membre du conseil de direction`],
  ];
  return <main style={{ minHeight: "100vh", background: "#070707", color: "#eee", padding: "72px 24px" }}>
    <div style={{ maxWidth: 860, margin: "0 auto", lineHeight: 1.8 }}>
      <a href="/" style={{ color: "#D9B96F" }}>Retour à l’accueil</a>
      <h1 style={{ fontSize: 38, marginTop: 28 }}>Mentions légales</h1>
      <p>Dernière mise à jour : {LEGAL_UPDATED_ON}</p>
      <dl>{facts.map(([label, value]) => <div key={label} style={{ padding: "14px 0", borderBottom: "1px solid #292929" }}>
        <dt style={{ fontWeight: 700, color: "#D9B96F" }}>{label}</dt><dd style={{ margin: 0 }}>{value}</dd>
      </div>)}</dl>
      <p>Contact clients et demandes relatives aux données personnelles : <a href={`mailto:${company.email}`} style={{ color: "#D9B96F" }}>{company.email}</a>.</p>
      <p><a href={company.registryUrl} style={{ color: "#D9B96F" }}>Consulter la fiche officielle au registre estonien</a></p>
      <h2>Hébergement</h2>
      <p>Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. <a href="https://vercel.com/legal/privacy-notice" style={{ color: "#D9B96F" }}>Coordonnées et informations de l’hébergeur</a>.</p>
      <h2>Nature du programme</h2>
      <p>Traders Rewards propose des évaluations de trading sur capital simulé. Les soldes affichés ne sont pas des dépôts clients. L’immatriculation au registre du commerce ne constitue pas un agrément de services financiers.</p>
      <p>Les modalités du programme et des achats figurent dans les <a href="/legal/terms" style={{ color: "#D9B96F" }}>CGV</a>. Le traitement des données est décrit dans la <a href="/legal/privacy" style={{ color: "#D9B96F" }}>politique de confidentialité</a>.</p>
    </div>
  </main>;
}
