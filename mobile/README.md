# Traders Rewards — iOS et Android

Application native React Native / Expo SDK 57, en français. Suivi de comptes **simulés**, règles, activité et récompenses. Logo original inchangé, noir/blanc/doré, aucun rose ni or rose. Aucun achat, lien marchand ou passage d’ordre.

## État de cette branche

Le raccordement est implémenté, mais **n’a pas encore été validé avec un vrai compte sur téléphone**. Aucun APK/IPA signé ni publication dans les stores.

- Connexion e-mail/mot de passe Supabase, renouvellement de session, stockage sécurisé natif, déconnexion locale.
- Dashboard authentifié via `GET /api/mobile/dashboard`, limité aux comptes de l’utilisateur vérifié.
- Règles V1 et éligibilité Rewards issues du moteur serveur existant ; données indisponibles identifiées.
- Sélection de comptes, calendrier mensuel, opérations clôturées, historique et montants nets des récompenses.
- Profil et statut KYC, listes de factures et certificats via les routes existantes.
- Chargement/erreurs, reprise au premier plan, rafraîchissement manuel, date de synchronisation.
- Démonstration facultative identifiée et désactivée par défaut, jamais activée en repli sur une erreur.

Les exports PDF, dépôt KYC, demandes de versement, messagerie, modification/suppression du compte et affiliation restent hors de cette version de consultation.

## Explorer sans compte client

Node.js 22.13 ou plus récent et npm :

```bash
cd mobile
npm ci
EXPO_PUBLIC_ALLOW_DEMO=true npm run web
```

Choisir « Découvrir la démonstration ». L’aperçu web utilise les mêmes écrans React Native ; il ne remplace pas un test natif.

## Raccorder un environnement de test

1. Déployer la branche serveur contenant `app/api/mobile/dashboard/route.ts` sur un environnement de test autorisé.
2. Copier `mobile/.env.example` vers `mobile/.env.local`.
3. Renseigner `EXPO_PUBLIC_API_URL` avec l’URL HTTPS du déploiement, puis `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` avec les **valeurs publiques du même projet Supabase**. Jamais de clé `service_role` dans l’app.
4. Relancer Expo après modification. Le serveur conserve ses propres variables privées.
5. La protection privée du site demeure appliquée. Le mobile demande le code après connexion ; aucun code n’est intégré. Vérifier le cookie sur iOS et Android.

La connexion depuis un aperçu web peut nécessiter une politique CORS de test ; aucune ouverture CORS globale n’est ajoutée au site.

## Vérifications

À la racine :

```bash
npm ci
npx tsc --noEmit
npx jest lib/__tests__/mobile-dashboard.test.ts lib/__tests__/mobile-dashboard-route.test.ts --runInBand
```

Dans `mobile/` :

```bash
npm run typecheck
npm run lint
npm run export:native -- --output-dir dist-native
EXPO_PUBLIC_ALLOW_DEMO=true npm run export:preview
```

L’export natif produit les bundles JavaScript/Hermes, pas des binaires signés.

## Builds internes

Après association au compte Expo du propriétaire, configuration EAS et ajout des variables publiques à l’environnement de build :

```bash
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

Le profil `preview` autorise la démonstration et prépare un APK interne Android. iOS nécessite signatures et appareils appropriés. Les identifiants proposés `eu.tradersrewards.mobile`, l’icône officielle, les accès Apple/Google et les informations de publication sont à confirmer avant distribution. `scripts/check-release.mjs` bloque la production jusqu’à validation réelle et préparation des stores.

Détails : [INTEGRATION.md](docs/INTEGRATION.md) et [VALIDATION.md](docs/VALIDATION.md).

La notice du modèle Expo est conservée dans `docs/EXPO-TEMPLATE-LICENSE.txt` ; elle concerne le modèle d’origine.
