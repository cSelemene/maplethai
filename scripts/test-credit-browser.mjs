import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox']
});
const stub = `const t=window.creditTest;const products=[{id:'guide_bandit',name:'Bandit',price:99},{id:'market',name:'ตลาด 30 วัน',price:50}];
const query=table=>{const q={select:()=>q,in:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then:(resolve,reject)=>Promise.resolve({data:table==='products'?products:table==='credit_ledger'?t.ledger:t.orders,error:null}).then(resolve,reject)};return q};
export const createClient=()=>({auth:{getUser:async()=>({data:{user:t.user},error:null}),onAuthStateChange:fn=>{t.listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}}}},from:query,rpc:async(method,args)=>{t.calls.push({method,args});if(method==='sync_account')return {data:t.account,error:null};if(method==='credit_summary')return {data:{available_cents:t.balance,reserved_cents:0},error:null};if(method==='payment_settings')return {data:t.settings,error:null};if(method==='auto_verification_status')return {data:true,error:null};if(method==='create_payment_order'){const price=args.p_product==='market'?50:99,used=t.balance>=price*100?price*100:Math.floor(t.balance/100)*100,fee=used===price*100?0:31;t.balance-=used;const p={id:20,product:args.p_product,amount:price,credit_applied_cents:used,amount_due_cents:price*100-used+fee,processing_fee_cents:fee,status:used===price*100?'ok':'awaiting_slip',recipient:t.settings,created_at:new Date().toISOString()};t.orders.push(p);if(p.status==='ok')t.account.entitlements.push({product:p.product,expires_at:null});return {data:p,error:null}}if(method==='cancel_payment_order'){const p=t.orders.find(p=>p.id===args.p_payment);p.status='cancelled';t.balance+=p.credit_applied_cents;return {error:null}}return {error:{message:'unused'}}}});`;
async function page(extra = {}) {
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(extra => {
    window.creditTest = {
      user: { id: 'buyer', email: 'buyer@example.invalid' },
      account: { is_admin: false, entitlements: [] },
      balance: 5000,
      orders: [],
      ledger: [],
      calls: [],
      listeners: [],
      settings: {
        enabled: true,
        bank: 'ธนาคารกสิกรไทย',
        account_number: '0248522232',
        recipient_name: 'ด.ช. กวินทร์นิธิ พลาญทอง',
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
  p.on('pageerror', e => {
    throw e;
  });
  return p;
}
try {
  const p = await page();
  await p.goto('http://127.0.0.1:8765/checkout.html', { waitUntil: 'networkidle0' });
  assert((await p.$eval('#credit-balance', e => e.textContent)).includes('50'));
  await p.click('#create-order');
  await p.waitForFunction(() => document.querySelector('#receiving-qr').src.startsWith('data:image/png'));
  assert((await p.$eval('#qr-amount-note', e => e.textContent)).includes('49.31'));
  assert((await p.$eval('#fee-note', e => e.textContent)).includes('0.31'));
  assert((await p.$eval('#credit-note', e => e.textContent)).includes('50'));
  assert(await p.$eval('#download-qr', e => e.href.startsWith('data:image/png')));
  await p.click('#cancel-order');
  await p.waitForFunction(() => window.creditTest.orders[0].status === 'cancelled');
  assert.equal(await p.evaluate(() => window.creditTest.balance), 5000);
  console.log('PASS: 50 credit creates original-frame 49.31-baht QR and cancellation releases credit');
  const regular = await page({ balance: 0 });
  await regular.goto('http://127.0.0.1:8765/checkout.html', { waitUntil: 'networkidle0' });
  assert((await regular.$eval('#fee-note', e => e.textContent)).includes('0.11–0.49'));
  await regular.click('#create-order');
  await regular.waitForFunction(() =>
    document.querySelector('#receiving-qr').src.startsWith('data:image/png')
  );
  assert((await regular.$eval('#qr-amount-note', e => e.textContent)).includes('99.31'));
  assert((await regular.$eval('#fee-note', e => e.textContent)).includes('0.31'));
  console.log('PASS: normal purchase includes disclosed random fee in QR');
  const market = await page();
  await market.goto('http://127.0.0.1:8765/checkout.html?product=market', { waitUntil: 'networkidle0' });
  await market.click('#create-order');
  await market.waitForFunction(() => !document.querySelector('#payment-read-guide').hidden);
  assert(await market.$eval('#slip-form', e => e.hidden));
  assert(await market.$eval('#recipient', e => e.hidden));
  assert.equal(await market.evaluate(() => window.creditTest.balance), 0);
  console.log('PASS: sufficient credit unlocks market without asking for transfer/slip');
  const account = await page({
    ledger: [
      { kind: 'transfer', delta_cents: 5025, balance_after_cents: 5025, created_at: new Date().toISOString() }
    ],
    balance: 5025
  });
  await account.goto('http://127.0.0.1:8765/auth.html', { waitUntil: 'networkidle0' });
  assert((await account.$eval('#account-credit-status', e => e.textContent)).includes('50.25'));
  assert((await account.$eval('#account-credit-history', e => e.textContent)).includes('รับยอดโอน'));
  console.log('PASS: account balance and ledger retain satang precision');
} catch (e) {
  throw e;
} finally {
  await browser.close();
}
