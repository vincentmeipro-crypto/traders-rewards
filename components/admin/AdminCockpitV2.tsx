"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./AdminCockpitV2.module.css";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

type Data={kpis:{activeTotal:number;certified:number;passed:number;traders:number;pendingPayoutsCount:number;pendingPayoutsAmt:number;caMonth:number;kycPending:number;supportNew:number;supportOpen:number;emailFailed24h:number;emailSent24h:number;promoActive:number};riskWatch:Array<{id:string;user_email:string;account_size:string;totalDD:number;totalLimit:number;totalConsumed:number}>;recentEvents:Array<{at:string;label:string;sub:string;color:string}>};
const euro=(n:number)=>`${n.toLocaleString("fr-FR")} €`;
const relative=(iso:string)=>{const h=(Date.now()-new Date(iso).getTime())/3600000;if(h<1)return `${Math.max(1,Math.round(h*60))} min`;if(h<24)return `${Math.round(h)} h`;return new Date(iso).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})};

export default function AdminCockpitV2(){
 const supabase=useMemo(()=>createClient(),[]);const[data,setData]=useState<Data|null>(null);const[error,setError]=useState("");const[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const response=await fetch("/api/admin/overview",{headers:{"x-admin-key":ADMIN_KEY},cache:"no-store"});const json=await response.json();if(!response.ok)throw new Error(json.error||"Cockpit indisponible");setData(json)}catch(e){setError(e instanceof Error?e.message:"Erreur inconnue")}finally{setLoading(false)}},[supabase]);
 useEffect(()=>{void load()},[load]);
 if(loading)return <div className={`${styles.card} ${styles.skeleton}`}/>;if(error||!data)return <div className={styles.card}>Impossible de charger le Cockpit : {error}</div>;
 const k=data.kpis;const actions=[
  {label:"KYC à vérifier",count:k.kycPending,href:"/x8k3pz?t=kyc"},{label:"Rewards à traiter",count:k.pendingPayoutsCount,href:"/x8k3pz?t=payouts"},{label:"Tickets nouveaux",count:k.supportNew,href:"/x8k3pz/support"},{label:"Emails échoués",count:k.emailFailed24h,href:"/x8k3pz/emails"}
 ].filter(x=>x.count>0);
 return <div className={styles.cockpit}>
  <header className={styles.hero}><div><div className={styles.eyebrow}>Pilotage Traders Rewards</div><h1 className={styles.title}>COCKPIT ADMIN</h1></div><button className={styles.refresh} onClick={()=>void load()}>ACTUALISER</button></header>
  <section className={styles.grid}>
   <Link href="/x8k3pz?t=pipeline" className={`${styles.card} ${styles.wide}`} style={{textDecoration:"none",color:"inherit"}}><div className={styles.label}>CHALLENGERS ACTIFS</div><div className={`${styles.value} ${styles.blue}`}>{k.activeTotal}</div><div className={styles.sub}>{k.passed} prêt(s) à passer au Reward Account</div></Link>
   <Link href="/x8k3pz?t=payouts" className={styles.card} style={{textDecoration:"none",color:"inherit"}}><div className={styles.label}>REWARD ACCOUNTS</div><div className={styles.value}>{k.certified}</div><div className={styles.sub}>Comptes Reward actifs</div></Link>
   <Link href="/x8k3pz?t=payouts" className={styles.card} style={{textDecoration:"none",color:"inherit"}}><div className={styles.label}>REWARDS À TRAITER</div><div className={`${styles.value} ${k.pendingPayoutsCount?styles.amber:""}`}>{k.pendingPayoutsCount}</div><div className={styles.sub}>{euro(k.pendingPayoutsAmt)} en attente</div></Link>
   <Link href="/x8k3pz?t=crm" className={styles.card} style={{textDecoration:"none",color:"inherit"}}><div className={styles.label}>TRADERS</div><div className={styles.value}>{k.traders}</div><div className={styles.sub}>{k.kycPending} KYC à vérifier</div></Link>
   <div className={styles.card}><div className={styles.label}>CA DU MOIS</div><div className={`${styles.value} ${styles.green}`}>{euro(k.caMonth)}</div><div className={styles.sub}>Encaissements Challenges</div></div>
  </section>
  <section className={styles.main}>
   <div className={styles.panel}><div className={styles.sectionTitle}>PRIORITÉS OPÉRATIONNELLES</div>{actions.length?actions.map(a=><Link className={styles.row} href={a.href} key={a.label}><div><div className={styles.rowName}>{a.label}</div><div className={styles.rowSub}>Ouvrir la file de traitement</div></div><span className={`${styles.pill} ${a.label.includes("échoué")?styles.danger:""}`}>{a.count}</span></Link>):<div className={styles.empty}>Aucune action urgente pour le moment.</div>}</div>
   <div className={styles.panel}><div className={styles.sectionTitle}>COMPTES À SURVEILLER</div>{data.riskWatch.length?data.riskWatch.map(r=><Link className={styles.row} href="/x8k3pz?t=pipeline" key={r.id}><div><div className={styles.rowName}>{r.user_email}</div><div className={styles.rowSub}>{r.account_size} · DD {r.totalDD}% / {r.totalLimit}%</div></div><span className={`${styles.pill} ${r.totalConsumed>=75?styles.danger:""}`}>{r.totalConsumed}%</span></Link>):<div className={styles.empty}>Aucun compte proche de sa limite.</div>}</div>
  </section>
  <section className={styles.main}>
   <div className={styles.panel}><div className={styles.sectionTitle}>ACTIVITÉ RÉCENTE</div>{data.recentEvents.length?data.recentEvents.map((event,i)=><div className={styles.row} key={`${event.at}-${i}`}><div><div className={styles.rowName} style={{color:event.color}}>{event.label}</div><div className={styles.rowSub}>{event.sub}</div></div><span className={styles.pill}>{relative(event.at)}</span></div>):<div className={styles.empty}>Aucune activité récente.</div>}</div>
   <div className={styles.panel}><div className={styles.sectionTitle}>CENTRES DE CONTRÔLE</div><div className={styles.quick}><Link href="/x8k3pz?t=pipeline">COMPTES</Link><Link href="/x8k3pz?t=payouts">REWARDS</Link><Link href="/x8k3pz/support">SUPPORT</Link><Link href="/x8k3pz/emails">EMAILS</Link><Link href="/x8k3pz?t=kyc">KYC</Link><Link href="/x8k3pz?t=compta">COMPTABILITÉ</Link><Link href="/x8k3pz?t=stats">ANALYTICS</Link><Link href="/x8k3pz?t=securite">SÉCURITÉ</Link></div></div>
  </section>
 </div>
}




