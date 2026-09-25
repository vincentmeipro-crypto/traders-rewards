import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useDashboard } from '../../state/DashboardContext';
import { AccountPicker } from '../../components/AccountPicker';
import { EquityChart } from '../../components/EquityChart';
import { Screen, Card, Row, Muted, Heading, Pill, Button, Progress, s } from '../../components/ui';
import { C, money, percent, signed, statusLabel } from '../../theme';
export default function Home() {
  const { account: a } = useDashboard();
  const [period, setPeriod] = useState(30);
  const buffer = a.equity == null || a.drawdownFloor == null ? null : a.equity - a.drawdownFloor;
  return <Screen title="Votre progression." subtitle="L’essentiel de votre compte, en un regard." brand>
    <AccountPicker />
    <Card>
      <Row><Muted>Capital simulé actuel</Muted><Pill text={statusLabel(a.status)} /></Row>
      <Text style={[s.number, { fontSize: 40 }]}>{money(a.equity)}</Text>
      <Text style={{ color: a.profit < 0 ? C.red : C.green }}>Résultat du compte : {signed(a.profit)} ({percent(a.profit / a.capital)})</Text>
      <EquityChart account={a} period={period} />
      <Row><Button title="7 jours" secondary={period !== 7} onPress={() => setPeriod(7)} /><Button title="30 jours" secondary={period !== 30} onPress={() => setPeriod(30)} /></Row>
    </Card>
    <View style={s.grid}>
      <Card style={{ flex: 1, padding: 16 }}>
        <Muted>{a.kind === 'challenge' ? 'Objectif restant' : 'Jours qualifiants'}</Muted>
        <Text style={s.number}>{a.kind === 'challenge' ? money(a.targetProfit == null ? null : Math.max(0, a.targetProfit - a.profit)) : `${a.qualifiedDays ?? '—'} / ${a.minDays ?? '—'}`}</Text>
        {a.targetProfit != null && a.targetProfit > 0 && <Progress value={a.profit / a.targetProfit} />}
      </Card>
      <Card style={{ flex: 1, padding: 16 }}><Muted>Marge avant limite</Muted><Text style={s.number}>{money(buffer)}</Text><Muted>Plancher : {money(a.drawdownFloor)}</Muted></Card>
    </View>
    <Heading small>Vos règles</Heading>
    <Card>
      <Row><Muted>{a.kind === 'reward' ? 'Jours qualifiants du cycle' : 'Jours de trading'}</Muted><Text style={s.body}>{a.qualifiedDays ?? '—'} / {a.minDays ?? '—'}</Text></Row>
      <Row><Muted>Consistance</Muted><Text style={s.body}>{percent(a.consistency)}</Text></Row>
      <Muted>Limite contractuelle : {percent(a.consistencyLimit)}</Muted>
      <Button title="Voir les règles" secondary onPress={() => router.push('/rules')} />
    </Card>
    <Button title="Détail du compte" onPress={() => router.push('/account')} />
  </Screen>;
}
