"use client";

import { useCallback, useEffect, useState } from "react";
import { parisDay, validatePromotionCalendar, type CalendarPromotion } from "@/lib/promotion-calendar";
import { getScheduledPromotion } from "@/lib/pricing";

const addDays = (day: string, count: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0,10);
};

export default function PromotionCalendar({ onNotify }: { onNotify: (message: string, ok?: boolean) => void }) {
  const [rows,setRows] = useState<CalendarPromotion[]>([]);
  const [savedRows,setSavedRows] = useState<CalendarPromotion[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [busy,setBusy] = useState(false);
  const [dirty,setDirty] = useState(false);
  const [error,setError] = useState("");
  const today = parisDay();

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/promotion-calendar", {cache:"no-store"});
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Chargement impossible");
      const parsed = validatePromotionCalendar(data.rows);
      if (!parsed.ok) throw Error(parsed.error);
      setRows(parsed.rows);setSavedRows(parsed.rows);setDirty(false);setLoaded(true);setError("");
    } catch(e) { setError(e instanceof Error ? e.message : "Chargement impossible"); }
  },[]);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => { if (mounted) void load(); });
    return () => { mounted = false; };
  },[load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {e.preventDefault();e.returnValue="";};
    window.addEventListener("beforeunload",warn);
    return () => window.removeEventListener("beforeunload",warn);
  },[dirty]);

  function edit(id: string, patch: Partial<CalendarPromotion>) {
    setRows(current=>current.map(r=>r.id===id?{...r,...patch}:r));setDirty(true);setError("");
  }
  function prepare(count: number) {
    const dates = rows.map(r=>r.endDate).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    let start = dates.length && dates[dates.length-1]>=today ? addDays(dates[dates.length-1],1) : today;
    const additions: CalendarPromotion[]=[];
    for(let i=0;i<count;i++) {
      const promo=getScheduledPromotion(new Date(`${start}T12:00:00Z`));
      additions.push({id:crypto.randomUUID(),label:`Offre ${promo?.name ?? "A"}`,startDate:start,endDate:addDays(start,6),unitDiscount:promo?.unitDiscount??75,packDiscount:promo?.packDiscount??85,enabled:true});
      start=addDays(start,7);
    }
    setRows(current=>[...current,...additions]);setDirty(true);setError("");
  }
  async function save() {
    const parsed=validatePromotionCalendar(rows);
    if(!parsed.ok){setError(parsed.error);return;}
    setBusy(true);setError("");
    try {
      const response=await fetch("/api/admin/promotion-calendar",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows:parsed.rows})});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||"Enregistrement impossible");
      setRows(data.rows);setSavedRows(data.rows);setDirty(false);onNotify("Calendrier enregistré : les prix et le Hero suivront ces dates.",true);
    } catch(e){setError(e instanceof Error?e.message:"Enregistrement impossible");}
    finally{setBusy(false);}
  }
  const validation=validatePromotionCalendar(rows);
  return <section className="promotion-calendar">
    <style>{`
      .promotion-calendar{background:#0c0c0c;border:1px solid #66532b;border-radius:16px;padding:24px;margin-bottom:24px;color:#eee}
      .promotion-calendar h2{margin:0 0 10px;font-size:20px;color:#d9b96f}
      .promotion-calendar p{font-size:13px;color:#aaa;line-height:1.6;margin:8px 0}
      .promotion-calendar .actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:18px 0}
      .promotion-calendar button{border:1px solid #66532b;border-radius:8px;padding:10px 14px;background:#181611;color:#d9b96f;cursor:pointer;font-weight:600}
      .promotion-calendar button:disabled{opacity:.4;cursor:not-allowed}
      .promotion-calendar button.primary{background:#d9b96f;color:#111}
      .promotion-calendar table{width:100%;border-collapse:collapse;min-width:960px}
      .promotion-calendar th{text-align:left;color:#aaa;font-size:11px;padding:12px 8px;border-bottom:1px solid #333}
      .promotion-calendar td{padding:12px 8px;border-bottom:1px solid #252525;font-size:12px}
      .promotion-calendar input:not([type=checkbox]){background:#181a1d;color:#fff;border:1px solid #383838;border-radius:7px;padding:10px;width:100%;box-sizing:border-box;color-scheme:dark;min-height:40px}
      .promotion-calendar input[type=number]{min-width:70px}
      .promotion-calendar input[type=date]{min-width:145px}
      .promotion-calendar input[type=checkbox]{accent-color:#d9b96f;width:18px;height:18px}
      .promotion-calendar input:focus-visible,.promotion-calendar button:focus-visible{outline:2px solid #d9b96f;outline-offset:2px}
      .promotion-calendar .error{color:#fca5a5;background:#331919;padding:12px;border-radius:8px;margin-top:14px}
      @media(max-width:600px){.promotion-calendar{padding:16px}}
    `}</style>
    <h2>Programmer les promotions</h2>
    <p>Une ligne par période : remises sur les prix catalogue des comptes 25K, 50K et 100K. Le Hero, les prix affichés et les paiements utilisent la même promotion.</p>
    <p>Dates inclusives, de 00 h 00 à 23 h 59, heure de Paris. Les lignes activées sont prioritaires sur la rotation automatique ; sans ligne active, cette rotation reprend.</p>
    <div className="actions">
      <button type="button" disabled={!loaded||busy||!validation.ok||rows.length>=104} onClick={()=>prepare(1)}>+ Ajouter une période</button>
      <button type="button" disabled={!loaded||busy||!validation.ok||rows.length>100} onClick={()=>prepare(4)}>Préparer 4 semaines</button>
      {dirty&&<button type="button" disabled={busy} onClick={()=>{setRows(savedRows);setDirty(false);setError("");}}>Annuler les modifications</button>}
      <span style={{color:dirty?"#d9b96f":"#aaa",fontSize:12}}>{dirty?"Modifications non enregistrées":`${rows.length} période(s) enregistrée(s)`}</span>
    </div>
    {!loaded&&!error&&<p>Chargement du calendrier…</p>}
    {loaded&&rows.length===0&&<p>Aucune période personnalisée. Ajoutez vos dates ou préparez quatre semaines, puis enregistrez le calendrier.</p>}
    {rows.length>0&&<div style={{overflowX:"auto"}}><table><thead><tr>
      <th style={{width:180}}>Libellé interne</th><th>Début inclus</th><th>Fin incluse</th><th>Remise unité %</th><th>Remise pack ×3 %</th><th>État</th><th>Activée</th><th></th>
    </tr></thead><tbody>{rows.map((row,i)=>{
      const status=!row.enabled?"Désactivée":today<row.startDate?"Planifiée":today>row.endDate?"Terminée":"En cours";
      return <tr key={row.id}>
        <td><input aria-label={`Libellé promotion ${i+1}`} maxLength={80} value={row.label} disabled={busy} onChange={e=>edit(row.id,{label:e.target.value})}/></td>
        <td><input aria-label={`Début promotion ${i+1}`} type="date" value={row.startDate} disabled={busy} onChange={e=>edit(row.id,{startDate:e.target.value})}/></td>
        <td><input aria-label={`Fin promotion ${i+1}`} type="date" value={row.endDate} disabled={busy} onChange={e=>edit(row.id,{endDate:e.target.value})}/></td>
        <td><input aria-label={`Remise unité promotion ${i+1}`} type="number" min={0} max={99} value={Number.isNaN(row.unitDiscount)?"":row.unitDiscount} disabled={busy} onChange={e=>edit(row.id,{unitDiscount:e.target.value===""?NaN:Number(e.target.value)})}/></td>
        <td><input aria-label={`Remise pack promotion ${i+1}`} type="number" min={0} max={99} value={Number.isNaN(row.packDiscount)?"":row.packDiscount} disabled={busy} onChange={e=>edit(row.id,{packDiscount:e.target.value===""?NaN:Number(e.target.value)})}/></td>
        <td style={{color:status==="En cours"?"#86efac":"#aaa",whiteSpace:"nowrap"}}>{status}{dirty?" *":""}</td>
        <td><input aria-label={`Activer promotion ${i+1}`} type="checkbox" checked={row.enabled} disabled={busy} onChange={e=>edit(row.id,{enabled:e.target.checked})}/></td>
        <td><button type="button" aria-label={`Supprimer promotion ${i+1}`} disabled={busy} onClick={()=>{setRows(current=>current.filter(r=>r.id!==row.id));setDirty(true);setError("");}}>Retirer</button></td>
      </tr>;
    })}</tbody></table></div>}
    {(error||(dirty&&!validation.ok&&validation.error))&&<div className="error" role="alert">{error||(!validation.ok&&validation.error)}{!loaded&&<button type="button" onClick={()=>void load()}>Réessayer</button>}</div>}
    <div className="actions" style={{justifyContent:"space-between",marginBottom:0}}>
      <p>{dirty?"* Les changements ne seront appliqués qu’après enregistrement.":"Le libellé reste interne. La date de fin s’affiche automatiquement dans le Hero."}</p>
      <button type="button" className="primary" disabled={!loaded||busy||!dirty||!validation.ok} onClick={()=>void save()}>{busy?"Enregistrement…":"Enregistrer le calendrier"}</button>
    </div>
  </section>;
}
