import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox']
});
const base = 'http://127.0.0.1:8765';
const fixture = {
  id: 1,
  user_id: 'seller',
  kind: 'sell',
  item_name: 'Pan Lid <img src=x onerror=alert(1)>',
  category: 'armor',
  description: 'Clean shield',
  qty: 1,
  price: 85000,
  price_unit: 'meso',
  atk: null,
  slots: 7,
  status: 'open',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 86400000).toISOString()
};
const stub = `
const s=window.marketTest;const auth={getUser:async()=>({data:{user:s.user},error:null}),onAuthStateChange:fn=>{s.listeners.push(fn)}};
const from=table=>{const filters=[];const q={select:()=>q,eq:(k,v)=>{filters.push(r=>r[k]===v);return q},gt:(k,v)=>{filters.push(r=>r[k]>v);return q},ilike:(k,v)=>{s.searches.push(v);filters.push(r=>r[k].toLowerCase().includes(v.slice(1,-1).toLowerCase()));return q},order:()=>q,range:()=>q,limit:()=>q,then:(resolve,reject)=>Promise.resolve({data:s.rows.filter(r=>filters.every(f=>f(r))),error:s.failListings?{message:'Network unavailable'}:null}).then(resolve,reject)};return q};
export const createClient=()=>({auth,from,rpc:async(method,args)=>{s.calls.push({method,args});if(method==='marketplace_contact_quota')return {data:{remaining:(s.remaining??10)+(s.bonus??0),free_remaining:s.remaining??10,bonus_remaining:s.bonus??0,used:10-(s.remaining??10),limit:10}};if(method==='marketplace_price_reference')return {data:s.reference||{seller_count:3,low:20000,high:30000,median:25000}};if(method==='sync_account')return {data:s.account};if(method==='listing_contact'){s.opened||=[];const unlimited=s.account?.is_admin||s.account?.entitlements?.some(e=>e.product==='market'&&new Date(e.expires_at)>new Date());if(args.p_id!==s.rows.find(r=>r.user_id===s.user?.id)?.id&&!unlimited&&!s.opened.includes(args.p_id)){if((s.remaining??10)<=0)return {error:{message:'LOCKED'}};s.remaining=(s.remaining??10)-1;s.opened.push(args.p_id)}return {data:{discord:'private-discord',line:'private-line',facebook:'javascript:alert(1)'}}};if(method==='marketplace_save'){if(args.p_id){Object.assign(s.rows.find(r=>r.id===args.p_id),args.p_data)}else s.rows.unshift({id:2,user_id:s.user.id,...args.p_data,status:'open',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()});return {data:args.p_id||2}};if(method==='marketplace_close'){s.rows.find(r=>r.id===args.p_id).status='done';return {data:null}}return {error:{message:'Unknown RPC'}}}});
`;
async function page(extra = {}, path = '/marketplace.html') {
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(
    (extra, fixture) => {
      window.marketTest = {
        user: { id: 'viewer', email: 'viewer@example.invalid' },
        account: { is_admin: false, entitlements: [] },
        rows: [fixture],
        calls: [],
        listeners: [],
        searches: [],
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
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(base + path, { waitUntil: 'networkidle0' });
  if (path === '/marketplace.html')
    await p.waitForFunction(() => document.querySelectorAll('.listing').length > 0);
  else
    await p.waitForFunction(() => {
      const status = document.querySelector('#market-watch-status');
      return status && (status.hidden || status.textContent !== 'กำลังโหลดประกาศล่าสุด…');
    });
  return { p, errors };
}
try {
  const { p: guest, errors: guestErrors } = await page({ user: null });
  assert.equal(await guest.$('.listing h3 img'), null);
  assert(!(await guest.$eval('#listings', e => e.textContent)).includes('Clean shield'));
  await guest.click('.listing>button');
  assert((await guest.$eval('#contact-content', e => e.textContent)).includes('เข้าสู่ระบบ'));
  assert(!(await guest.evaluate(() => window.marketTest.calls)).some(c => c.method === 'listing_contact'));
  assert.deepEqual(guestErrors, []);
  console.log('PASS: guest browsing, escaped content and no contact requests');
  const { p: free, errors: freeErrors } = await page();
  await free.click('.listing>button');
  await free.waitForFunction(() =>
    document.querySelector('#contact-content').textContent.includes('private-discord')
  );
  await free.waitForFunction(() =>
    document.querySelector('#membership-description').textContent.includes('9 / 10')
  );
  await free.click('#close-contact');
  await free.click('.listing>button');
  await free.waitForFunction(() =>
    document.querySelector('#contact-content').textContent.includes('private-discord')
  );
  assert.equal(await free.evaluate(() => window.marketTest.remaining), 9);
  await free.click('#close-contact');
  await free.click('#new-post');
  await free.type('#item-name', 'Pan Lid');
  await free.waitForSelector('.item-option');
  await free.click('.item-option');
  assert.equal(await free.$eval('#category', e => e.value), 'armor');
  assert.equal(await free.$('#stat-atk'), null);
  assert.equal(await free.$('#description'), null);
  assert(await free.$('#stat-def'));
  await free.type('#stat-def', '-2');
  await free.type('#price', '250000');
  await free.type('#discord', 'seller-discord');
  await free.click('#save-post');
  await free.waitForFunction(() => window.marketTest.calls.some(c => c.method === 'marketplace_save'));
  await free.waitForFunction(() => !document.querySelector('#post-dialog').open);
  const save = await free.evaluate(() => window.marketTest.calls.find(c => c.method === 'marketplace_save'));
  assert.equal(save.args.p_id, null);
  assert.equal(save.args.p_data.item_id, 917);
  assert.equal(save.args.p_data.item_stats.def, -2);
  assert.equal(save.args.p_data.atk, undefined);
  assert.equal(save.args.p_data.description, undefined);
  assert.equal(save.args.p_data.contacts.discord, 'seller-discord');
  assert.equal(save.args.p_data.price, '250000');
  assert.equal(save.args.p_data.price_unit, 'meso');
  assert.equal(await free.$eval('#my-posts', e => e.getAttribute('aria-pressed')), 'true');
  assert(!(await free.$eval('#listings', e => e.textContent)).includes('seller-discord'));
  await free.click('.owner-actions button');
  await free.waitForFunction(() => document.querySelector('#post-dialog').open);
  assert.equal(await free.$eval('#discord', e => e.value), 'private-discord');
  assert.equal(await free.$eval('#stat-def', e => e.value), '-2');
  await free.click('#close-form');
  free.on('dialog', d => d.accept());
  await free.click('.owner-actions button:last-child');
  await free.waitForFunction(() => window.marketTest.calls.some(c => c.method === 'marketplace_close'));
  assert.deepEqual(freeErrors, []);
  console.log('PASS: free posting with private contacts, owner editing and closure');
  const { p: member, errors: memberErrors } = await page({
    rows: [
      { ...fixture, item_id: 917, item_name: 'Pan Lid', item_stats: { def: 2 }, atk: null },
      ...[
        [2, 20000, 'meso'],
        [3, 1250000, 'meso'],
        [4, 2000000000, 'meso'],
        [5, 1500, 'thb']
      ].map(([id, price, price_unit]) => ({ ...fixture, id, price, price_unit }))
    ],
    account: {
      is_admin: false,
      entitlements: [{ product: 'market', expires_at: new Date(Date.now() + 86400000).toISOString() }]
    }
  });
  assert((await member.$eval('.item-heading', e => e.href)).endsWith('/item-db/917'));
  assert((await member.$eval('.item-picture img', e => e.src)).endsWith('/i/18.png'));
  assert((await member.$eval('.price .meso-icon', e => new URL(e.src).pathname)).endsWith('/meso-coin.svg'));
  assert.deepEqual(await member.$$eval('.price-amount', els => els.map(e => e.textContent)), [
    '85K',
    '20K',
    '1.25M',
    '2B'
  ]);
  assert.equal(await member.$('#filter-unit'), null);
  assert.equal(await member.$('#price-unit'), null);
  assert.equal(await member.$eval('.price', e => e.title), '85,000 Meso');
  assert.equal(await member.$eval('.price', e => e.getAttribute('aria-label')), '85,000 Meso');
  assert(Number(await member.$eval('.price-amount', e => getComputedStyle(e).fontWeight)) >= 700);
  assert((await member.$eval('.stat-chips', e => e.textContent)).includes('DEF +2'));
  await member.click('.listing>button');
  await member.waitForFunction(() =>
    document.querySelector('#contact-content').textContent.includes('private-discord')
  );
  // Unsafe Facebook value stays a copy button; a bare LINE ID opens LINE; Discord copies.
  assert.deepEqual(await member.$$eval('#contact-content a', els => els.map(e => e.href)), [
    'https://line.me/R/ti/p/~private-line'
  ]);
  assert.equal(await member.$eval('.contact-button.facebook', e => e.tagName), 'BUTTON');
  await member.evaluate(() => {
    navigator.clipboard.writeText = async text => (window.marketTest.copied = text);
  });
  await member.click('.contact-button.discord');
  await member.waitForFunction(() => window.marketTest.copied === 'private-discord');
  assert(
    (await member.$eval('.contact-button.discord', e => e.textContent)).includes('คัดลอก username แล้ว')
  );
  assert((await member.evaluate(() => window.marketTest.calls)).some(c => c.method === 'listing_contact'));
  assert(await member.$eval('#market-buy', e => e.hidden));
  await member.evaluate(() => {
    window.marketTest.user = null;
    window.marketTest.account = { is_admin: false, entitlements: [] };
    window.marketTest.listeners.forEach(fn => fn('SIGNED_OUT', null));
  });
  await member.waitForFunction(() => !document.querySelector('#contact-dialog').open);
  assert(!(await member.$eval('#contact-content', e => e.textContent)).includes('private-discord'));
  assert.deepEqual(memberErrors, []);
  console.log('PASS: subscriber contact access, unsafe link rejected and logout clears private data');
  const { p: filtered } = await page({
    rows: [
      { ...fixture, item_name: 'Pan Lid', item_id: 917, item_stats: { def: 44 } },
      { ...fixture, id: 2, item_name: 'Claw Scroll', category: 'scroll', price_unit: 'meso', kind: 'buy' }
    ]
  });
  assert(await filtered.$eval('#market-results', e => e.classList.contains('list-mode')));
  await filtered.click('.category-tab[data-category="scroll"]');
  await filtered.waitForFunction(
    () =>
      document.querySelectorAll('.listing').length === 1 &&
      document.querySelector('.listing h3').textContent === 'Claw Scroll'
  );
  assert.equal(
    await filtered.$eval('.category-tab[data-category="scroll"]', e => e.getAttribute('aria-pressed')),
    'true'
  );
  await filtered.select('#filter-kind', 'sell');
  await filtered.waitForSelector('.empty');
  await filtered.click('#clear-filters');
  await filtered.waitForFunction(() => document.querySelectorAll('.listing').length === 2);
  await filtered.type('#search', 'Claw');
  await filtered.waitForFunction(
    () =>
      document.querySelectorAll('.listing').length === 1 &&
      document.querySelector('.listing h3').textContent === 'Claw Scroll'
  );
  await filtered.keyboard.press('Escape');
  await filtered.click('#clear-filters');
  await filtered.waitForFunction(() => document.querySelectorAll('.listing').length === 2);
  await filtered.click('#card-view');
  assert(!(await filtered.$eval('#market-results', e => e.classList.contains('list-mode'))));
  await filtered.setViewport({ width: 390, height: 844 });
  assert(await filtered.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  await filtered.click('#list-view');
  assert(await filtered.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  assert(await filtered.$eval('.listing', e => e.scrollWidth <= e.clientWidth + 2));
  console.log('PASS: list/card modes, category/kind/currency filters, live search, reset and mobile rows');
  const { p: autocomplete } = await page({ rows: [{ ...fixture, item_name: 'Pan Lid', item_id: 917 }] });
  await autocomplete.type('#search', 'Pan');
  await autocomplete.waitForSelector('#search-suggestions button[data-item-id="917"]');
  assert(
    (await autocomplete.$eval('#search-suggestions button[data-item-id="917"] img', e => e.src)).endsWith(
      '/i/18.png'
    )
  );
  await autocomplete.click('#search-suggestions button[data-item-id="917"]');
  assert.equal(await autocomplete.$eval('#search', e => e.value), 'Pan Lid');
  assert(await autocomplete.$eval('#search-suggestions', e => e.hidden));
  await autocomplete.waitForFunction(() => window.marketTest.searches.includes('%Pan Lid%'));
  await autocomplete.click('#clear-filters');
  await autocomplete.type('#search', 'Steelies');
  await autocomplete.waitForSelector('#search-suggestions button');
  assert((await autocomplete.$eval('#search-suggestions', e => e.textContent)).includes('Steely'));
  await autocomplete.waitForFunction(() => window.marketTest.searches.includes('%Steely%'));
  await autocomplete.keyboard.press('Escape');
  assert(await autocomplete.$eval('#search-suggestions', e => e.hidden));
  await autocomplete.click('#clear-filters');
  await autocomplete.type('#search', 'Pan');
  await autocomplete.waitForSelector('#search-suggestions button');
  const firstName = await autocomplete.$eval(
    '#search-suggestions button>span',
    e => e.firstChild.textContent
  );
  await autocomplete.keyboard.press('ArrowDown');
  await autocomplete.keyboard.press('Enter');
  assert.equal(await autocomplete.$eval('#search', e => e.value), firstName);
  assert.equal(await autocomplete.$eval('#search', e => e.getAttribute('aria-expanded')), 'false');
  await autocomplete.setViewport({ width: 390, height: 844 });
  await autocomplete.click('#clear-filters');
  await autocomplete.type('#search', 'Pan');
  assert(
    await autocomplete.$eval('#search-suggestions', e => {
      const r = e.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth;
    })
  );
  await autocomplete.click('.board-title');
  assert(await autocomplete.$eval('#search-suggestions', e => e.hidden));
  console.log(
    'PASS: partial-name icon suggestions, mouse/keyboard selection, aliases, dismissal and mobile popup'
  );
  const { p: pricing } = await page();
  await pricing.click('#new-post');
  await pricing.type('#item-name', 'Pan Lid');
  await pricing.waitForSelector('.item-option');
  await pricing.click('.item-option');
  await pricing.waitForFunction(() =>
    document.querySelector('#price-reference-status').textContent.includes('20K')
  );
  assert.equal(await pricing.$eval('#mesowatch-link', e => e.href), 'https://meso.watch/');
  assert.equal(await pricing.$eval('#price', e => e.value), '');
  await pricing.type('#price', '77777');
  await pricing.type('#stat-def', '44');
  await pricing.waitForFunction(() =>
    window.marketTest.calls.some(c => c.method === 'marketplace_price_reference' && c.args.p_stats.def === 44)
  );
  assert.equal(await pricing.$eval('#price', e => e.value), '77777');
  await pricing.waitForFunction(() => !document.querySelector('#use-reference-price').hidden);
  await pricing.click('#use-reference-price');
  assert.equal(await pricing.$eval('#price', e => e.value), '25000');
  await pricing.click('#close-form');
  const { p: insufficient } = await page({
    reference: { seller_count: 1, low: null, high: null, median: null }
  });
  await insufficient.click('#new-post');
  await insufficient.type('#item-name', 'Pan Lid');
  await insufficient.waitForSelector('.item-option');
  await insufficient.click('.item-option');
  await insufficient.waitForFunction(() =>
    document.querySelector('#price-reference-status').textContent.includes('ยังไม่พอ')
  );
  assert(await insufficient.$eval('#use-reference-price', e => e.hidden));
  console.log(
    'PASS: reference range, explicit median use, seller price preserved, stat refresh and sparse-data fallback'
  );
  const { p: expired } = await page({
    remaining: 0,
    account: {
      is_admin: false,
      entitlements: [{ product: 'market', expires_at: new Date(Date.now() - 1000).toISOString() }]
    }
  });
  await expired.click('.listing>button');
  await expired.waitForFunction(() =>
    document.querySelector('#contact-content').textContent.includes('สมัครสมาชิกตลาด')
  );
  assert((await expired.$eval('#contact-content', e => e.textContent)).includes('สมัครสมาชิกตลาด'));
  assert((await expired.evaluate(() => window.marketTest.calls)).some(c => c.method === 'listing_contact'));
  await expired.click('#close-contact');
  await expired.type('#search', 'MissingItem');
  await expired.click('#search-form button');
  await expired.waitForFunction(() => document.querySelector('.empty'));
  assert.equal(await expired.$('.listing'), null);
  await expired.setViewport({ width: 390, height: 844 });
  assert(await expired.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  await expired.click('#new-post');
  assert(await expired.$eval('#post-dialog', e => e.scrollWidth <= e.clientWidth + 2));
  console.log('PASS: expired subscriber locked, search empty state and mobile layout');
  const { p: bonus, errors: bonusErrors } = await page({ remaining: 3, bonus: 20 });
  assert((await bonus.$eval('#membership-description', e => e.textContent)).includes('3 / 10'));
  assert((await bonus.$eval('#membership-description', e => e.textContent)).includes('โบนัสสะสม 20 ครั้ง'));
  assert.deepEqual(bonusErrors, []);
  console.log('PASS: monthly free and promotional bonus displayed separately');

  const watchRows = [
    { ...fixture, id: 70, item_id: 917, item_name: 'Pan Lid', item_stats: { def: -1 }, user_id: 'seller-a' },
    { ...fixture, id: 71, item_id: 917, item_name: 'Pan Lid', item_stats: { def: -1 }, user_id: 'seller-b' },
    { ...fixture, id: 72, kind: 'buy', item_name: 'Steely Throwing-Knives' },
    { ...fixture, id: 73, status: 'done' },
    { ...fixture, id: 74, price_unit: 'thb' }
  ];
  const { p: homeWatch, errors: watchErrors } = await page({ rows: watchRows }, '/index.html');
  assert((await homeWatch.$eval('#market', e => e.textContent)).includes('เปิดตลาดซื้อขาย'));
  assert(!(await homeWatch.$eval('#market', e => e.textContent)).includes('ยังไม่เปิดให้ใช้งาน'));
  assert.equal(await homeWatch.$$eval('.market-watch-card', e => e.length), 2);
  assert((await homeWatch.$eval('#market-watch-items', e => e.textContent)).includes('ประกาศรับซื้อ'));
  assert((await homeWatch.$eval('#market-watch-items', e => e.textContent)).includes('มีหลายคนลงประกาศ'));
  assert((await homeWatch.$eval('#market-watch-items', e => e.textContent)).includes('DEF -1'));
  assert((await homeWatch.$eval('.market-watch-picture img', e => e.src)).endsWith('/i/18.png'));
  assert.equal(
    await homeWatch.$eval('.market-watch-price', e => e.getAttribute('aria-label')),
    '85,000 Meso'
  );
  await homeWatch.setViewport({ width: 375, height: 812 });
  assert(await homeWatch.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  const advertised = await homeWatch.$eval('.market-watch-card', e =>
    new URL(e.href).searchParams.get('listing')
  );
  await homeWatch.click('.market-watch-card');
  await homeWatch.waitForFunction(() => document.querySelectorAll('.listing').length === 1);
  assert(
    (
      await homeWatch.evaluate(
        () =>
          window.marketTest.rows.find(
            r => String(r.id) === new URL(location.href).searchParams.get('listing')
          ).item_name
      )
    ).includes('Pan Lid')
  );
  assert.equal(new URL(homeWatch.url()).searchParams.get('listing'), advertised);
  assert(
    !(await homeWatch.evaluate(() => window.marketTest.calls)).some(c => c.method === 'listing_contact')
  );
  await homeWatch.click('#clear-filters');
  await homeWatch.waitForFunction(() => document.querySelectorAll('.listing').length === 3);
  assert.deepEqual(watchErrors, []);
  console.log(
    'PASS: live homepage watch cards, buying and selling, mobile, exact listing navigation, contact privacy and clear filters'
  );
  const { p: emptyWatch } = await page({ rows: [] }, '/index.html');
  assert.equal(await emptyWatch.$('.market-watch-card'), null);
  assert((await emptyWatch.$eval('#market-watch-status', e => e.textContent)).includes('ยังไม่มีประกาศ'));
  assert((await emptyWatch.$eval('#market a.button', e => e.href)).endsWith('/marketplace.html'));
  const { p: errorWatch } = await page({ failListings: true }, '/index.html');
  assert(
    (await errorWatch.$eval('#market-watch-status', e => e.textContent)).includes('ยังโหลดประกาศล่าสุดไม่ได้')
  );
  assert.equal(await errorWatch.$('.market-watch-card'), null);
  console.log('PASS: empty and failed feed keep marketplace button available without fake listings');
} finally {
  await browser.close();
}
