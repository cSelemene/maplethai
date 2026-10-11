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
 await page.click('[data-tab="route"]');
 const route=await page.evaluate(()=>({title:document.querySelector('#route-title')?.innerText,steps:document.querySelectorAll('#route-list button').length,hasBlur:!!document.querySelector('[data-panel="route"] .mt-read-fade'),hasPaywall:!!document.querySelector('[data-panel="route"] .mt-unlock-stage')}));
 assert(route.steps===12&&!route.hasBlur&&!route.hasPaywall&&route.title?.length,'Route lacks real step navigator '+JSON.stringify(route));
 for(let i=0;i<11;i++)await page.click('#route-next');
 assert((await page.$eval('#route-progress',e=>e.innerText))==='12 / 12','Route did not reach Lv.10');
 await page.click('#route-next');
 assert(await page.$eval('#modal',e=>getComputedStyle(e).display!=='none'),'Next after Lv.10 did not lock');
 assert((await page.$eval('#route-progress',e=>e.innerText))==='12 / 12','Locked button changed route step');
 await page.click('#close');
 assert(await page.$eval('#modal',e=>getComputedStyle(e).display==='none'),'Modal did not close');
 await page.click('#route-prev');
 assert((await page.$eval('#route-progress',e=>e.innerText))==='11 / 12','Prev did not go back');
 await page.click('#route-locked-step');
 assert(await page.$eval('#modal',e=>getComputedStyle(e).display!=='none'),'Locked nav did not show modal');
 await page.click('#close');
 console.log('PASS route: 12 original steps through Lv.10, next click locks, no blur');
 await page.setViewport({width:375,height:812});
 await page.click('[data-tab="intro"]');await wait();
 const mobile=await page.evaluate(()=>({htmlWidth:document.documentElement.scrollWidth,view:innerWidth,introVisible:getComputedStyle(document.querySelector('[data-panel="intro"]')).display!=='none'}));
 assert(mobile.introVisible&&mobile.htmlWidth<=mobile.view+2,'Mobile overflow: '+JSON.stringify(mobile));
 await page.click('[data-tab="route"]');await wait();
 const routeMobile=await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:innerWidth}));
 assert(routeMobile.w<=routeMobile.v+2,'Route mobile overflow: '+JSON.stringify(routeMobile));
 assert(!errors.length,'JS errors: '+errors.join('; '));
 console.log('PASS mobile layout and browser JS');
}catch(e){console.log('PAGE ERRORS',errors);throw e}finally{await browser.close()}
