import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Heading, Muted, Icon, Row, Button, s } from '../components/ui';
import { useDashboard } from '../state/DashboardContext';
import { useAuth } from '../state/AuthContext';
import { authorizedGet, SessionExpired } from '../services/api';
import { C } from '../theme';

type Invoice = { id: string; invoice_number: string; issued_at: string; currency: string; amount_paid_cents: number; product_name: string };
type Certificate = { public_token: string; certificate_type: string; issued_at: string };
const kyc: Record<string, string> = { approved: 'Identité vérifiée', pending: 'Vérification en cours', submitted: 'Vérification en cours', rejected: 'Vérification à reprendre', not_submitted: 'Vérification non effectuée' };
const labels: Record<string, string> = { phase1: 'Challenge · étape 1', phase2: 'Challenge · étape 2', reward: 'Récompense' };
export default function Documents() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { session, demo } = useAuth();
  return <DocumentContent key={`${session?.user.id ?? (demo ? 'demo' : 'anonymous')}:${type}`} type={type} />;
}
function DocumentContent({ type }: { type: string }) {
  const { snapshot } = useDashboard();
  const { demo, signOut, session } = useAuth();
  const [data, setData] = useState<{ invoices: Invoice[]; certificates: Certificate[]; total: number } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (demo || type === 'kyc') return;
    const controller = new AbortController();
    let mounted = true;
    const timeout = setTimeout(() => controller.abort(), 30000);
    void authorizedGet(type === 'certificates' ? '/api/certificates' : '/api/invoices?limit=100', controller.signal).then(result => {
      if (!mounted) return;
      if (type === 'certificates') {
        if (!Array.isArray(result)) throw new Error('Les certificats sont indisponibles.');
        setData({ invoices: [], certificates: result, total: result.length });
      } else {
        const response = result as { success: boolean; data: Invoice[]; pagination: { total: number } };
        if (!response.success || !Array.isArray(response.data)) throw new Error('Les factures sont indisponibles.');
        setData({ invoices: response.data, certificates: [], total: response.pagination.total });
      }
    }).catch(e => {
      if (!mounted) return;
      if (e instanceof SessionExpired) void signOut().catch(() => {});
      else setError(controller.signal.aborted ? 'Le service ne répond pas. Réessayez dans un instant.' : e instanceof Error ? e.message : 'Documents indisponibles.');
    }).finally(() => clearTimeout(timeout));
    return () => { mounted = false; controller.abort(); clearTimeout(timeout); };
  }, [type, demo, attempt, signOut, session?.user.id]);
  const title = type === 'kyc' ? 'Votre identité.' : type === 'certificates' ? 'Vos certificats.' : 'Vos factures.';
  return <Screen back title={title}>
    {type === 'kyc' ? <Card><Icon name="shield" size={34} color={C.gold} /><Heading small>{kyc[snapshot.profile.kycStatus] ?? 'Statut à vérifier'}</Heading><Muted>Statut de votre compte. Le dépôt de pièces d’identité n’est pas disponible dans cette version.</Muted></Card>
      : demo ? <Card><Heading small>Aucun document de démonstration</Heading><Muted>Après connexion, cette rubrique présente les documents enregistrés sur votre compte.</Muted></Card>
      : error ? <Card><Muted>{error}</Muted><Button title="Réessayer" onPress={() => { setError(''); setData(null); setAttempt(n => n + 1); }} /></Card>
      : !data ? <ActivityIndicator accessibilityLabel="Chargement des documents" color={C.gold} />
      : <>
        {!data.total && <Card><Heading small>Aucun document disponible</Heading><Muted>Les documents enregistrés apparaîtront ici.</Muted></Card>}
        {data.invoices.map(invoice => <Card key={invoice.id}><Heading small>{invoice.invoice_number}</Heading><Muted>{invoice.product_name}</Muted><Row><Muted>{new Date(invoice.issued_at).toLocaleDateString('fr-FR')}</Muted><Text style={s.body}>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: invoice.currency }).format(invoice.amount_paid_cents / 100)}</Text></Row></Card>)}
        {data.certificates.map(cert => <Card key={cert.public_token}><Icon name="award" color={C.gold} /><Heading small>{labels[cert.certificate_type] ?? 'Certificat'}</Heading><Muted>Émis le {new Date(cert.issued_at).toLocaleDateString('fr-FR')}</Muted></Card>)}
        {type === 'invoices' && data.total > data.invoices.length && <Muted>Les 100 factures les plus récentes sont affichées sur {data.total}.</Muted>}
        <Muted>Consultation des informations. L’export des documents sera ajouté dans une prochaine version.</Muted>
      </>}
  </Screen>;
}
