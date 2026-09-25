import React, { useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useDashboard } from "../state/DashboardContext";
import { C, money } from "../theme";
import { Icon, Pill, Heading, Muted } from "./ui";
export function AccountPicker() {
  const [open, setOpen] = useState(false);
  const { account, selectAccount, snapshot } = useDashboard();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Changer de compte. ${account.name}`}
        onPress={() => setOpen(true)}
        style={st.select}
      >
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: "600" }}>
            {account.name}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {account.id} · Capital simulé
          </Text>
        </View>
        <Icon name="chevron-down" color={C.gold} />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={st.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer la sélection"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={st.sheet}>
            <View style={st.handle} />
            <Heading small>Vos comptes</Heading>
            <Muted>Sélectionnez le compte à consulter.</Muted>
            {snapshot.accounts.map((a) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: account.id === a.id }}
                key={a.id}
                onPress={() => {
                  selectAccount(a.id);
                  setOpen(false);
                }}
                style={[
                  st.option,
                  a.id === account.id && { borderColor: C.gold },
                ]}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <Text
                    style={{ fontSize: 16, color: C.text, fontWeight: "600" }}
                  >
                    {a.name}
                  </Text>
                  <Text style={{ fontSize: 14, color: C.muted }}>
                    {money(a.equity)}
                  </Text>
                </View>
                {a.id === account.id ? (
                  <Icon name="check-circle" color={C.gold} />
                ) : (
                  <Pill
                    text={a.kind === "reward" ? "Reward" : "Challenge"}
                    tone="muted"
                  />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}
const st = StyleSheet.create({
  select: {
    padding: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  overlay: { flex: 1, backgroundColor: "#000A", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111214",
    padding: 24,
    paddingBottom: 46,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    gap: 18,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 3,
    backgroundColor: C.line,
    alignSelf: "center",
  },
  option: {
    padding: 16,
    minHeight: 78,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
});
