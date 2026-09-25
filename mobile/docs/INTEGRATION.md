# Intégration mobile

## Architecture et accès

`mobile/` contient un projet Expo avec ses dépendances séparées. Le build Next.js exclut l’application. Le contrat `mobile/src/domain/types.ts` est partagé avec le serveur par import de types uniquement.

Le mobile utilise Supabase Auth existant. Expo SecureStore conserve les jetons natifs en fragments de taille limitée ; le manifeste est remplacé après écriture complète. L’aperçu web utilise uniquement la mémoire. La déconnexion efface les données affichées et la session locale, sans déconnecter les autres appareils.

`GET /api/mobile/dashboard?account=<id>` vérifie le Bearer avec `auth.getUser`, puis utilise un client lié au jeton utilisateur, sans clé privilégiée. Les politiques RLS restent applicables. Les lectures `challenges`, `payouts` et `profiles` sont filtrées par l’identité vérifiée. Le compte demandé doit appartenir à l’utilisateur avant tout appel au fournisseur d’historique.

Les champs retournés sont explicitement sélectionnés ; aucun mot de passe, clé fournisseur ou destination de versement. Réponses `private, no-store`, erreurs 401/404/503 sans détails internes.

Le middleware d’accès privé du site est conservé. L’app utilise `/api/site-access` et son cookie HttpOnly, sans exception de middleware ni code intégré. Ce parcours doit être validé sur les deux plateformes.

## Données et calculs

Les tailles V1 25K/50K/100K utilisent `lib/v1-engine.ts`. Le plancher Challenge suit le plus haut EOD ; le plancher Reward utilise `getEffectiveRewardFloor`, y compris le verrouillage après paiement. Les anciens modèles sans règles suffisantes affichent une valeur inconnue.

L’éligibilité réutilise `loadRewardAccounts`, son cycle courant, son contrôle KYC et les données fournisseur. Le mobile ne valide aucune demande.

Le processus existant remplace `payouts.amount` par le **net** au paiement : les montants reçus sont affichés tels quels. Les demandes en attente sont brutes et les plafonds ne représentent pas des sommes acquises.

L’équité utilise le dernier solde et les positions ouvertes enregistrées ; elle est inconnue si ces positions sont indisponibles. La date de synchronisation accompagne le compte. La courbe cumule les opérations clôturées sur la période ; elle ne reconstitue pas l’équité après dépôts/retraits.

L’historique est chargé uniquement pour le compte sélectionné. Les deals sont dédupliqués, les mouvements de solde et entrées simples exclus, les frais de clôture disponibles inclus. Un retournement INOUT indique le résultat de la position clôturée, avec volume inconnu pour ne pas confondre clôture et nouvelle ouverture. Les frais séparés et les historiques partiels du fournisseur peuvent expliquer un écart avec le solde comptable. Calendrier : rollover à 22 h UTC. Une panne n’est pas affichée comme une absence d’opérations.

## Documents et limites

Profil/KYC : snapshot authentifié. Résumés de factures/certificats : routes Bearer existantes `/api/invoices` et `/api/certificates`, non modifiées. Limite de 100 factures récentes indiquée dans l’app. Téléchargements et dépôt KYC non implémentés.

Les variables `EXPO_PUBLIC_*` sont intégrées au bundle et doivent rester publiques. Le mode démo est explicite, jamais un repli automatique.

## Avant distribution

1. Déployer la branche sur un environnement de test configuré et créer un build interne avec les valeurs publiques de `.env.example`.
2. Tester deux utilisateurs, les politiques RLS réelles, expiration/renouvellement, retour au premier plan, changement de compte pendant un chargement, déconnexion et perte réseau.
3. Tester le cookie privé, le stockage sécurisé et les documents sur iOS et Android.
4. Comparer au dashboard un Challenge et des Rewards avant/après paiement.
5. Préparer identités de l’app, icône officielle, confidentialité, parcours de gestion du compte et fiches des stores.

Aucun achat, lien marchand, dépôt monétaire ou passage d’ordre. Les textes indiquent des comptes simulés et un capital virtuel. L’examen App Store/Play Store reste distinct ; aucune acceptation ou exemption de commission n’est garantie.

Documentation consultée : Expo SDK 57, Expo SecureStore, Supabase Auth React Native, documentation locale Next.js des Route Handlers.
