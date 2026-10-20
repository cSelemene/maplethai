import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base='http://127.0.0.1:8765';
const pages=readdirSync('.').filter(f=>f.endsWith('.html')&&/<img\b[^>]*class="maple-logo"/.test(readFileSync(f,'utf8')));
pages.push('navigation/index.html');
const stub=`export const supabase={auth:{getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>{}},rpc:async()=>({data:null,error:null}),from:()=>({select:()=>({order:async()=>({data:[]})})})};export const readAccount=async()=>({is_admin:false,entitlements:[]});export const GUIDES={};export const hasGuide=()=>false;export const guideProduct=id=>'guide_'+id;`;
try{
 const page=await browser.newPage();
 await page.setRequestInterception(true);
 page.on('request',r=>r.url().includes('/supabase-client.js')?r.respond({status:200,contentType:'application/javascript',body:stub}):r.url().startsWith(base)?r.continue():r.abort());
 for(const file of pages){
  await page.goto(base+'/'+file,{waitUntil:'domcontentloaded'});
  const logo=await page.$('header .maple-logo');assert(logo,file+' header logo missing');
  const link=await logo.evaluate(e=>({href:e.closest('a')?.href,label:e.closest('a')?.getAttribute('aria-label')}));
  assert.equal(link.href,base+'/index.html',file+' home destination');
  assert(link.label||await logo.evaluate(e=>e.alt),file+' accessible name');
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),logo.click()]);assert.equal(new URL(page.url()).pathname,'/index.html',file+' click failed');
 }
 // Exercise the shared guide header inside the same kind of iframe used by the reader.
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{document.body.innerHTML='<iframe id="test-guide"></iframe>';document.getElementById('test-guide').srcdoc='<html><head><base href="'+location.origin+'/"></head><body class="maple-guide"><header><div class="bar-inner"></div></header><script src="./guide-layout.js"><\/script></body></html>';});
 const iframe=await page.$('#test-guide');const frame=await iframe.contentFrame();await frame.waitForSelector('.guide-home-logo');
 assert.equal(await frame.$eval('.guide-home-logo',e=>e.target),'_top');
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),frame.click('.guide-home-logo')]);assert.equal(new URL(page.url()).pathname,'/index.html');
 console.log('PASS: '+pages.length+' page logos navigate home; embedded guide logo exits reader to top-level homepage');
}finally{await browser.close()}
