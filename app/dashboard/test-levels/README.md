# Dashboard : fixtures locales N1 / N2 / N3

Accès : démarrer le projet avec `npm run dev`, se connecter avec le compte `sfp.vincent@gmail.com`, puis ouvrir http://localhost:3000/dashboard/test-levels (adapter le port si nécessaire).

La route refuse les builds de production, les hôtes autres que loopback et les autres utilisateurs. L'identifiant utilisateur provient de la session Supabase authentifiée, jamais d'une valeur inventée. Seule l'authentification est lue à distance. Les challenges et le payout ci-dessous existent uniquement en mémoire et ne sont jamais insérés en base.

| ID / label | Phase | Solde initial | Solde actuel | Highest EOD | Rewards paid |
| --- | --- | --- | --- | --- | --- |
| local-test-50k-n1 / TEST 50K — N1 CHALLENGER | phase1 | 50000 | 50000 | 50000 | 0 |
| local-test-50k-n2 / TEST 50K — N2 COMPTE REWARD | funded | 50000 | 52500 | 52500 | 0 |
| local-test-50k-n3 / TEST 50K — N3 TRADER REWARD | funded | 50000 | 52500 | 53000 | 1 |

Payout fictif : local-test-reward-n3-paid-1, challenge local-test-50k-n3, statut paid, montant 500 USD. Le solde N3 représente 53000 moins ce payout. Les comptes n'ont aucun identifiant MT5, aucune position et aucun historique de trades : 0 jour qualifiant est donc attendu. Le KYC approved est également une valeur de présentation fictive.

Basculer avec les boutons N1 / N2 / N3 en haut de page. Le cockpit réel est réutilisé sans modification. Les actions de navigation et de rafraîchissement du cockpit ne déclenchent aucune opération métier. Le dashboard habituel et ses comptes restent inchangés ; ces fixtures ne figurent pas dans son sélecteur.

Les règles existantes 25K/50K/100K restent inchangées. Attention à distinguer le seuil de présentation de 52000 USD du calcul de protection EOD existant : le code du cockpit utilise encore le Safety Net du moteur pour ce dernier. Cette fixture expose le comportement actuel sans le corriger.

Validation : niveaux dérivés avec le moteur réel = 1, 2, 3. Aucun commit ni push.
