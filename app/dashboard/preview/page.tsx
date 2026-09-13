/**
 * /dashboard/preview — Page de prévisualisation DEV uniquement
 *
 * Accessible en local sur : http://localhost:3000/dashboard/preview?previewStage=reward
 * ou : http://localhost:3000/dashboard/preview?previewStage=challenger
 *
 * En production, redirige automatiquement vers /dashboard.
 * Aucune donnée réelle n'est utilisée ici.
 */

import { redirect } from "next/navigation";
import PreviewClient from "./PreviewClient";

export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/dashboard");
  }

  return <PreviewClient />;
}
