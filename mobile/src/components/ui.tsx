import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Image,
  ViewStyle,
  ColorValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { C } from "../theme";
import { useAuth } from "../state/AuthContext";
import { useDashboard } from "../state/DashboardContext";
export type IconName = React.ComponentProps<typeof Feather>["name"];
export function Icon({
  name,
  color = C.muted,
  size = 20,
}: {
  name: IconName;
  color?: ColorValue;
  size?: number;
}) {
  return <Feather name={name} size={size} color={color} />;
}
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={s.muted}>{children}</Text>;
}
export function Heading({
  children,
  small = false,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  return <Text style={[s.heading, small && { fontSize: 19 }]}>{children}</Text>;
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Pill({
  text,
  tone = "gold",
}: {
  text: string;
  tone?: "gold" | "green" | "muted";
}) {
  const color = tone === "green" ? C.green : tone === "gold" ? C.gold : C.muted;
  return (
    <View style={[s.pill, { backgroundColor: color + "14" }]}>
      <Text style={{ fontSize: 12, fontWeight: "600", color }}>{text}</Text>
    </View>
  );
}
export function Progress({
  value,
  color = C.gold,
}: {
  value: number;
  color?: string;
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(Math.max(0, Math.min(1, value)) * 100),
      }}
      style={s.track}
    >
      <View
        style={[
          s.fill,
          {
            width: `${Math.max(0, Math.min(1, value)) * 100}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.72 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: C.text }]}>
        {title}
      </Text>
      {icon && <Icon name={icon} color={secondary ? C.text : C.bg} size={18} />}
    </Pressable>
  );
}
export function MenuRow({
  icon,
  title,
  description,
  onPress,
  trailing,
}: {
  icon: IconName;
  title: string;
  description?: string;
  onPress: () => void;
  trailing?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.menu,
        pressed && { backgroundColor: C.raised },
      ]}
    >
      <View style={s.iconBox}>
        <Icon name={icon} color={C.gold} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.menuTitle}>{title}</Text>
        {description && <Text style={s.muted}>{description}</Text>}
      </View>
      {trailing && <Text style={s.muted}>{trailing}</Text>}
      <Icon name="chevron-right" size={18} />
    </Pressable>
  );
}
export function Screen({
  children,
  title,
  subtitle,
  back = false,
  brand = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  brand?: boolean;
}) {
  const { demo } = useAuth();
  const { loading, error, refresh, account } = useDashboard();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      <View style={s.topbar}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={() => router.back()}
            style={s.iconButton}
          >
            <Icon name="arrow-left" color={C.text} />
          </Pressable>
        ) : (
          <Image
            source={require("../../assets/traders-rewards-logo.png")}
            resizeMode="contain"
            style={s.logo}
          />
        )}
        <Pill text={demo ? "DÉMO" : "SUIVI"} tone="muted" />
        {!back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Aide et support"
            onPress={() => router.push("/support")}
            style={s.iconButton}
          >
            <Icon name="headphones" color={C.text} />
          </Pressable>
        )}
      </View>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            tintColor={C.gold}
            onRefresh={() => { void refresh(); }}
          />
        }
      >
        {title && (
          <View style={{ gap: 6, marginBottom: 6 }}>
            {brand && <Label>VOTRE ESPACE TRADER</Label>}
            <Heading>{title}</Heading>
            {subtitle && <Muted>{subtitle}</Muted>}
          </View>
        )}
        {!!error && <Card><Text accessibilityRole="alert" style={s.body}>{error}</Text><Muted>Les dernières données reçues restent affichées.</Muted><Button title="Réessayer" secondary onPress={() => void refresh(true)} /></Card>}
        {!demo && <Muted>{account?.lastSyncedAt ? `Données du ${new Date(account.lastSyncedAt).toLocaleString("fr-FR")}` : "Synchronisation du compte en attente"}</Muted>}
        {children}
        <Text style={s.footer}>{demo ? "Données fictives · aperçu de l’application" : "Comptes simulés · capital virtuel"}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topbar: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: { width: 154, height: 42, marginRight: "auto" },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 22,
    paddingTop: 12,
    gap: 18,
    paddingBottom: 35,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  label: { color: C.gold, fontSize: 11, fontWeight: "700", letterSpacing: 1.8 },
  muted: { color: C.muted, fontSize: 14, lineHeight: 21 },
  heading: {
    color: C.text,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "600",
    letterSpacing: -0.8,
  },
  card: {
    backgroundColor: C.surface,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    gap: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 30,
    alignSelf: "flex-start",
  },
  track: {
    height: 5,
    borderRadius: 5,
    backgroundColor: C.line,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 5 },
  button: {
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    flexDirection: "row",
  },
  secondary: { backgroundColor: C.raised, borderWidth: 1, borderColor: C.line },
  buttonText: { color: C.bg, fontSize: 15, fontWeight: "700" },
  menu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 74,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  iconBox: {
    backgroundColor: C.goldDeep,
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: { fontSize: 15, color: C.text, fontWeight: "600" },
  footer: {
    color: "#787A80",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
  number: {
    color: C.text,
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  body: { color: C.text, fontSize: 15, lineHeight: 23 },
  separator: { height: 1, backgroundColor: C.line },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
