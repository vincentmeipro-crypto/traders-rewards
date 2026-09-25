// A signed production build requires end-to-end validation and store preparation.
if (process.env.EAS_BUILD_PROFILE === "production") {
  throw new Error(
    "Production non activée : validez la connexion réelle et les sessions sur iOS/Android, configurez les identités et les fiches stores, puis remplacez ce verrou par vos contrôles de publication.",
  );
}
