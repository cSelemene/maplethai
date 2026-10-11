import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({headless:true, executablePath:process.env.CHROME_BIN || '/usr/bin/google-chrome', args:['--no-sandbox']});
const base = 'http://127.0.0.1:8765';
const stub = `
export const createClient=()=>({auth:{
 getUser:async()=>({data:{user:window.testState.user},error:null}),
 onAuthStateChange:fn=>{window.testState.listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}}},
 signOut:async()=>{window.testState.user=null;window.testState.listeners.forEach(fn=>fn('SIGNED_OUT',null));return {error:null}}
},rpc:async(method,args)=>{
 window.testState.calls.push({method,args});
 if(method==='sync_account')return {data:window.testState.account,error:null};
 if(method==='redeem_code'){
  if(args.p_code!=='VALID')return {error:{message:'โค้ดไม่ถูกต้อง'}};
  window.testState.account.entitlements.push({product:'guide_mage',expires_at:null});return {error:null};
 }
 if(method==='admin_grant')return {error:window.testState.account.is_admin?null:{message:'Forbidden'}};
 if(method==='get_guide')return window.testState.allowed?{data:'<!doctype html><html><body><h1>Purchased guide</h1></body></html>',error:null}:{data:null,error:{message:'Forbidden'}};
 return {error:{message:'Unknown RPC'}};
}});`;
async function page(state={}){
 const p=await browser.newPage();
 await p.evaluateOnNewDocument(state=>{window.testState={user:{id:'buyer',email:'buyer@example.com'},account:{is_admin:false,entitlements:[]},allowed:false,listeners:[],calls:[],...state}},state);
 await p.setRequestInterception(true);
 p.on('request',req=>req.url().startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@')?req.respond({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:stub}):req.continue());
 p.on('pageerror',e=>{throw e});
 return p;
}
try {
 const account=await page({account:{is_admin:false,entitlements:[{product:'guide_bandit',expires_at:null},{product:'guide_assassin',expires_at:'2000-01-01'}]}});
 await account.goto(base+'/auth.html',{waitUntil:'networkidle0'});
 let links=await account.$$eval('#my-guides a',els=>els.map(e=>e.getAttribute('href')));
 assert(links.includes('./premium-guide.html?guide=bandit'));
 assert(links.includes('./guide-preview.html?guide=assassin'));
 assert(await account.$eval('#admin-link',e=>e.hidden));
 await account.type('#redeem-code','INVALID');await account.click('#redeem-submit');
 await account.waitForFunction(()=>document.querySelector('#redeem-status').textContent==='โค้ดไม่ถูกต้อง');
 await account.$eval('#redeem-code',e=>e.value='VALID');await account.click('#redeem-submit');
 await account.waitForFunction(()=>document.querySelector('#my-guides a[href="./premium-guide.html?guide=mage"]'));
 await account.setViewport({width:390,height:844});
 assert(await account.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 console.log('PASS: purchased/expired rights, code failure/success, mobile account');

 const guest=await page({user:null});await guest.goto(base+'/premium-guide.html?guide=bandit',{waitUntil:'networkidle0'});
 assert(await guest.$eval('#viewer',e=>e.hidden&&!e.getAttribute('src')));
 assert(!(await guest.evaluate(()=>window.testState.calls)).some(c=>c.method==='get_guide'));
 const denied=await page();await denied.goto(base+'/premium-guide.html?guide=mage',{waitUntil:'networkidle0'});
 assert(await denied.$eval('#viewer',e=>e.hidden&&!e.getAttribute('src')));
 const buyer=await page({allowed:true});await buyer.goto(base+'/premium-guide.html?guide=bandit',{waitUntil:'networkidle0'});
 assert(await buyer.$eval('#viewer',e=>!e.hidden&&e.src.startsWith('blob:')));
 assert((await buyer.evaluate(()=>window.testState.calls)).some(c=>c.method==='get_guide'&&c.args.p_guide==='bandit'));
 await buyer.evaluate(()=>window.testState.listeners.forEach(fn=>fn('SIGNED_OUT',null)));
 assert(await buyer.$eval('#viewer',e=>e.hidden&&!e.getAttribute('src')));
 console.log('PASS: guest denied, server denial respected, buyer viewer, signout clears guide');

 const nonadmin=await page();await nonadmin.goto(base+'/admin.html',{waitUntil:'networkidle0'});
 assert(await nonadmin.$eval('#grant-form',e=>e.hidden));
 const admin=await page({account:{is_admin:true,entitlements:[]}});await admin.goto(base+'/admin.html',{waitUntil:'networkidle0'});
 assert(await admin.$eval('#grant-form',e=>!e.hidden));
 await admin.type('#customer-email','customer@example.com');await admin.select('#product','guide_assassin');await admin.click('#grant-submit');
 await admin.waitForFunction(()=>window.testState.calls.some(c=>c.method==='admin_grant'));
 const call=await admin.evaluate(()=>window.testState.calls.find(c=>c.method==='admin_grant'));
 assert.deepEqual(call.args,{p_email:'customer@example.com',p_product:'guide_assassin'});
 console.log('PASS: admin visibility and exact customer/product grant request');
} finally {await browser.close()}
