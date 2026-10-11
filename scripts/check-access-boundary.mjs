// Run with: node scripts/check-access-boundary.mjs
// Static safety checks: do not imply production security or replace authenticated E2E tests.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const routes=read('free-routes.js');
const m=routes.match(/export const FREE_ROUTES=(\{[\s\S]*\});?\s*$/);
assert(m,'Missing FREE_ROUTES export');
const data=JSON.parse(m[1]);
for(const name of ['bandit','assassin','mage']){
  const steps=data[name];
  assert(Array.isArray(steps)&&steps.length>=1,name+' needs free steps');
  for(const [i,step] of steps.entries()){
    // Allow "3+" and "8–10", reject route upper bounds above Lv.10.
    const lv=String(step.lv||'').replace(/[–—]/g,'-');
    const digits=[...lv.matchAll(/\d+/g)].map(x=>Number(x[0]));
    assert(digits.length>0 && digits.every(n=>n>=1&&n<=10),name+' step '+i+' crosses Lv10: '+lv);
    assert(step.title, name+' step '+i+' missing title');
  }
  console.log('PASS '+name+': '+steps.length+' free steps strictly Lv<=10');
}
const preview=read('guide-preview.html');
const premium=read('premium-guide.html');
const auth=read('auth.js');
assert(preview.includes("from './free-routes.js'"),'Preview must only load free routes');
assert(preview.includes('function openModal()'),'No unlock dialog handler');
assert(preview.includes('premium-guide.html?guide='),'Missing gated full guide link');
assert(!/\bclaim_payment\b|\bgrant_product\b/.test(preview+premium+auth),'Client must not grant purchases');
assert(premium.includes("s.rpc('get_guide',{p_guide:id})"),'Premium content must use checked RPC');
assert(!premium.includes("from('guide_files')"),'No direct private guide table requests');
assert(premium.includes('await s.auth.getUser()'),'Must verify signed-in user');
assert(!/sb_secret_[A-Za-z0-9_-]{10,}/.test(preview+premium+auth+read('auth-config.js')),'Supabase secret key in public files');
console.log('PASS: preview/premium access wiring inspected');
console.log('NOTE: production main/index.html remains public full Bandit guide: launch BLOCKED pending migration.');
