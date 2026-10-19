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
  const {p,f,errors} = await open('sindit');
  await f.evaluate(() => { document.querySelector('.tabs button[data-tab="intro"]').click(); });
  await new Promise(r=>setTimeout(r,600));
  await f.evaluate(() => document.getElementById('i-switch').scrollIntoView());
  await p.screenshot({path:'/home/claude/sitecmp/sd_intro_switch.png'});
  await f.evaluate(() => document.querySelector('.tabs button[data-tab="builds"]').click());
  await new Promise(r=>setTimeout(r,800));
  await f.evaluate(() => document.querySelector('#b-sp h3.sub-h').scrollIntoView());
  await p.screenshot({path:'/home/claude/sitecmp/sd_sp.png'});
  await f.evaluate(() => document.querySelector('.spwrap').scrollIntoView());
  await p.screenshot({path:'/home/claude/sitecmp/sd_timeline.png'});
  for (const k of [7,8]) {
    await f.evaluate(async k => { document.querySelector(`#bgear .bbtn[data-bbr="${k}"]`).click(); await new Promise(r=>setTimeout(r,300)); document.getElementById('bgear').scrollIntoView(); }, k);
    await p.screenshot({path:`/home/claude/sitecmp/sd_gear${k}.png`});
  }
  await f.evaluate(() => document.querySelector('#b-ap').scrollIntoView());
  await p.screenshot({path:'/home/claude/sitecmp/sd_ap.png'});
  console.log(errors);
  await p.close();
}
await browser.close();
