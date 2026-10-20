import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox']
});
const fixture = `<!doctype html><html><head></head><body><p id="step"></p><input type="checkbox" id="check"><button id="next">Next</button><script>
const S=[{lv:'1',title:'Start',act:[1]},{lv:'2',title:'Continue',act:[1]},{lv:'3',title:'Finish',act:[1]}];const KEY = "pure-bandit-route-v1";let state={i:0,done:{},tab:'route',w15:true};try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s)state=s}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
const stepDone=i=>!!state.done[i+'-0'];function render(){document.querySelector('#step').textContent=String(state.i);document.querySelector('#check').checked=!!state.done[state.i+'-0']}document.querySelector('#next').onclick=()=>{state.i=Math.min(state.i+1,2);save();render()};document.querySelector('#check').onchange=e=>{state.done[state.i+'-0']=e.target.checked;save();render()};render();</script></body></html>`;
const stub = `export const createClient=()=>({auth:{getUser:async()=>({data:{user:window.test.user},error:null}),onAuthStateChange:fn=>{window.test.listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}}}},rpc:async(method,args)=>{const t=window.test;t.calls.push({method,args});if(method==='sync_account')return {data:t.account,error:null};if(method==='my_guide_progress')return t.readError?{error:{message:'offline'}}:{data:t.progress,error:null};if(method==='get_guide')return t.allowed?{data:t.fixture,error:null}:{error:{message:'denied'}};if(method==='save_guide_progress'){if(t.saveError)return {error:{message:'offline'}};if(t.conflict)return {data:{conflict:true},error:null};return {data:{version:args.p_version+1,updated_at:new Date().toISOString()},error:null}}return {error:{message:'unknown'}}}});`;
async function page(extra = {}) {
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(
    (extra, fixture) => {
      window.test = {
        user: { id: 'buyer' },
        account: { is_admin: false, entitlements: [{ product: 'guide_bandit', expires_at: null }] },
        progress: [],
        allowed: true,
        fixture,
        listeners: [],
        calls: [],
        ...extra
      };
    },
    extra,
    fixture
  );
  await p.setRequestInterception(true);
  p.on('request', r =>
    r.url().startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@')
      ? r.respond({
          status: 200,
          contentType: 'application/javascript',
          headers: { 'access-control-allow-origin': '*' },
          body: stub
        })
      : r.continue()
  );
  p.on('pageerror', e => {
    throw e;
  });
  return p;
}
const base = 'http://127.0.0.1:8765';
async function reader(extra, guide = 'bandit') {
  const p = await page(extra);
  await p.goto(base + '/premium-guide.html?guide=' + guide, { waitUntil: 'networkidle0' });
  await p.waitForFunction(() => !document.querySelector('#viewer').hidden);
  const f = p.frames().find(f => f.url().startsWith('blob:'));
  assert(f);
  await f.waitForSelector('#next');
  return { p, f };
}
try {
  const cloud = {
    guide: 'bandit',
    state: { i: 1, done: { '0-0': true }, tab: 'route', w15: true },
    step_label: 'Lv.2 Continue',
    completed: 1,
    total: 3,
    version: 4,
    updated_at: '2026-10-11T04:00:00Z'
  };
  const library = await page({ progress: [cloud] });
  await library.goto(base + '/my-guides.html', { waitUntil: 'networkidle0' });
  assert((await library.$eval('#library-owned', e => e.textContent)).includes('อ่านต่อ'));
  // Bandit owners also get the bonus Sindit guide.
  assert.equal(await library.$$eval('#library-owned article', a => a.length), 2);
  assert.equal(await library.$$eval('#library-discover article', a => a.length), 6);
  await library.setViewport({ width: 390, height: 844 });
  assert(await library.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  console.log('PASS: purchased library, resume label, unowned discover and mobile');
  {
    // Spearman is published: owners see it as owned, everyone else can discover it.
    const sp = await page({
      account: { is_admin: false, entitlements: [{ product: 'guide_spearman', expires_at: null }] }
    });
    await sp.goto(base + '/my-guides.html', { waitUntil: 'networkidle0' });
    assert.equal(await sp.$$eval('#library-owned article', a => a.length), 1);
    assert.equal(await sp.$$eval('#library-discover article', a => a.length), 7);
    assert(!/Spearman/.test(await sp.$eval('#library-discover', e => e.textContent)));
    await sp.close();
  }
  {
    // All three Warrior guides are published: a Page owner sees it as owned and can discover the rest.
    const pg = await page({
      account: { is_admin: false, entitlements: [{ product: 'guide_page', expires_at: null }] }
    });
    await pg.goto(base + '/my-guides.html', { waitUntil: 'networkidle0' });
    assert.equal(await pg.$$eval('#library-owned article', a => a.length), 1);
    assert.equal(await pg.$$eval('#library-discover article', a => a.length), 7);
    assert(!/Page/.test(await pg.$eval('#library-discover', e => e.textContent)));
    assert(/Fighter/.test(await pg.$eval('#library-discover', e => e.textContent)));
    await pg.close();
  }
  console.log('PASS: published Warrior guides show as owned or discoverable');
  const guest = await page({ user: null });
  await guest.goto(base + '/my-guides.html', { waitUntil: 'networkidle0' });
  assert(await guest.$eval('#library-login', e => !e.hidden));
  assert(!(await guest.evaluate(() => window.test.calls)).some(c => c.method === 'my_guide_progress'));
  console.log('PASS: guests never request progress');
  const { p, f } = await reader({ progress: [cloud] });
  await p.setViewport({ width: 390, height: 844 });
  await p.click('.reader-toolbar button');
  assert(
    await p.evaluate(() => document.body.classList.contains('reader-focus')),
    'Reader focus mode failed'
  );
  assert(
    await p.$eval('#viewer', e => {
      const r = e.getBoundingClientRect();
      return r.bottom <= innerHeight + 1 && r.width <= innerWidth;
    }),
    'Reader controls must stay inside mobile viewport'
  );
  await p.click('.reader-toolbar button');
  assert(await p.evaluate(() => !document.body.classList.contains('reader-focus')), 'Reader exit failed');
  assert.equal(await f.$eval('#step', e => e.textContent), '1');
  await p.waitForFunction(() =>
    document.querySelector('#progress-status').textContent.includes('บันทึกแล้ว')
  );
  await f.click('#next');
  await f.click('#check');
  await p.waitForFunction(() =>
    window.test.calls.some(
      c => c.method === 'save_guide_progress' && c.args.p_state.i === 2 && c.args.p_state.done['2-0'] === true
    )
  );
  const call = await p.evaluate(() =>
    window.test.calls.filter(c => c.method === 'save_guide_progress').at(-1)
  );
  assert.equal(call.args.p_completed, 2);
  assert(call.args.p_version >= 5);
  assert(await f.evaluate(() => localStorage.getItem('maplethai:guide:buyer:bandit')));
  assert.equal(await f.evaluate(() => localStorage.getItem('pure-bandit-route-v1')), null);
  console.log('PASS: cloud step/checklist restoration, autosave, namespaced storage');
  const before = await p.evaluate(() => window.test.calls.length);
  await p.evaluate(() =>
    window.postMessage({ type: 'maplethai-progress', token: 'forged', state: { i: 0 } }, location.origin)
  );
  assert.equal(await p.evaluate(() => window.test.calls.length), before);
  await p.evaluate(() => window.test.listeners.forEach(fn => fn('SIGNED_OUT', null)));
  assert(await p.$eval('#viewer', e => e.hidden && !e.getAttribute('src')));
  console.log('PASS: forged messages ignored and signout clears guide');
  const other = await reader({ user: { id: 'other' } });
  assert.equal(await other.f.$eval('#step', e => e.textContent), '0');
  console.log('PASS: another account starts with its own state');
  const offline = await reader({ saveError: true });
  await offline.p.waitForFunction(() =>
    document.querySelector('#progress-status').textContent.includes('ยังบันทึก')
  );
  assert(await offline.p.evaluate(() => !!localStorage.getItem('maplethai:pending:buyer:bandit')));
  await offline.p.evaluate(() => (window.test.saveError = false));
  await offline.p.click('#progress-retry');
  await offline.p.waitForFunction(() =>
    document.querySelector('#progress-status').textContent.includes('บันทึกแล้ว')
  );
  assert.equal(await offline.p.evaluate(() => localStorage.getItem('maplethai:pending:buyer:bandit')), null);
  console.log('PASS: failed writes retained locally and retry saves');
  const conflict = await reader({ conflict: true });
  await conflict.p.waitForFunction(() =>
    document.querySelector('#progress-status').textContent.includes('อีกหน้')
  );
  const count = await conflict.p.evaluate(
    () => window.test.calls.filter(c => c.method === 'save_guide_progress').length
  );
  await conflict.f.click('#next');
  assert.equal(
    await conflict.p.evaluate(() => window.test.calls.filter(c => c.method === 'save_guide_progress').length),
    count
  );
  console.log('PASS: version conflicts stop stale overwrites');
  const unavailable = await reader({ readError: true });
  assert(
    !(await unavailable.p.evaluate(() => window.test.calls)).some(c => c.method === 'save_guide_progress')
  );
  console.log('PASS: read failure never overwrites unseen cloud state');

  {
    // Spearman is published: owners see it as owned, everyone else can discover it.
    const sp = await page({
      account: { is_admin: false, entitlements: [{ product: 'guide_spearman', expires_at: null }] }
    });
    await sp.goto(base + '/my-guides.html', { waitUntil: 'networkidle0' });
    assert.equal(await sp.$$eval('#library-owned article', a => a.length), 1);
    assert.equal(await sp.$$eval('#library-discover article', a => a.length), 7);
    assert(!/Spearman/.test(await sp.$eval('#library-discover', e => e.textContent)));
    await sp.close();
  }
  for (const guide of ['page']) {
    const restored = { ...cloud, guide, state: { ...cloud.state, done: { ...cloud.state.done } } };
    const current = await reader(
      {
        fixture: fixture.replace('pure-bandit-route-v1', guide + '-route-v1'),
        account: { is_admin: false, entitlements: [{ product: 'guide_' + guide, expires_at: null }] },
        progress: [restored]
      },
      guide
    );
    assert.equal(await current.f.$eval('#step', e => e.textContent), '1');
    await current.p.waitForFunction(() =>
      document.querySelector('#progress-status').textContent.includes('บันทึกแล้ว')
    );
    await current.f.click('#next');
    await current.f.click('#check');
    await current.p.waitForFunction(
      guide =>
        window.test.calls.some(
          c =>
            c.method === 'save_guide_progress' &&
            c.args.p_guide === guide &&
            c.args.p_state.i === 2 &&
            c.args.p_state.done['2-0'] === true
        ),
      {},
      guide
    );
    const key = await current.f.evaluate(
      guide => localStorage.getItem('maplethai:guide:buyer:' + guide),
      guide
    );
    assert(key);
    assert.equal(await current.f.evaluate(guide => localStorage.getItem(guide + '-route-v1'), guide), null);
    await current.p.close();
  }
  console.log(
    'PASS: all three Warrior guides restore cloud state, save checklist changes and isolate local storage'
  );
} finally {
  await browser.close();
}
