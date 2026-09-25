import React, { useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useDashboard } from '../../state/DashboardContext';
import { AccountPicker } from '../../components/AccountPicker';
import { Screen, Card, Row, Heading, Muted, Icon, s } from '../../components/ui';
import { C, money, signed } from '../../theme';

export default function Activity() {
  const { account } = useDashboard();
  return <ActivityForAccount key={account.id} />;
}
function ActivityForAccount() {
  const { snapshot, account } = useDashboard();
  const [filter, setFilter] = useState('Tous');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [month, setMonth] = useState(() => snapshot.asOf.slice(0, 7));
  const [year, monthNumber] = month.split('-').map(Number);
  const monthDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const leading = (monthDate.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const changeMonth = (offset: number) => {
    setMonth(new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7));
    setSelectedDay(null);
  };
  const ready = account.historyState === 'ready';
  const trades = snapshot.trades.filter(t => t.accountId === account.id && t.tradingDate.startsWith(month));
  const shown = trades.filter(t => (filter === 'Tous' || (filter === 'Gains' ? t.netProfit > 0 : t.netProfit < 0)) && (!selectedDay || t.tradingDate === selectedDay));
  const wins = trades.filter(t => t.netProfit > 0), losses = trades.filter(t => t.netProfit < 0);
  return <Screen title="Votre activité." subtitle="Comprenez chaque journée de trading.">
    <AccountPicker />
    {!ready ? <Card><Heading small>{account.historyState === 'not_loaded' ? 'Chargement de l’historique…' : 'Historique indisponible'}</Heading><Muted>Les opérations apparaîtront après réception des données du compte.</Muted></Card> : <>
      <View style={s.grid}>
        <Card style={{ flex: 1, padding: 16 }}><Muted>Taux de réussite</Muted><Text style={s.number}>{trades.length ? `${Math.round(wins.length / trades.length * 100)} %` : '—'}</Text><Muted>{wins.length} / {trades.length} opérations ce mois</Muted></Card>
        <Card style={{ flex: 1, padding: 16 }}><Muted>Profit factor</Muted><Text style={s.number}>{losses.length ? (wins.reduce((n, t) => n + t.netProfit, 0) / Math.abs(losses.reduce((n, t) => n + t.netProfit, 0))).toFixed(2).replace('.', ',') : '—'}</Text><Muted>Gains / pertes</Muted></Card>
      </View>
      <Card>
        <Row>
          <Pressable accessibilityRole="button" accessibilityLabel="Mois précédent" onPress={() => changeMonth(-1)} style={{ padding: 12 }}><Icon name="chevron-left" color={C.gold} /></Pressable>
          <Heading small>{monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</Heading>
          <Pressable accessibilityRole="button" accessibilityLabel="Mois suivant" onPress={() => changeMonth(1)} style={{ padding: 12 }}><Icon name="chevron-right" color={C.gold} /></Pressable>
        </Row>
        <View style={{ flexDirection: 'row' }}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <Text key={i} style={{ width: '14.28%', textAlign: 'center', color: C.muted, fontSize: 12 }}>{d}</Text>)}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: leading }, (_, i) => <View key={`blank-${i}`} style={{ width: '14.28%' }} />)}
          {Array.from({ length: days }, (_, i) => i + 1).map(day => {
            const key = `${month}-${String(day).padStart(2, '0')}`;
            const profit = account.daily.find(d => d.date === key)?.profit;
            return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${key}${profit !== undefined ? `, ${signed(profit)}` : ', aucune opération'}`} accessibilityState={{ selected: selectedDay === key }} onPress={() => setSelectedDay(selectedDay === key ? null : key)} style={{ width: '14.28%', height: 48, padding: 2 }}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: selectedDay === key ? C.gold : 'transparent', backgroundColor: profit === undefined ? 'transparent' : profit >= 0 ? '#12231D' : '#281414' }}>
                <Text style={{ color: profit === undefined ? C.muted : profit >= 0 ? C.green : C.red }}>{day}</Text>
              </View>
            </Pressable>;
          })}
        </View>
        <Muted>Touchez une date pour filtrer. Journée de trading : clôture à 22 h UTC.</Muted>
      </Card>
      <Row><Heading small>{selectedDay ?? 'Opérations du mois'}</Heading>{selectedDay && <Pressable accessibilityRole="button" onPress={() => setSelectedDay(null)} style={{ padding: 12 }}><Text style={{ color: C.gold }}>Tout le mois</Text></Pressable>}</Row>
      <View style={{ flexDirection: 'row', gap: 8 }}>{['Tous', 'Gains', 'Pertes'].map(x => <Pressable key={x} accessibilityRole="button" accessibilityState={{ selected: filter === x }} onPress={() => setFilter(x)} style={{ padding: 12, minHeight: 44, borderRadius: 12, backgroundColor: filter === x ? C.goldDeep : C.surface }}><Text style={{ color: filter === x ? C.gold : C.muted }}>{x}</Text></Pressable>)}</View>
      {shown.map(t => <Pressable key={t.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/trade', params: { id: t.id } })}><Card style={{ padding: 16 }}><Row>
        <Icon name={t.side === 'Achat' ? 'arrow-up-right' : 'arrow-down-right'} color={C.muted} />
        <View style={{ flex: 1, gap: 5 }}><Text style={s.body}>{t.symbol}</Text><Muted>{t.side} · {t.tradingDate.slice(8, 10)}/{t.tradingDate.slice(5, 7)}</Muted></View>
        <Text style={{ fontSize: 16, fontWeight: '600', color: t.netProfit >= 0 ? C.green : C.red }}>{signed(t.netProfit)}</Text>
      </Row></Card></Pressable>)}
      {!shown.length && <Card><Heading small>Aucune opération sur cette sélection</Heading><Muted>Changez la date ou le filtre pour consulter votre activité.</Muted></Card>}
      <Card><Row><Muted>Résultat de la sélection</Muted><Text style={s.body}>{money(shown.reduce((n, t) => n + t.netProfit, 0))}</Text></Row></Card>
    </>}
  </Screen>;
}
