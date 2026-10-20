import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
// Homepage launch-pack banner and checkout for the all-guides pack, with Supabase stubbed.
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox']
});
const stub = `const t=window.packTest;const products=[{id:'pack_all',name:'แพ็กทุกอาชีพ + ตลาดถาวร',price:259},{id:'guide_bandit',name:'Bandit',price:99},{id:'market',name:'ตลาด 30 วัน',price:50}];
const query=table=>{const q={select:()=>q,in:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then:(resolve,reject)=>Promise.resolve({data:table==='products'?products:t.orders,error:null}).then(resolve,reject)};return q};
const quote=()=>{const owned=t.user?t.owned:0;return {active:true,base:259,owned_guides:owned,discount:Math.min(259,99*owned),price:Math.max(0,259-99*owned),guides:11,separate_price:1089,owns_pack:t.ownsPack}};
export const createClient=()=>({auth:{getUser:async()=>({data:{user:t.user},error:null}),getSession:async()=>({data:{session:t.user?{user:t.user}:null},error:null}),onAuthStateChange:fn=>({data:{subscription:{unsubscribe(){}}}})},from:query,channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){},
rpc:async(method,args)=>{t.calls.push({method,args});if(method==='pack_quote')return {data:quote(),error:null};if(method==='sync_account')return {data:{is_admin:false,entitlements:t.ownsPack?[{product:'guide_bandit',expires_at:null,source:'pack'}]:[]},error:null};if(method==='credit_summary')return {data:{available_cents:0,reserved_cents:0},error:null};if(method==='payment_settings')return {data:t.settings,error:null};if(method==='auto_verification_status')return {data:false,error:null};
if(method==='create_payment_order'){const q=quote(),free=q.price===0;const p={id:30,product:args.p_product,amount:q.price,credit_applied_cents:0,amount_due_cents:free?0:q.price*100+27,processing_fee_cents:free?0:27,status:free?'ok':'awaiting_slip',recipient:t.settings,created_at:new Date().toISOString()};t.orders.push(p);if(free)t.ownsPack=true;return {data:p,error:null}}
return {data:null,error:null}}});`;
async function page(extra = {}) {
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(extra => {
    window.packTest = {
      user: { id: 'buyer', email: 'buyer@example.invalid', user_metadata: {} },
      owned: 0,
      ownsPack: false,
      orders: [],
      calls: [],
      settings: {
        enabled: true,
        bank: 'ธนาคารกสิกรไทย',
        account_number: '0248522232',
        recipient_name: 'test',
        qr_path: 'assets/payments/kbank-0248522232.jpeg',
        qr_payload: '00020101021129390016A000000677010111031500499900465145053037645802TH6304BF03'
      },
      ...extra
    };
  }, extra);
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
  return p;
}
const text = (p, sel) => p.$eval(sel, e => e.textContent);
const waitText = (p, sel, s) =>
  p.waitForFunction((sel, s) => document.querySelector(sel)?.textContent.includes(s), {}, sel, s);
try {
  // Homepage: new visitor, one-guide owner, three-guide owner, pack owner.
  const home = await page({ user: null });
  await home.setViewport({ width: 1100, height: 900 });
  await home.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle0' });
  await waitText(home, '[data-pack-price]', '฿259');
  assert.equal(await text(home, '[data-pack-badge]'), '-76%');
  assert((await text(home, '[data-pack-was]')).includes('1,089'));
  assert((await text(home, '.pack-ribbon')).includes('เปิดเซิร์ฟ'));
  await (
    await home.$('#pack-promo')
  ).screenshot({ path: process.env.PACK_SHOT_DESKTOP || '/tmp/pack-desktop.png' });
  const one = await page({ owned: 1 });
  await one.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle0' });
  await waitText(one, '[data-pack-price]', '฿160');
  assert((await text(one, '[data-pack-personal]')).includes('฿99'));
  const three = await page({ owned: 3 });
  await three.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle0' });
  await waitText(three, '[data-pack-price]', 'ฟรี');
  assert((await text(three, '[data-pack-buy]')).includes('รับแพ็กฟรี'));
  const owner = await page({ ownsPack: true });
  await owner.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle0' });
  await waitText(owner, '[data-pack-price]', 'มีแล้ว');
  assert((await owner.$eval('[data-pack-buy]', e => e.href)).endsWith('my-guides.html'));
  console.log('PASS: homepage banner shows -76%, personal 160 baht, free claim and owned states');

  // Phone width: no horizontal overflow from the banner.
  const phone = await page({ owned: 1 });
  await phone.setViewport({ width: 375, height: 800 });
  await phone.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle0' });
  await waitText(phone, '[data-pack-price]', '฿160');
  assert(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await (
    await phone.$('#pack-promo')
  ).screenshot({ path: process.env.PACK_SHOT_MOBILE || '/tmp/pack-mobile.png' });
  console.log('PASS: banner fits a 375px phone screen');

  // Checkout: one-guide owner sees 160 and a QR order; gifts/referrals hidden.
  const c = await page({ owned: 1 });
  await c.setViewport({ width: 1100, height: 1000 });
  await c.goto('http://127.0.0.1:8765/checkout.html?product=pack_all', { waitUntil: 'networkidle0' });
  await waitText(c, '#product-price', '160');
  assert((await text(c, '#pack-summary')).includes('ลด ฿99'));
  assert(await c.$eval('#gift-options', e => e.hidden));
  assert(await c.$eval('#referral-fields', e => e.hidden));
  assert(!(await c.$eval('#pack-features', e => e.hidden)));
  assert((await text(c, '#create-order')).includes('฿160'));
  await c.screenshot({ path: process.env.PACK_SHOT_CHECKOUT || '/tmp/pack-checkout.png', fullPage: true });
  await c.click('#create-order');
  await c.waitForFunction(() => window.packTest.orders.length === 1);
  const call = await c.evaluate(() => window.packTest.calls.find(x => x.method === 'create_payment_order'));
  assert.deepEqual(call.args, { p_product: 'pack_all' });
  console.log('PASS: checkout shows personal 160 baht, hides gift/referral and creates a pack order');

  // Three-guide owner claims for free.
  const f = await page({ owned: 3 });
  await f.goto('http://127.0.0.1:8765/checkout.html?product=pack_all', { waitUntil: 'networkidle0' });
  await waitText(f, '#create-order', 'รับแพ็กฟรี');
  assert.equal(await text(f, '#product-price'), 'ฟรี');
  await f.click('#create-order');
  await waitText(f, '#checkout-status', 'รับแพ็กฟรีสำเร็จ');
  console.log('PASS: three-guide owner claims the pack for free');
} finally {
  await browser.close();
}
