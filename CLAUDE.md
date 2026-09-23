# Traders Rewards — Contexte projet

## Projet
Site live : https://www.traders-rewards.eu (Vercel, auto-deploy sur push)
Entité : Traders Rewards OÜ
Stack : Next.js 16, React 19, TypeScript, Supabase, Stripe, Resend, Vercel

Ancien nom interne : Elysium Funded. Ne plus l'utiliser dans le code, les docs ou les réponses. Deux identifiants historiques restent en place pour ne pas casser les sessions déjà stockées : la clé localStorage `elysium_ref` et le préfixe d'orderId crypto `elysium~`.

## Règles de travail
- Toujours commiter ET pusher après chaque modification
- Ne jamais créer de fichiers avec espaces dans `public/`
- Pour images hero mobile : utiliser `<img>` HTML classique, pas Next.js `<Image fill>`
- Terminologie client : "Certifié" (= funded), "Récompense" (= payout) — jamais "funded" ou "payout" visible
- Réponses courtes, passer directement à l'action
- Pas de clé admin dans le JavaScript public. L'admin `/x8k3pz` exige une session Supabase dont l'email est `ADMIN_EMAIL`.

## Architecture
- `app/page.tsx` — landing page
- `app/dashboard/DashboardClient.tsx` — dashboard client
- `app/dashboard/TraderCockpit.tsx` — cockpit trader
- `app/x8k3pz/` — back-office (pas `app/admin`)
- `app/checkout/page.tsx` — checkout (Stripe + Crypto + Promo free)
- `app/api/stripe/checkout/route.ts` + `webhook/route.ts`
- `app/api/crypto/checkout/route.ts` + `webhook/route.ts`
- `app/api/affiliate/me/route.ts` — API affiliation
- `components/RefTracker.tsx` — détecte ?ref= et sauvegarde en localStorage
- `lib/mt5.ts` — création comptes MT5 via Manager API (microservice Python VPS)
- `lib/mailer.ts` — emails transactionnels (Resend)
- `lib/admin-auth.ts` — session admin
- `lib/product-engine.ts` — prix et règles lus en base

## Supabase — Tables importantes
- `challenges` : challenges des traders (phase, balance, mt5_login, etc.)
- `profiles` : infos client (first_name, last_name, phone, city, country, birth_date, etc.)
- `promo_codes` : codes promo (discount_percent, max_uses, used_count, active)
- `payouts` : demandes de récompenses
- `affiliates` : id, user_id, code (TEXT UNIQUE), commission_rate (INTEGER: 10/15/20), total_earned, total_paid
- `affiliate_referrals` : id, affiliate_user_id, referred_user_id, challenge_id, purchase_amount, commission_amount, status

## Système d'affiliation (implémenté)
- Chaque client a un code unique dans `affiliates.code`
- Landing page détecte `?ref=CODE` → localStorage (`elysium_ref`, nom historique)
- Checkout passe `refCode` dans metadata Stripe et dans l'orderId crypto
- Webhooks Stripe + Crypto créent un enregistrement dans `affiliate_referrals`
- Dashboard tab "Affiliation" : affiche le lien, stats, tiers (10%/15%/20%)
- Tiers : 1-10 ventes = 10%, 11-29 = 15%, 30+ = 20%

## MT5
- Provider : Allan (gray label)
- Microservice Python sur VPS Windows → Manager API → serveur MT5
- Création automatique de compte MT5 à chaque achat (via `lib/mt5.ts`)

## Emails
- contact@traders-rewards.eu (contact public et expéditeur)
- Compte admin applicatif : email défini par `ADMIN_EMAIL`
