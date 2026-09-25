// Charte actuelle : noir, blanc et doré. Aucun accent rose ou or rose.
// Le vert et le rouge sont réservés aux états et aux performances.
export const C = {
  bg: "#000000",
  surface: "#101113",
  raised: "#191A1D",
  line: "#28292D",
  text: "#F7F7F5",
  muted: "#9A9BA1",
  gold: "#D4A843",
  goldDeep: "#30291D",
  green: "#68D5AB",
  red: "#EF4444",
};
export const money = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" :
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)} $`;
export const signed = (n: number) => `${n > 0 ? "+" : ""}${money(n)}`;

export const percent = (n: number | null | undefined) => n == null ? "—" : `${(n * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
const statuses: Record<string, string> = { active: "Actif", funded: "Actif", preparing: "En préparation", passed: "Validé", failed: "Compte arrêté", breached: "Compte arrêté", terminated: "Terminé", pending: "En attente", closed: "Fermé" };
export const statusLabel = (status: string) => statuses[status] ?? "Statut à vérifier";
