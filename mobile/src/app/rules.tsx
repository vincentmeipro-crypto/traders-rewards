import React from 'react';
import { useDashboard } from '../state/DashboardContext';
import { AccountPicker } from '../components/AccountPicker';
import { Screen, Card, Heading, Muted } from '../components/ui';
import { money, percent } from '../theme';
export default function Rules() {
  const { account: a } = useDashboard();
  const rows = [
    ['Objectif de profit', a.kind === 'reward' ? 'Aucun objectif de validation' : a.targetProfit == null ? 'Non disponible' : `${money(a.targetProfit)} (${percent(a.targetProfit / a.capital)})`],
    [a.drawdownLabel, `${percent(a.drawdownRate)} · plancher : ${money(a.drawdownFloor)}`],
    ['Consistance maximum', percent(a.consistencyLimit)],
    [a.kind === 'reward' ? 'Jours qualifiants par cycle' : 'Jours de trading minimum', a.minDays == null ? 'Non disponible' : `${a.minDays} jours`],
    ['Échéance', a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('fr-FR') : a.kind === 'reward' ? 'Sans échéance' : 'Non disponible'],
    ...(a.kind === 'reward' ? [['Profit journalier qualifiant', money(a.qualifyingDailyProfit)], ['Votre part', percent(a.profitSplit)]] : []),
  ];
  return <Screen back title="Vos règles." subtitle="Les conditions du compte sélectionné.">
    <AccountPicker />
    {rows.map(([title, value]) => <Card key={title}><Muted>{title}</Muted><Heading small>{value}</Heading></Card>)}
    <Muted>Les règles affichées proviennent de votre contrat et du système Traders Rewards. La progression et l’éligibilité sont contrôlées côté serveur.</Muted>
  </Screen>;
}
