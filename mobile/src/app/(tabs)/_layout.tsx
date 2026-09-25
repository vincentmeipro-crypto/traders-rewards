import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName } from "../../components/ui";
import { C } from "../../theme";
const screens: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Accueil", icon: "grid" },
  { name: "accounts", title: "Comptes", icon: "layers" },
  { name: "rewards", title: "Rewards", icon: "award" },
  { name: "activity", title: "Activité", icon: "bar-chart-2" },
  { name: "profile", title: "Profil", icon: "user" },
];
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: "#090909",
          borderTopColor: C.line,
          height: 76 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(12, insets.bottom),
        },
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, minHeight: 16, flexShrink: 0, fontWeight: "500" },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      {screens.map((x) => (
        <Tabs.Screen
          key={x.name}
          name={x.name}
          options={{
            title: x.title,
            tabBarIcon: ({ color }) => (
              <Icon name={x.icon} color={color} size={21} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
