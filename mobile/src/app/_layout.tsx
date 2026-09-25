import React from "react";
import { View, Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DashboardProvider } from "../state/DashboardContext";
import { AuthProvider } from "../state/AuthContext";
import { AppGate } from "../components/AppGate";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          width: "100%",
          maxWidth: Platform.OS === "web" ? 430 : undefined,
          alignSelf: "center",
        }}
      >
        <AuthProvider><DashboardProvider><AppGate>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#000" },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="account" />
            <Stack.Screen name="rules" />
            <Stack.Screen name="support" />
            <Stack.Screen name="documents" />
            <Stack.Screen name="trade" />
            <Stack.Screen name="reward-detail" />
          </Stack>
        </AppGate></DashboardProvider></AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
