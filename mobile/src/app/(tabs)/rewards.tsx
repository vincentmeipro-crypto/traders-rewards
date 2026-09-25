import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useDashboard } from '../../state/DashboardContext';
import { AccountPicker } from '../../components/AccountPicker';
import { Screen, Card, Row, Muted, Heading, Pill, Progress, s } from '../../components/ui';
import { C, money, percent } from '../../theme';
const reasonLabels: Record<string, string> = { days: 'Jours qualifiants à compléter', consistency: 'Consistance à respecter',
  kyc: 'Vérification d’identité requise', pending: 'Une demande est déjà en cours', floor: 'Montant disponible insuffisant',
  inactive: 'Compte inactif', terminated: 'Parcours terminé', unsupported: 'Compte non pris en charge', unavailable: 'Vérification temporairement indisponible' };
const statuses: Record<string, string> = { paid: "Payée", pending: "En attente", approved: "Approuvée", processing: "En traitement", rejected: "Refusée" };
export default function Rewards() {
  const { snapshot, account: a } = useDashboard();
  const paid = snapshot.rewards.filter(r => r.status === 'paid');
  const total = paid.reduce((sum, r) => sum + (r.net ?? 0), 0);
  const nextCap = a.rewardLevel == null ? null : a.rewardCaps[a.rewardLevel - 1] ?? null;
  const unavailable = !a.eligibility || a.eligibility.reasons.includes('unavailable');
  return <Screen title="Vos récompenses." subtitle="Votre progression et vos versements.">
    <Card><Muted>Récompenses reçues · tous vos comptes</Muted><Text style={[s.number, { fontSize: 40, color: C.gold }]}>{money(total)}</Text><Muted>Montants nets enregistrés</Muted></Card>
    <AccountPicker />
    {a.kind !== 'reward' ? <Card><Heading small>Votre parcours continue</Heading><Muted>Les conditions de récompense s’afficheront lorsque votre compte Reward sera disponible.</Muted></Card> : <>
      <Row><Heading small>{a.name}</Heading><Pill text={`${a.paidRewards} reçue${a.paidRewards > 1 ? 's' : ''}`} /></Row>
      <Card>
        <Heading small>{a.rewardLevel ? `Récompense ${a.rewardLevel}` : 'Parcours terminé ou conditions indisponibles'}</Heading>
        <Row><Muted>Plafond brut du niveau</Muted><Text style={s.body}>{money(nextCap)}</Text></Row>
        <Row><Muted>Votre part</Muted><Text style={s.body}>{percent(a.profitSplit)}</Text></Row>
        <Row><Muted>Jours qualifiants</Muted><Text style={s.body}>{a.qualifiedDays ?? '—'} / {a.minDays ?? '—'}</Text></Row>
        {a.qualifiedDays != null && a.minDays != null && a.minDays > 0 && <Progress value={a.qualifiedDays / a.minDays} />}
        <Muted>Minimum journalier : {money(a.qualifyingDailyProfit)}</Muted>
        {unavailable ? <Muted>Vérification de l’éligibilité indisponible pour le moment.</Muted> : <>
          <Pill text={a.eligibility!.eligible ? 'Conditions remplies' : 'Conditions à compléter'} tone={a.eligibility!.eligible ? 'green' : 'muted'} />
          <Row><Muted>Maximum brut actuel</Muted><Text style={s.body}>{money(a.eligibility!.maximum)}</Text></Row>
          {a.eligibility!.reasons.map(reason => <Muted key={reason}>{reasonLabels[reason] ?? 'Condition à vérifier'}</Muted>)}
        </>}
      </Card>
      {!!a.rewardCaps.length && <Heading small>Les niveaux de récompense</Heading>}
      {a.rewardCaps.map((cap, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Récompense ${index + 1}`} onPress={() => router.push({ pathname: '/reward-detail', params: { level: index + 1 } })}>
        <Card><Row><Text style={s.body}>Récompense {index + 1}</Text><Text style={s.body}>{money(cap)} brut</Text></Row><Muted>{index < a.paidRewards ? 'Reçue' : index + 1 === a.rewardLevel ? 'En cours' : 'Étape suivante'}</Muted></Card>
      </Pressable>)}
    </>}
    <Heading small>Historique des demandes</Heading>
    {!snapshot.rewards.length && <Muted>Aucune demande enregistrée.</Muted>}
    {snapshot.rewards.map(r => <Card key={r.id}><Row><Text style={s.body}>{r.status === 'paid' ? 'Versement reçu' : 'Demande de récompense'}</Text><Text style={s.body}>{money(r.status === 'paid' ? r.net : r.gross)}</Text></Row>
      <View><Muted>{new Date(r.date).toLocaleDateString('fr-FR')} · {r.status === 'paid' ? 'Net' : 'Brut demandé'}</Muted><Muted>{statuses[r.status] ?? 'Statut à vérifier'}</Muted></View>
    </Card>)}
    <Muted>Cette version permet le suivi des récompenses. Elle ne déclenche aucun versement.</Muted>
  </Screen>;
}
