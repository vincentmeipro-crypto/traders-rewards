import React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useDashboard } from "../state/DashboardContext";
import { AccountPicker } from "../components/AccountPicker";
import { EquityChart } from "../components/EquityChart";
import {
  Screen,
  Card,
  Row,
  Muted,
  Heading,
  Pill,
  Button,
  s,
} from "../components/ui";
import { money, statusLabel } from "../theme";
export default function AccountDetail() {
  const { account: a } = useDashboard();
  return (
    <Screen back title={a.name} subtitle={a.id}>
      <AccountPicker />
      <Card>
        <Pill
          text={statusLabel(a.status)}
          tone="gold"
        />
        <Muted>Capital simulé actuel</Muted>
        <Text style={[s.number, { fontSize: 38 }]}>{money(a.equity)}</Text>
        <EquityChart account={a} period={30} />
      </Card>
      <Heading small>Les informations du compte</Heading>
      <Card>
        {[
          ["Capital initial", money(a.capital)],
          ["Profit réalisé", money(a.profit)],
          ["Plancher de perte", money(a.drawdownFloor)],
          ["Début", new Date(a.startedAt).toLocaleDateString("fr-FR")],
          [
            "Échéance",
            a.expiresAt
              ? new Date(a.expiresAt).toLocaleDateString("fr-FR")
              : "—",
          ],
          ["Jours qualifiants", `${a.qualifiedDays ?? "—"} / ${a.minDays ?? "—"}`],
        ].map(([k, v]) => (
          <Row key={k}>
            <View style={{ flex: 1 }}>
              <Muted>{k}</Muted>
            </View>
            <Text style={s.body}>{v}</Text>
          </Row>
        ))}
      </Card>
      <Button
        title="Voir toutes les règles"
        secondary
        onPress={() => router.push("/rules")}
      />
      <Card><Heading small>Suivi de votre compte</Heading><Muted>Cette application permet de consulter votre compte simulé et sa progression. Les opérations de trading ne sont pas exécutées ici.</Muted></Card>
    </Screen>
  );
}
