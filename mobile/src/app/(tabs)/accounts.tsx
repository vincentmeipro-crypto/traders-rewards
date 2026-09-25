import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useDashboard } from "../../state/DashboardContext";
import {
  Screen,
  Card,
  Row,
  Muted,
  Heading,
  Icon,
  Pill,
  Progress,
  s,
} from "../../components/ui";
import { C, money, signed, statusLabel } from "../../theme";
export default function Accounts() {
  const { snapshot, selectAccount, selectedId } = useDashboard();
  const [filter, setFilter] = useState("Tous");
  return (
    <Screen
      title="Vos comptes."
      subtitle="Un espace pour chaque étape de votre parcours."
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        {["Tous", "Challenges", "Rewards"].map((x) => (
          <Pressable
            key={x}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === x }}
            onPress={() => setFilter(x)}
            style={{
              minHeight: 44,
              padding: 12,
              borderRadius: 12,
              backgroundColor: filter === x ? C.goldDeep : C.surface,
            }}
          >
            <Text
              style={{ color: filter === x ? C.gold : C.muted, fontSize: 14 }}
            >
              {x}
            </Text>
          </Pressable>
        ))}
      </View>
      {snapshot.accounts
        .filter(
          (a) =>
            filter === "Tous" ||
            (filter === "Challenges"
              ? a.kind === "challenge"
              : a.kind === "reward"),
        )
        .map((a) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Consulter ${a.name}`}
            key={a.id}
            onPress={() => {
              selectAccount(a.id);
              router.push("/account");
            }}
          >
            <Card
              style={{
                borderColor: selectedId === a.id ? "#665334" : C.line,
                gap: 20,
              }}
            >
              <Row>
                <Icon
                  name={a.kind === "reward" ? "award" : "layers"}
                  color={C.gold}
                />
                <Pill
                  text={statusLabel(a.status)}
                  tone={a.status === "preparing" ? "muted" : "gold"}
                />
              </Row>
              <View style={{ gap: 5 }}>
                <Heading small>{a.name}</Heading>
                <Muted>{a.id}</Muted>
              </View>
              <Row>
                <Text style={s.number}>{money(a.equity)}</Text>
                <Icon name="arrow-up-right" color={C.gold} />
              </Row>
              <Row>
                <Text
                  style={{
                    color: a.profit > 0 ? C.green : C.muted,
                    fontSize: 14,
                  }}
                >
                  {signed(a.profit)}
                </Text>
                <Muted>
                  {a.qualifiedDays ?? "—"} jours suivis
                </Muted>
              </Row>
              <Progress
                value={
                  a.targetProfit
                    ? a.profit / a.targetProfit
                    : a.qualifiedDays != null && a.minDays ? a.qualifiedDays / a.minDays : 0
                }
              />
            </Card>
          </Pressable>
        ))}
      <Muted>
        Capital simulé. Les comptes Challenge et Reward sont suivis séparément.
      </Muted>
    </Screen>
  );
}
