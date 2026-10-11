import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname,join } from 'node:path';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-gpu']});
const url='http://127.0.0.1:8765/bandit-immersive-v2.html';
const page=await browser.newPage();await page.setViewport({width:1280,height:900});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const wait=()=>new Promise(r=>setTimeout(r,110));
try{
 await page.goto(url,{waitUntil:'networkidle2'});
 for(const tab of ['intro','builds','opt','money']){
  await page.click('[data-tab="'+tab+'"]');await wait();
  const state=await page.evaluate(name=>{
   const el=document.querySelector('[data-panel="'+name+'"]'),stage=el.querySelector('.mt-unlock-stage');
   return {visible:getComputedStyle(el).display!=='none',hasContent:el.querySelector('.mt-readable').innerText.length>150,hasFade:!!el.querySelector('.mt-read-fade'),hasStage:!!stage,hasSticky:getComputedStyle(stage.querySelector('.mt-unlock-sticky')).position==='sticky',height:stage.getBoundingClientRect().height,header:el.querySelector('.mt-unlock-content h2').innerText};
  },tab);
  assert(state.visible&&state.hasContent&&state.hasFade&&state.hasStage&&state.hasSticky&&state.height>1200,tab+' missing free teaser or seamless scroll: '+JSON.stringify(state));
  assert(state.header==='อ่านต่อได้ทุกหัวข้อ','Unexpected conversion heading');
  const stageTop=await page.$eval('[data-panel="'+tab+'"] .mt-unlock-stage',e=>e.getBoundingClientRect().top+scrollY);
  const sample=async y=>{await page.evaluate(y=>scrollTo(0,y),y);await wait();return await page.$eval('[data-panel="'+tab+'"] .mt-unlock-content',e=>({opacity:Number(getComputedStyle(e).opacity),transform:getComputedStyle(e).transform}))};
  const early=await sample(Math.max(0,stageTop-500));
  const late=await sample(stageTop+350);
  assert(late.opacity>early.opacity,tab+' CTA does not fade in on scroll '+JSON.stringify({early,late}));
  assert(late.transform!==early.transform,tab+' CTA does not float upward');
  console.log('PASS '+tab+': visible excerpt, gradual reveal, upward-moving CTA');
  await page.evaluate(()=>scrollTo(0,0));await wait();
 }
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle2'}),page.click('[data-tab="route"]')]);
 assert(page.url().includes('bandit-route-original.html'),'Route button must open restored original reader');
 const route=await page.evaluate(()=>({steps:document.querySelectorAll('#side [data-i]').length,images:document.querySelectorAll('#main img').length,actions:document.querySelectorAll('#main .act').length,hasInfo:!!document.querySelector('#main .info'),hasBlur:!!document.querySelector('.mt-read-fade')}));
 assert(route.steps===12&&route.images>0&&route.actions>0&&route.hasInfo&&!route.hasBlur,'Restored Route missing original features: '+JSON.stringify(route));
 for(let i=0;i<11;i++)await page.click('#next');
 assert((await page.$eval('#main .stepno',e=>e.innerText)).includes('12'),'Route did not reach Lv.10');
 await page.click('#next');
 assert(await page.$eval('#premiumLock',e=>!e.hidden),'Next after Lv.10 did not lock');
 await page.click('#premiumClose');
 await page.click('#prev');
 assert((await page.$eval('#main .stepno',e=>e.innerText)).includes('11'),'Prev did not go back');
 console.log('PASS Route: original Claude cards, images, 12 free steps and unlock');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle2'}),page.click('[data-tab="builds"]')]);
 assert(page.url().includes('bandit-immersive-v2.html#builds'),'Builds return URL incorrect');
 assert(await page.$eval('[data-panel="builds"]',e=>getComputedStyle(e).display!=='none'),'Builds not restored on return');
 await page.setViewport({width:375,height:812});
 await page.click('[data-tab="intro"]');await wait();
 const mobile=await page.evaluate(()=>({htmlWidth:document.documentElement.scrollWidth,view:innerWidth,introVisible:getComputedStyle(document.querySelector('[data-panel="intro"]')).display!=='none'}));
 assert(mobile.introVisible&&mobile.htmlWidth<=mobile.view+2,'Mobile overflow: '+JSON.stringify(mobile));
 console.log('PASS mobile layout and seamless tab return');
 assert(!errors.length,'JS errors: '+errors.join('; '));
 console.log('PASS mobile layout and browser JS');
}catch(e){console.log('PAGE ERRORS',errors);throw e}finally{await browser.close()}
