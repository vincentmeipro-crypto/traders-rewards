import React from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useDashboard } from "../state/DashboardContext";
import { Screen, Card, Row, Muted, Heading, Pill, s } from "../components/ui";
import { C, signed } from "../theme";
export default function TradeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot } = useDashboard();
  const t = snapshot.trades.find((t) => t.id === id);
  if (!t)
    return (
      <Screen back title="Trade introuvable">
        <Muted>Ce trade n’est pas disponible.</Muted>
      </Screen>
    );
  return (
    <Screen back title={t.symbol} subtitle={`Trade ${t.id}`}>
      <Card>
        <Pill text={t.side} />
        <Muted>Résultat net</Muted>
        <Text
          style={[
            s.number,
            { fontSize: 40, color: t.netProfit >= 0 ? C.green : C.red },
          ]}
        >
          {signed(t.netProfit)}
        </Text>
      </Card>
      <Heading small>Détail de l’opération</Heading>
      <Card>
        {[
          ["Compte", t.accountId],
          ["Sens", t.side],
          ["Volume", t.volume == null ? "—" : `${t.volume} lot`],
          [
            "Ouverture",
            t.openedAt ? new Date(t.openedAt).toLocaleString("fr-FR", {
              timeZone: "Europe/Paris",
            }) : "—",
          ],
          [
            "Clôture",
            new Date(t.closedAt).toLocaleString("fr-FR", {
              timeZone: "Europe/Paris",
            }),
          ],
        ].map(([k, v]) => (
          <Row key={k} style={{ flexWrap: "wrap" }}>
            <Muted>{k}</Muted>
            <Text style={s.body}>{v}</Text>
          </Row>
        ))}
      </Card>
      <Muted>Heures affichées dans le fuseau de Paris.</Muted>
    </Screen>
  );
}
