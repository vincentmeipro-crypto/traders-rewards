"use client";
import { useState } from "react";
import Link from "next/link";
import TraderCockpit from "../TraderCockpit";
import { createLevelFixtures } from "./fixtures";
import { getTraderV1Level } from "@/lib/v1-engine";

export default function LevelPreview({ userId }: { userId: string }) {
  const { challenges, payouts } = createLevelFixtures(userId);
  const [selectedId, setSelectedId] = useState("local-test-50k-n2");
  const [notice, setNotice] = useState("");
  const challenge = challenges.find(c => c.id === selectedId) ?? challenges[1];
  const paidCount = payouts.filter(p => p.challenge_id === challenge.id && p.status === "paid").length;
  const level = getTraderV1Level(challenge.phase, paidCount).level;
  return <main style={{ padding: 24, background: "#090909", color: "white", minHeight: "100vh" }}>
    <aside style={{ border: "1px solid #d4a843", padding: 16, marginBottom: 20 }}>
      <strong>TEST LOCAL — {challenge.label}</strong>
      <p>Fixtures temporaires liées à votre session de test. Aucun compte ni paiement enregistré dans Supabase.</p>
      <p>Niveau calculé : {level} · Rewards paid : {paidCount} · ID : {challenge.id}</p>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {challenges.map((c, i) => <button key={c.id} onClick={() => { setSelectedId(c.id); setNotice(""); }} aria-pressed={c.id === selectedId} style={{ padding: "10px 18px", background: c.id === selectedId ? "#d4a843" : "#333", color: c.id === selectedId ? "#000" : "#fff", cursor: "pointer" }}>N{i + 1} — 50K</button>)}
        <Link href="/dashboard">Retour au dashboard habituel</Link>
      </nav>
      {notice && <p role="status">{notice}</p>}
    </aside>
    <TraderCockpit key={challenge.id} challenge={challenge} activeChallenges={challenges}
      tradeHistory={[]} tradeHistoryLoading={false} isFr={true} isMobile={false}
      kycStatus="approved" paidRewardsCount={paidCount}
      onSelectChallenge={c => setSelectedId(c.id)}
      onNavigate={tab => setNotice(`Action « ${tab} » neutralisée dans cette prévisualisation locale.`)}
      onRefresh={() => setNotice("Fixtures locales rechargées ; aucune synchronisation distante.")} />
  </main>;
}
