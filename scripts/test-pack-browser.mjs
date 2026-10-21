// All-guides pack on the homepage, checkout and my guides, against a mocked Supabase.
// Real pricing and entitlement rules are covered by scripts/test-pack.sql; here the mock
// mirrors them so each customer type sees the right screen.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox']
});
const base = 'http://127.0.0.1:8765';
const stub = `
const state=window.packTest;
const ids=['bandit','sindit','assassin','mage','fp','cleric','fighter','page','spearman','hunter','crossbowman'];
const products=[{id:'pack_all',name:'แพ็กทุกอาชีพ + ตลาดถาวร',price:259},...ids.map(id=>({id:'guide_'+id,name:id,price:99})),{id:'market',name:'ตลาดซื้อขาย 30 วัน',price:50}];
const covers=[...ids.map(i=>'guide_'+i),'market'];
const active=e=>!e.expires_at||new Date(e.expires_at)>new Date();
const owned=()=>new Set(state.rows.filter(e=>active(e)&&e.product.startsWith('guide_')).map(e=>e.product)).size;
const hasPack=()=>state.rows.some(e=>e.product==='pack_all'&&active(e));
const quote=()=>{const n=state.user?owned():0;return {active:true,base:259,owned_guides:n,discount:Math.min(259,99*n),price:Math.max(0,259-99*n),guides:11,separate_price:1089,owns_pack:!!state.user&&hasPack()}};
const account=()=>({is_admin:false,entitlements:hasPack()?[...state.rows.filter(e=>!(covers.includes(e.product)&&e.expires_at)),...covers.filter(c=>!state.rows.some(e=>e.product===c&&!e.expires_at)).map(c=>({product:c,expires_at:null,source:'pack'}))]:state.rows});
const auth={getUser:async()=>({data:{user:state.user},error:null}),getSession:async()=>({data:{session:state.user?{user:state.user}:null},error:null}),onAuthStateChange:fn=>({data:{subscription:{unsubscribe(){}}}})};
const query=table=>{const q={select:()=>q,in:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then:(res,rej)=>Promise.resolve({data:table==='products'?products:state.orders,error:null}).then(res,rej)};return q};
export const createClient=()=>({auth,from:query,functions:{invoke:async()=>({data:{status:'pending'},error:null})},storage:{from:()=>({upload:async()=>({error:null})})},rpc:async(method,args)=>{
 state.calls.push({method,args});
 if(method==='pack_quote')return {data:quote(),error:null};
 if(method==='sync_account')return state.user?{data:account(),error:null}:{error:{message:'login'}};
 if(method==='payment_settings')return {data:state.settings,error:null};
 if(method==='auto_verification_status')return {data:false,error:null};
 if(method==='credit_summary')return {data:{available_cents:state.credit,reserved_cents:0},error:null};
 if(method==='my_guide_progress')return {data:[],error:null};
 if(method==='create_payment_order'){
  if(args.p_product!=='pack_all')return {error:{message:'unexpected product'}};
  if(hasPack())return {error:{message:'คุณมีสิทธิ์นี้แล้ว'}};
  const price=quote().price,credit=Math.min(state.credit,price*100),ok=credit===price*100;
  const order={id:state.orders.length+50,product:'pack_all',amount:price,status:ok?'ok':'awaiting_slip',credit_applied_cents:credit,amount_due_cents:price*100-credit+(ok?0:23),processing_fee_cents:ok?0:23,recipient:state.settings,created_at:new Date().toISOString(),gift_email:null,referral_email:null};
  state.credit-=credit;state.orders.unshift(order);if(ok)state.rows.push({product:'pack_all',expires_at:null,source:'payment'});
  return {data:order,error:null};
 }
 return {error:{message:'Unknown RPC '+method}};
}});
`;
const guides = n =>
  ['guide_bandit', 'guide_mage', 'guide_hunter', 'guide_page'].slice(0, n).map(product => ({ product, expires_at: null }));
async function open(path, extra = {}) {
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(extra => {
    window.packTest = {
      user: { id: 'u', email: 'player@example.invalid' },
      rows: [],
      orders: [],
      calls: [],
      credit: 0,
      settings: {
        enabled: true,
        bank: 'Test Bank',
        account_number: '1234567890',
        recipient_name: 'Test Receiver',
        qr_path: 'assets/payments/kbank-0248522232.jpeg'
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
  const errors = [];
  p.on('pageerror', e => errors.push(e));
  await p.goto(base + path, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 150));
  assert.deepEqual(errors, [], 'page errors on ' + path);
  return p;
}
const text = (p, sel) => p.$eval(sel, e => e.textContent.trim());
const visible = (p, sel) =>
  p.$eval(sel, e => !e.hidden && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none');
try {
  // Signed-out visitor: banner and pack card are visible with the full price and buy links.
  let p = await open('/index.html', { user: null });
  assert.ok(await visible(p, '#pack-promo'));
  assert.ok(await visible(p, '#pack'));
  assert.equal(await text(p, '#pack-promo [data-pack-price]'), '฿259');
  assert.match(await text(p, '#pack-promo'), /฿1,089/);
  assert.match(await text(p, '#pack-promo .pack-kicker'), /เปิดเซิร์ฟเวอร์/);
  assert.match(await text(p, '#pack-promo [data-pack-personal]'), /เข้าสู่ระบบ/);
  assert.equal(
    await p.$eval('#pack-promo [data-pack-buy]', a => a.getAttribute('href')),
    './checkout.html?product=pack_all'
  );
  assert.deepEqual(
    await p.$$eval('[data-pack-tiers] strong', l => l.map(e => e.textContent)),
    ['฿259', '฿160', '฿61', 'ฟรี']
  );
  // The pack sits above the first class family and the banner right after the hero.
  assert.ok(await p.$eval('#pack', e => !!(e.compareDocumentPosition(document.querySelector('.class-groups')) & 4)));
  assert.ok(await p.$eval('.hero', e => e.nextElementSibling.id === 'pack-promo'));
  await p.close();

  p = await open('/checkout.html?product=pack_all', { user: null });
  assert.equal(await p.$eval('#product-select', e => e.value), 'pack_all');
  assert.equal(await p.$eval('#product-select optgroup', g => g.label), 'แพ็กสุดคุ้ม');
  assert.equal(await text(p, '#checkout-heading'), 'ซื้อแพ็กทุกอาชีพ');
  assert.ok(await visible(p, '#pack-features'));
  assert.ok(await visible(p, '#login-needed'));
  assert.ok(!(await visible(p, '#gift-options')) && !(await visible(p, '#friend-promotion')));
  assert.match(await text(p, '#pack-quote'), /ราคาเต็ม฿259/);
  assert.match(
    await p.$eval('#checkout-login', a => a.href),
    /next=checkout\.html%3Fproduct%3Dpack_all/
  );
  await p.close();

  // New customer: full price, QR for 259 + satang.
  p = await open('/checkout.html?product=pack_all');
  assert.equal(await text(p, '#product-price').then(s => s.replace(/\s/g, '')), '฿259.00');
  assert.match(await text(p, '#pack-quote'), /ยอดที่ต้องชำระ฿259/);
  assert.ok(!(await visible(p, '#gift-options')) && !(await visible(p, '#referral-fields')));
  await p.click('#create-order');
  await p.waitForFunction(() => !document.querySelector('#slip-form').hidden);
  assert.match(await text(p, '#availability'), /259\.23/);
  await p.close();

  // 1 / 2 guides: discount 99 each, shown on the homepage and at checkout.
  for (const [n, price] of [
    [1, '฿160'],
    [2, '฿61']
  ]) {
    p = await open('/index.html', { rows: guides(n) });
    assert.equal(await text(p, '#pack-promo [data-pack-price]'), price);
    assert.match(await text(p, '#pack [data-pack-personal]'), new RegExp('มีไกด์ ' + n + ' อาชีพ.*฿' + 99 * n));
    await p.close();
    p = await open('/checkout.html?product=pack_all', { rows: guides(n) });
    const q = await text(p, '#pack-quote');
    assert.match(q, new RegExp('ไกด์ ' + n + ' อาชีพ × ฿99\\)−฿' + 99 * n));
    assert.match(q, new RegExp('ยอดที่ต้องชำระ' + price));
    await p.close();
  }

  // 3 guides: free claim, no QR or slip, and the page then shows the pack as owned.
  p = await open('/index.html', { rows: guides(3) });
  assert.equal(await text(p, '#pack-promo [data-pack-price]'), 'ฟรี');
  assert.equal(await text(p, '#pack-promo [data-pack-buy]'), 'รับแพ็กฟรี');
  await p.close();
  p = await open('/checkout.html?product=pack_all', { rows: guides(3), credit: 4000 });
  assert.equal(await text(p, '#product-price'), 'ฟรี');
  assert.equal(await text(p, '#create-order'), 'รับแพ็กทุกอาชีพฟรี');
  assert.match(await text(p, '#availability'), /ไม่ต้องโอนเงินหรือส่งสลิป/);
  await p.click('#create-order');
  await p.waitForFunction(() => !document.querySelector('#already-owned').hidden);
  assert.match(await text(p, '#checkout-status'), /รับแพ็กทุกอาชีพสำเร็จ/);
  assert.ok(!(await visible(p, '#create-order')) && !(await visible(p, '#slip-form')));
  assert.equal(await p.$eval('#read-guide', a => a.getAttribute('href')), './my-guides.html');
  assert.equal(
    await p.evaluate(() => window.packTest.calls.filter(c => c.method === 'create_payment_order').length),
    1
  );
  assert.equal(await p.evaluate(() => window.packTest.credit), 4000, 'free claim must not use credit');
  assert.match(await text(p, '#order-history'), /เปิดไกด์ของฉัน/);
  await p.close();

  // Pack owner: homepage points to my guides, every guide is unlocked, market is permanent.
  const ownerRows = [{ product: 'pack_all', expires_at: null, source: 'payment' }];
  p = await open('/index.html', { rows: ownerRows });
  assert.equal(await text(p, '#pack-promo [data-pack-price]'), 'มีแล้ว');
  assert.equal(await p.$eval('#pack [data-pack-buy]', a => a.getAttribute('href')), './my-guides.html');
  await p.close();
  p = await open('/my-guides.html', { rows: ownerRows });
  assert.equal(await p.$$eval('#library-owned .library-card', l => l.length), 11);
  assert.equal(await p.$$eval('#library-discover .library-card', l => l.length), 0);
  await p.close();
  p = await open('/checkout.html?product=market', { rows: ownerRows });
  assert.ok(await visible(p, '#already-owned'));
  await p.close();
  p = await open('/checkout.html?product=guide_cleric', { rows: ownerRows });
  assert.ok(await visible(p, '#already-owned'));
  assert.ok(!(await visible(p, '#pack-upsell')));
  await p.close();

  // Credit: covers the discounted price in full -> pays with credit, no QR.
  p = await open('/checkout.html?product=pack_all', { rows: guides(1), credit: 20000 });
  assert.equal(await text(p, '#create-order'), 'ชำระด้วยเครดิตและปลดล็อก');
  await p.click('#create-order');
  await p.waitForFunction(() => !document.querySelector('#already-owned').hidden);
  assert.equal(await p.evaluate(() => window.packTest.credit), 4000);
  await p.close();

  // An unpaid 259 QR made before a guide was added is replaced, not reused.
  p = await open('/checkout.html?product=pack_all', {
    rows: guides(1),
    orders: [
      {
        id: 7,
        product: 'pack_all',
        amount: 259,
        status: 'awaiting_slip',
        amount_due_cents: 25923,
        processing_fee_cents: 23,
        credit_applied_cents: 0,
        created_at: new Date().toISOString(),
        gift_email: null
      }
    ]
  });
  assert.ok(await visible(p, '#create-order'));
  assert.match(await text(p, '#availability'), /ราคาแพ็กเปลี่ยน.*฿160/);
  await p.close();

  // Single-guide checkout advertises the pack at the customer's own price.
  p = await open('/checkout.html?product=guide_cleric', { rows: guides(2) });
  assert.ok(await visible(p, '#pack-upsell'));
  assert.equal(await text(p, '#pack-upsell-price'), '฿61');
  assert.ok(await visible(p, '#gift-options'));
  await p.close();
  console.log(
    'PASS: pack banner/card for guests, 0/1/2/3-guide prices, free claim once, owner view, credit, stale QR, upsell'
  );
} finally {
  await browser.close();
}
