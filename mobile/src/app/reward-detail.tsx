import React from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDashboard } from '../state/DashboardContext';
import { Screen, Card, Row, Muted, Heading, Pill, s } from '../components/ui';
import { C, money, percent } from '../theme';
export default function RewardDetail() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const n = Number(level);
  const { snapshot, account: a } = useDashboard();
  if (!Number.isInteger(n) || n < 1 || n > a.rewardCaps.length || a.kind !== 'reward') return <Screen back title="Récompense introuvable"><Muted>Ce niveau n’est pas disponible pour le compte sélectionné.</Muted></Screen>;
  const cap = a.rewardCaps[n - 1];
  const paid = snapshot.rewards.find(r => r.accountId === a.id && r.level === n && r.status === 'paid');
  return <Screen back title={`Récompense ${n}`} subtitle={a.name}>
    <Card><Pill text={paid ? 'Reçue' : n === a.rewardLevel ? 'En cours' : 'Étape suivante'} />
      <Muted>{paid ? 'Montant net enregistré' : 'Montant net maximum du niveau'}</Muted>
      <Text style={[s.number, { color: C.gold, fontSize: 40 }]}>{money(paid ? paid.net : a.profitSplit == null ? null : cap * a.profitSplit)}</Text>
      {!paid && <><Row><Muted>Plafond brut</Muted><Text style={s.body}>{money(cap)}</Text></Row><Row><Muted>Votre part</Muted><Text style={s.body}>{percent(a.profitSplit)}</Text></Row></>}
    </Card>
    <Card><Heading small>{paid ? 'Versement enregistré' : 'Conditions de progression'}</Heading><Muted>{paid ? `Le ${new Date(paid.date).toLocaleDateString('fr-FR')}.` : 'Le plafond ne constitue pas une somme acquise. L’éligibilité et le montant disponible sont vérifiés par le système.'}</Muted></Card>
  </Screen>;
}
