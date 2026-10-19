import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const exe = '/home/claude/tools/chrome-headless-shell/linux-155.0.8059.84/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await puppeteer.launch({ executablePath: exe, args: ['--no-sandbox'] });
const stub = `export const createClient=()=>({auth:{getUser:async()=>({data:{user:window.test.user},error:null}),onAuthStateChange:fn=>({data:{subscription:{unsubscribe(){}}}})},rpc:async(method,args)=>{const t=window.test;if(method==='sync_account')return {data:t.account,error:null};if(method==='my_guide_progress')return {data:[],error:null};if(method==='get_guide')return {data:t.fixture,error:null};if(method==='save_guide_progress')return {data:{version:1,updated_at:new Date().toISOString()},error:null};return {data:null,error:null}}});`;
async function open(g, w=1280){
  const p = await browser.newPage(); await p.setViewport({width:w,height:900});
  const errors=[]; p.on('pageerror', e => errors.push(e.message));
  const fixture = fs.readFileSync(`/home/claude/web/${g}.html`, 'utf8');
  await p.evaluateOnNewDocument((fixture, g) => { window.test = { user: { id: 'b' }, account: { is_admin: false, entitlements: [{ product: 'guide_' + g, expires_at: null }] }, fixture }; }, fixture, g);
  await p.setRequestInterception(true);
  p.on('request', r => r.url().startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@') ? r.respond({ status: 200, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: stub }) : /fonts\.(googleapis|gstatic)/.test(r.url()) ? r.abort() : r.continue());
  await p.goto(`http://127.0.0.1:8765/premium-guide.html?guide=${g}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await p.waitForFunction(() => !document.querySelector('#viewer').hidden, { timeout: 30000 });
  const f = p.frames().find(x => x.url().startsWith('blob:'));
  await f.waitForSelector('.tabs button[data-tab]');
  return {p,f,errors};
}
{
  const {p,f,errors} = await open('bandit');
  await f.evaluate(() => document.querySelector('.tabs button[data-tab="builds"]').click());
  await new Promise(r=>setTimeout(r,800));
  const r = await f.evaluate(() => {
    const out = {};
    out.details = [...document.querySelectorAll('#builds details.bmore')].map(d => d.id);
    out.spWhy = !!document.querySelector('#builds .bwhy');
    out.apRule = document.querySelector('#b-ap .olist').innerText.slice(0,120);
    out.summarySP = document.querySelector('.hero-grid').innerText.replace(/\n/g,' | ');
    out.steps = [...document.querySelectorAll('#b-sp .steps li')].slice(0,5).map(x=>x.innerText);
    out.budgetPrices = document.querySelector('#b-budget')?.innerText.match(/Halfmoon Zamadar \(Lv\.35\)[^\n]*/)?.[0];
    return out;
  });
  console.log(JSON.stringify(r,null,1));
  // weapon table: Stinger row has a bhow button; click opens b-str
  const r2 = await f.evaluate(async () => {
    const chip = [...document.querySelectorAll('#btable .mkchip')].find(b => b.dataset.btb === 'weapon'); chip && chip.click();
    await new Promise(r=>setTimeout(r,300));
    const btns = [...document.querySelectorAll('#btable .bhow')].map(b => b.closest('tr').querySelector('.bname').innerText.trim()+':'+b.dataset.jump);
    const b = [...document.querySelectorAll('#btable .bhow')].find(x => x.dataset.jump==='b-str'); b.click();
    await new Promise(r=>setTimeout(r,500));
    return {btns, open: document.getElementById('b-str').open};
  });
  console.log(JSON.stringify(r2));
  await f.evaluate(() => document.getElementById('b-str').scrollIntoView());
  await p.screenshot({path:'/home/claude/sitecmp/chk_bandit_str.png'});
  await f.evaluate(() => { document.getElementById('b-str').open=false; const d=document.getElementById('b-lukdex'); d.open=true; d.scrollIntoView(); });
  await p.screenshot({path:'/home/claude/sitecmp/chk_bandit_lukdex.png'});
  await f.evaluate(() => document.querySelector('#builds .bwhy').scrollIntoView());
  await p.screenshot({path:'/home/claude/sitecmp/chk_bandit_why.png'});
  // gear bracket 25-29
  const r3 = await f.evaluate(async () => { const b=document.querySelector('#bgear .bbtn[data-bbr="5"]'); b.click(); await new Promise(r=>setTimeout(r,300)); return document.querySelector('#bgear .gside').innerText.slice(0,700); });
  console.log(r3);
  const sp = await f.evaluate(() => [38,39,40,41,42].map(i => S[i].sp));
  console.log(sp, errors);
  await p.close();
}
{
  const {p,f,errors} = await open('mage');
  const r = await f.evaluate(() => [S[43].title, S[45].title, S[42].next]);
  console.log(r, errors); await p.close();
}
await browser.close();
