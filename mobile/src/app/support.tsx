import React, { useState } from "react";
import { Text, Pressable, View } from "react-native";
import { Screen, Card, Row, Heading, Muted, Icon, s } from "../components/ui";
import { C } from "../theme";
const faq = [
  [
    "Comment suivre mon challenge ?",
    "Sélectionnez votre compte depuis l’accueil. Vous retrouvez le capital simulé, l’objectif, la limite de perte et les jours de trading.",
  ],
  [
    "Que signifie la consistance ?",
    "La consistance compare votre meilleure journée au résultat de la période de référence. Consultez les règles de votre compte pour connaître sa limite contractuelle.",
  ],
  [
    "Où retrouver mes Rewards ?",
    "L’onglet Rewards rassemble les cinq niveaux, votre progression et l’historique de vos récompenses. Les montants affichés sont nets lorsque cette mention est indiquée.",
  ],
  [
    "Comment sont actualisées les données ?",
    "Tirez l’écran vers le bas pour actualiser. La date de dernière synchronisation est indiquée sur votre compte. Le mode DÉMO affiche uniquement des données fictives.",
  ],
];
export default function Support() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Screen
      back
      title="À votre écoute."
      subtitle="Retrouvez les réponses essentielles."
    >
      <Card>
        <Icon name="headphones" size={30} color={C.gold} />
        <Heading small>Support Traders Rewards</Heading>
        <Text selectable style={{ color: C.gold, fontSize: 16 }}>
          contact@traders-rewards.eu
        </Text>
        <Muted>
          Pour toute question sur votre compte, contactez notre équipe à cette adresse.
        </Muted>
      </Card>
      <Heading small>Questions fréquentes</Heading>
      {faq.map(([q, a], i) => (
        <Pressable
          key={q}
          accessibilityRole="button"
          accessibilityState={{ expanded: open === i }}
          onPress={() => setOpen(open === i ? null : i)}
        >
          <Card>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={s.body}>{q}</Text>
              </View>
              <Icon name={open === i ? "minus" : "plus"} color={C.gold} />
            </Row>
            {open === i && <Muted>{a}</Muted>}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
