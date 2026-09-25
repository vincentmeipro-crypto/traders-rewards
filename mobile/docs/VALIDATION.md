# Vérifications — 25 septembre 2026

## Réalisées

- TypeScript : projet Next.js complet et application Expo sans erreur.
- ESLint : application Expo et nouveaux fichiers serveur/tests sans erreur ni avertissement.
- 13 tests ciblés réussis : Bearer absent/invalide, identité vérifiée, isolation des comptes avant appel fournisseur, champs sensibles exclus, erreurs sans détails internes, absence de comptes, panne fournisseur, règles V1, planchers avant/après paiement, montants payés déjà nets, déduplication et rollover.
- Exports des bundles iOS/Android et de l’aperçu web réussis.
- Navigation dans le navigateur : connexion désactivée sans configuration, entrée volontaire en démo, accueil, calendrier mensuel, sélection Reward, détail d’un paiement net, profil et sortie de démonstration avec retour à la connexion.
- Palette noir/blanc/doré, logo original, mention DÉMO et caractère simulé visibles.

## Non réalisées

- Connexion avec un vrai compte : aucune session client utilisée dans ces vérifications.
- Validation des politiques RLS réelles et disponibilité des colonnes sur l’environnement cible.
- Sessions, stockage sécurisé, suppression locale, cookie privé et lectures de documents sur appareils réels.
- Build APK/IPA signé, installation, bêta et soumission aux stores.

Les tests utilisent des doublures de Supabase et du fournisseur ; ils ne valident pas la production. Les exports natifs sont des bundles, pas des binaires installables. Le profil de production reste bloqué jusqu’aux validations réelles.
