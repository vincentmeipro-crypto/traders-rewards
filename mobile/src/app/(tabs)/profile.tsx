import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, Row, Heading, Muted, MenuRow, Pill, Button } from '../../components/ui';
import { useDashboard } from '../../state/DashboardContext';
import { useAuth } from '../../state/AuthContext';
import { C } from '../../theme';
export default function Profile() {
  const { snapshot } = useDashboard();
  const { demo, signOut } = useAuth();
  const [error, setError] = useState('');
  const doc = (type: string) => router.push({ pathname: '/documents', params: { type } });
  return <Screen title="Votre espace." subtitle="Votre profil, vos documents et votre assistance.">
    <Card><Row>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: C.goldDeep, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.gold, fontSize: 20, fontWeight: '600' }}>TR</Text></View>
      <View style={{ flex: 1, gap: 6 }}><Heading small>{snapshot.profile.name}</Heading><Muted>{demo ? 'Aucune donnée personnelle réelle' : snapshot.profile.email}</Muted></View>
    </Row><Pill text={demo ? 'Démonstration' : 'Compte connecté'} /></Card>
    <View>
      <MenuRow icon="shield" title="Vérification d’identité" description="Votre statut KYC" onPress={() => doc('kyc')} />
      <MenuRow icon="file-text" title="Factures" description="Votre historique de facturation" onPress={() => doc('invoices')} />
      <MenuRow icon="award" title="Certificats" description="Vos étapes validées" onPress={() => doc('certificates')} />
      <MenuRow icon="book-open" title="Règles de votre compte" onPress={() => router.push('/rules')} />
    </View>
    <Heading small>Besoin d’un coup de main ?</Heading>
    <MenuRow icon="headphones" title="Centre d’aide" description="Consultez les réponses à vos questions" onPress={() => router.push('/support')} />
    <Button secondary title={demo ? 'Quitter la démonstration' : 'Se déconnecter'} onPress={() => void signOut().catch(() => setError('La suppression de la session a échoué. Réessayez.'))} />
    {!!error && <Text style={{ color: C.red }}>{error}</Text>}
  </Screen>;
}
