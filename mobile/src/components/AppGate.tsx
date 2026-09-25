import React, { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../state/AuthContext";
import { useDashboard } from "../state/DashboardContext";
import { config, configurationReady } from "../services/config";
import { supabase } from "../services/supabase";
import { unlockSite } from "../services/api";
import { Button, Card, Heading, Muted, s } from "./ui";
import { C } from "../theme";

export function AppGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const dashboard = useDashboard();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privateCode, setPrivateCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const connected = auth.demo || !!auth.session;
  if (connected && !dashboard.siteAccessRequired && dashboard.ready && dashboard.snapshot.accounts.length) return children;
  async function signIn() {
    if (!supabase || busy || !email.trim() || !password) return;
    setBusy(true); setError("");
    try {
      const { error: failure } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (failure) setError("Connexion impossible. Vérifiez vos identifiants ou réessayez dans un instant.");
      else setPassword("");
    } catch { setError("La connexion a échoué. Vérifiez votre accès à Internet."); }
    finally { setBusy(false); }
  }
  async function unlock() {
    setBusy(true); setError("");
    try { await unlockSite(privateCode); setPrivateCode(""); await dashboard.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Accès indisponible."); }
    finally { setBusy(false); }
  }
  const input = { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1,
    borderRadius: 12, padding: 16, color: C.text, fontSize: 16 };
  return <SafeAreaView style={s.safe}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 26, gap: 20, flexGrow: 1, justifyContent: "center" }}>
        <Image source={require("../../assets/traders-rewards-logo.png")} resizeMode="contain" style={{ width: 215, height: 64, marginBottom: 14 }} />
        {auth.initializing ? <ActivityIndicator accessibilityLabel="Chargement de la session" color={C.gold} /> : !connected ? <>
          <Heading>Votre espace client.</Heading>
          <Muted>Retrouvez vos comptes simulés et suivez votre progression.</Muted>
          {!configurationReady && <Card><Muted>La connexion aux comptes clients sera disponible après la configuration de cette version.</Muted></Card>}
          <Text style={s.body}>Adresse e-mail</Text>
          <TextInput accessibilityLabel="Adresse e-mail" style={input} value={email} onChangeText={setEmail}
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!busy} />
          <Text style={s.body}>Mot de passe</Text>
          <TextInput accessibilityLabel="Mot de passe" style={input} value={password} onChangeText={setPassword}
            secureTextEntry autoCapitalize="none" autoComplete="current-password" editable={!busy} onSubmitEditing={() => void signIn()} />
          <Button title={busy ? "Connexion…" : "Se connecter"} disabled={!configurationReady || busy || !email.trim() || !password} onPress={() => void signIn()} />
          {config.allowDemo && <Button title="Découvrir la démonstration" secondary onPress={auth.enterDemo} />}
          <Muted>Comptes simulés · capital virtuel. Aucun ordre de marché n’est exécuté dans cette application.</Muted>
        </> : <>
          <Heading>{dashboard.loading ? "Chargement de votre espace…" : dashboard.error ? "Votre espace est indisponible" : "Aucun compte à afficher"}</Heading>
          {dashboard.loading && <ActivityIndicator color={C.gold} accessibilityLabel="Chargement des comptes" />}
          {dashboard.error ? <Muted>{dashboard.error}</Muted> : !dashboard.loading && <Muted>Vos comptes apparaîtront ici dès leur disponibilité.</Muted>}
          {dashboard.siteAccessRequired && <>
            <Text style={s.body}>Code d’accès privé</Text>
            <TextInput accessibilityLabel="Code d’accès privé" style={input} value={privateCode} onChangeText={setPrivateCode} secureTextEntry autoCapitalize="none" />
            <Button title="Valider l’accès privé" onPress={() => void unlock()} disabled={busy || !privateCode} />
          </>}
          <Button title="Actualiser" onPress={() => void dashboard.refresh(true)} disabled={dashboard.loading} />
          <Button title="Se déconnecter" secondary onPress={() => { setPassword(""); setPrivateCode(""); setError(""); void auth.signOut().catch(() => setError("La suppression de la session a échoué. Réessayez.")); }} />
        </>}
        {!!error && <Text accessibilityRole="alert" style={{ color: C.red }}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
