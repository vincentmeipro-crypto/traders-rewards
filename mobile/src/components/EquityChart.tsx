import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { C, money } from '../theme';
import { Account } from '../domain/types';
import { useDashboard } from '../state/DashboardContext';

// Closed operations only: deposits and rewards make these unsuitable as an equity curve.
export function EquityChart({ account, period }: { account: Account; period: number }) {
  const { snapshot } = useDashboard();
  const end = new Date(Date.parse(snapshot.asOf) + 2 * 3600000);
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const start = endDay - (period - 1) * 86400000;
  const values = Array.from({ length: period }, (_, i) => {
    const key = new Date(start + i * 86400000).toISOString().slice(0, 10);
    return account.daily.find(d => d.date === key)?.profit ?? 0;
  }).reduce<number[]>((acc, profit) => [...acc, acc[acc.length - 1] + profit], [0]);
  const cumulative = values[values.length - 1];
  const lo = Math.min(...values), span = Math.max(Math.max(...values) - lo, 1);
  const points = values.map((v, i) => [10 + i / (values.length - 1) * 300, 100 - (v - lo) / span * 82]);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const last = points[points.length - 1];
  const label = { color: C.muted, fontSize: 12, lineHeight: 18 };
  if (account.historyState !== 'ready') return <Text style={label}>{account.historyState === 'not_loaded' ? 'Chargement de l’historique…' : 'Historique temporairement indisponible.'}</Text>;
  const hasActivity = account.daily.some(d => Date.parse(d.date) >= start && Date.parse(d.date) <= endDay);
  if (!hasActivity) return <Text style={label}>Aucune opération clôturée sur cette période.</Text>;
  return <View accessible accessibilityLabel={`Résultat cumulé des opérations clôturées : ${money(cumulative)} sur ${period} jours.`}>
    <Text style={label}>Résultat cumulé des opérations clôturées</Text>
    <Svg height={125} width="100%" viewBox="0 0 320 125">
      <Defs><LinearGradient id="goldFade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={C.gold} stopOpacity=".22" /><Stop offset="1" stopColor={C.gold} stopOpacity="0" /></LinearGradient></Defs>
      <Line x1="10" y1="100" x2="310" y2="100" stroke={C.line} strokeDasharray="3 6" />
      <Path d={`${d} L${last[0]},120 L10,120 Z`} fill="url(#goldFade)" />
      <Path d={d} stroke={C.gold} strokeWidth="2.2" fill="none" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r="4" fill={C.gold} />
    </Svg>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={label}>{new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</Text>
      <Text style={label}>{money(cumulative)}</Text>
    </View>
  </View>;
}
