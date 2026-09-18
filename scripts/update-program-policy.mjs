// Usage: node --env-file=.env.local scripts/update-program-policy.mjs [--apply]
// Narrow, idempotent counterpart of 20260918_challenge_target_and_100k_rewards.sql.
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { CHALLENGE_PROFIT_TARGET_PCT, REWARD_AMOUNTS } from '../lib/program-rules.ts';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const slugs = ['rewards-25k', 'rewards-50k', 'rewards-100k'];
async function read(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
const products = await read(db.from('challenge_products').select('id,slug').in('slug', slugs));
if (products.length !== 3) throw new Error('Expected all three Traders Rewards products');
const ids = products.map(p => p.id);
const product100k = products.find(p => p.slug === 'rewards-100k');
const phases = await read(db.from('challenge_product_phases').select('*').in('product_id', ids));
const rules = await read(db.from('challenge_product_rules').select('*').in('product_id', ids).like('rule_key', 'reward_cap_%'));
const accounts = await read(db.from('challenges').select('id,model,phase,status,profit_target,dd_model,rules_snapshot').eq('status', 'active').eq('phase', 'phase1'));
const targets = phases.filter(p => p.phase_type === 'challenge' && p.phase_order === 1);
if (targets.length !== 3) throw new Error('Expected exactly three initial Challenge phases');
const affected = accounts.filter(c => c.profit_target < CHALLENGE_PROFIT_TARGET_PCT && (
  slugs.includes(c.model) || c.dd_model === 'trailing_eod_lock' ||
  c.rules_snapshot?.rules?.dd_model === 'trailing_eod_lock' || slugs.includes(c.rules_snapshot?.product_slug)
));
console.log(JSON.stringify({apply:process.argv.includes('--apply'),phaseTargets:targets.map(p=>p.profit_target),caps100k:rules.filter(r=>r.product_id===product100k.id).map(r=>[r.rule_key,r.rule_value]),activeAccountsToUpdate:affected.length}));
if (!process.argv.includes('--apply')) process.exit(0);

// Retain a local before-image. Do not edit immutable snapshots or historical payouts.
await mkdir('.codex-artifacts', { recursive:true });
await writeFile(`.codex-artifacts/policy-before-${Date.now()}.json`, JSON.stringify({products,phases,rules,accounts:affected},null,2));
await read(db.from('challenge_product_phases').update({profit_target:CHALLENGE_PROFIT_TARGET_PCT}).in('id',targets.map(p=>p.id)).select('id'));
await read(db.from('challenge_product_rules').upsert(REWARD_AMOUNTS[2].map((amount,i)=>({
  product_id:product100k.id,rule_key:`reward_cap_${i+1}`,rule_value:amount,enabled:true,
  description:`Plafond Reward #${i+1} — 100K : ${amount} USD.`,
})),{onConflict:'product_id,rule_key'}).select('rule_key'));
if (affected.length) await read(db.from('challenges').update({profit_target:CHALLENGE_PROFIT_TARGET_PCT})
  .in('id',affected.map(c=>c.id)).eq('status','active').eq('phase','phase1').lt('profit_target',CHALLENGE_PROFIT_TARGET_PCT).select('id'));

const savedPhases=await read(db.from('challenge_product_phases').select('*').in('product_id',ids));
const savedRules=await read(db.from('challenge_product_rules').select('*').in('product_id',ids).like('rule_key','reward_cap_%'));
for(const phase of savedPhases) {
  const old=phases.find(p=>p.id===phase.id);
  const expected=targets.some(p=>p.id===phase.id)?CHALLENGE_PROFIT_TARGET_PCT:old.profit_target;
  if(phase.profit_target!==expected) throw new Error('Phase verification failed');
}
for(const [i,slug] of slugs.entries()) {
  const id=products.find(p=>p.slug===slug).id;
  for(const [j,amount] of REWARD_AMOUNTS[i].entries()) {
    const saved=savedRules.find(r=>r.product_id===id&&r.rule_key===`reward_cap_${j+1}`);
    if(saved?.rule_value!==amount||!saved.enabled) throw new Error(`Cap verification failed: ${slug} R${j+1}`);
  }
}
if(affected.length) {
  const saved=await read(db.from('challenges').select('id,profit_target,rules_snapshot').in('id',affected.map(c=>c.id)));
  for(const account of saved) {
    const old=affected.find(c=>c.id===account.id);
    if(account.profit_target<CHALLENGE_PROFIT_TARGET_PCT||JSON.stringify(account.rules_snapshot)!==JSON.stringify(old.rules_snapshot)) throw new Error('Account or snapshot verification failed');
  }
}
console.log('Verified: 3 phase targets, 15 caps, active account targets, original purchase snapshots.');
