// Load the merged guides inside the real premium-guide.html reader (Supabase stubbed) and check every tab.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const exe = '/home/claude/tools/chrome-headless-shell/linux-155.0.8059.84/chrome-headless-shell-linux64/chrome-headless-shell';
const shots = process.argv.includes('--shots');
const guides = process.argv.slice(2).filter(a => !a.startsWith('--'));
const browser = await puppeteer.launch({ executablePath: exe, args: ['--no-sandbox'] });
const stub = `export const createClient=()=>({auth:{getUser:async()=>({data:{user:window.test.user},error:null}),onAuthStateChange:fn=>({data:{subscription:{unsubscribe(){}}}})},rpc:async(method,args)=>{const t=window.test;t.calls.push({method,args:method==='get_guide'?args:JSON.parse(JSON.stringify(args||{}))});if(method==='sync_account')return {data:t.account,error:null};if(method==='my_guide_progress')return {data:[],error:null};if(method==='get_guide')return {data:t.fixture,error:null};if(method==='save_guide_progress')return {data:{version:(args.p_version||0)+1,updated_at:new Date().toISOString()},error:null};return {data:null,error:null}}});`;
const base = 'http://127.0.0.1:8765';
let fail = 0;
for (const g of guides) {
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 }]) {
    const fixture = fs.readFileSync(`/home/claude/web/${g}.html`, 'utf8');
    const p = await browser.newPage();
    await p.setViewport(vp);
    const errors = [];
    p.on('pageerror', e => errors.push('page: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    await p.evaluateOnNewDocument((fixture, g) => {
      window.test = { user: { id: 'buyer' }, account: { is_admin: false, entitlements: [{ product: 'guide_' + g, expires_at: null }] }, fixture, calls: [] };
    }, fixture, g);
    await p.setRequestInterception(true);
    p.on('request', r => r.url().startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@')
      ? r.respond({ status: 200, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: stub })
      : /fonts\.(googleapis|gstatic)/.test(r.url()) ? r.abort() : r.continue());
    await p.goto(`${base}/premium-guide.html?guide=${g}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await p.waitForFunction(() => !document.querySelector('#viewer').hidden, { timeout: 30000 });
    const f = p.frames().find(x => x.url().startsWith('blob:'));
    await f.waitForSelector('.tabs button[data-tab]');
    const tag = `${g} ${vp.width}`;
    const res = {};
    for (const tab of ['intro', 'builds', 'route', 'grind', 'opt', 'money']) {
      await f.evaluate(t => document.querySelector(`.tabs button[data-tab="${t}"]`).click(), tab);
      await new Promise(r => setTimeout(r, 700));
      res[tab] = await f.evaluate(t => {
        const host = t === 'route' ? document.getElementById('main') : document.getElementById(t);
        const imgs = [...(host?.querySelectorAll('img') || [])].filter(i => i.complete && i.naturalWidth === 0 && i.getClientRects().length);
        return { on: document.body.dataset.tab === t, len: host ? host.innerText.length : -1, broken: imgs.length,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      }, tab);
      if (shots && ['builds', 'grind', 'money'].includes(tab)) await p.screenshot({ path: `/home/claude/sitecmp/shot_${g}_${vp.width}_${tab}.png` });
    }
    const extra = await f.evaluate(() => ({
      sindit: document.getElementById('builds')?.innerText.includes('ปาดาวก่อนเปลี่ยนมีด') || false,
      eqBuilds: !!document.querySelector('#bgear .equipment-guide'),
      eqRoute: !!document.querySelector('#main .equipment-guide'),
      tips: !!document.querySelector('#money #mkt-profit-tips'),
      stages: document.querySelectorAll('#grind .gstage').length,
      logo: !!document.querySelector('.guide-home-logo'),
    }));
    await new Promise(r => setTimeout(r, 3500));
    const saves = await p.evaluate(() => window.test.calls.filter(c => c.method === 'save_guide_progress').map(c => c.args.p_state && c.args.p_state.tab));
    const ok = Object.values(res).every(r => r.on && r.len > 200 && r.broken === 0 && r.overflow <= 0) && errors.length === 0 && extra.tips && extra.stages === 5 && (g === 'sindit' || extra.eqRoute) && (g !== 'bandit' || (extra.sindit && extra.eqBuilds)) && saves.length > 0;
    if (!ok) fail++;
    console.log(ok ? 'PASS' : 'FAIL', tag, JSON.stringify(res), JSON.stringify(extra), 'saves', JSON.stringify(saves.slice(-3)), errors.slice(0, 5).join(' | '));
    await p.close();
  }
}
await browser.close();
process.exit(fail ? 1 : 0);
