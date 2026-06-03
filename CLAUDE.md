# Elysium Funded — Context pour Claude

## Projet
Site live : https://www.elysium-rewards.com (Vercel, auto-deploy sur push)
Repo : vincentmeipro-crypto/elysium-funded
Stack : Next.js 15, React 19, TypeScript, Supabase, Stripe, Resend, Vercel

## Règles de travail
- Toujours commiter ET pusher après chaque modification
- Ne jamais créer de fichiers avec espaces dans `public/`
- Pour images hero mobile : utiliser `<img>` HTML classique, pas Next.js `<Image fill>`
- Terminologie client : "Certifié" (= funded), "Récompense" (= payout) — jamais "funded" ou "payout" visible
- Réponses courtes, passer directement à l'action

## Architecture
- `app/page.tsx` — landing page
- `app/dashboard/DashboardClient.tsx` — dashboard client
- `app/admin/page.tsx` — admin
- `app/checkout/page.tsx` — checkout (Stripe + Crypto + Promo free)
- `app/api/stripe/checkout/route.ts` + `webhook/route.ts`
- `app/api/crypto/checkout/route.ts` + `webhook/route.ts`
- `app/api/affiliate/me/route.ts` — API affiliation
- `components/RefTracker.tsx` — détecte ?ref= et sauvegarde en localStorage
- `lib/mt5.ts` — création comptes MT5 via Manager API (microservice Python VPS)
- `lib/mailer.ts` — emails transactionnels (Resend)

## Supabase — Tables importantes
- `challenges` : challenges des traders (phase, balance, mt5_login, etc.)
- `profiles` : infos client (first_name, last_name, phone, city, country, birth_date, etc.)
- `promo_codes` : codes promo (discount_percent, max_uses, used_count, active)
- `payouts` : demandes de récompenses
- `affiliates` : id, user_id, code (TEXT UNIQUE), commission_rate (INTEGER: 10/15/20), total_earned, total_paid
- `affiliate_referrals` : id, affiliate_user_id, referred_user_id, challenge_id, purchase_amount, commission_amount, status

## Système d'affiliation (implémenté)
- Chaque client a un code unique dans `affiliates.code`
- Landing page détecte `?ref=CODE` → localStorage (`elysium_ref`)
- Checkout passe `refCode` dans metadata Stripe et dans l'orderId crypto
- Webhooks Stripe + Crypto créent un enregistrement dans `affiliate_referrals`
- Dashboard tab "Affiliation" : affiche le lien, stats, tiers (10%/15%/20%)
- Tiers : 1-10 ventes = 10%, 11-29 = 15%, 30+ = 20%

## MT5
- Provider : Allan (gray label)
- Microservice Python sur VPS Windows → Manager API → serveur MT5
- Création automatique de compte MT5 à chaque achat (via `lib/mt5.ts`)

## Emails admin
- fundedelysium@gmail.com (admin)
- elysiumcertified@gmail.com (comptes MT5 clients)
- support@elysium-rewards.com (support)
