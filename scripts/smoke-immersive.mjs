import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-gpu']});
try{
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1250,height:850});
 await page.goto('file://'+path.join(root,'bandit-immersive-preview.html'),{waitUntil:'load'});
 for(const [tab,expected] of [['intro','Pure Bandit คืออะไร'],['builds','หลักการลง AP'],['route','เควสสอนเล่น'],['opt','ซื้อหรือคราฟต์แค่อาวุธ'],['money','ขายของให้ NPC หรือขายให้ผู้เล่น']]){
   await page.click('[data-tab="'+tab+'"]');
   const state=await page.evaluate(t=>{
      const pane=document.querySelector('[data-panel="'+t+'"]');
      const fade=pane.querySelector('.mt-read-fade');
      const paywall=pane.querySelector('.mt-unlock-stage');
      return {paneDisplay:getComputedStyle(pane).display,paneHeight:pane.getBoundingClientRect().height,teaser:pane.innerText,fadeFilter:getComputedStyle(fade).backdropFilter,fadeMask:getComputedStyle(fade).maskImage,gateHeight:paywall.getBoundingClientRect().height,gateWidth:paywall.getBoundingClientRect().width,button:pane.querySelector('[data-unlock]')!==null};
   },tab);
   assert(state.paneDisplay!=='none'&&state.paneHeight>650,tab+' missing readable sample');
   assert(state.teaser.includes(expected),tab+' missing original-style content');
   assert(state.fadeFilter.includes('blur(')&&state.fadeMask.includes('gradient'),tab+' missing progressive blur');
   assert(state.gateHeight>=600&&state.gateWidth>=500&&state.button,tab+' not a full-height paywall');
   await page.click('[data-panel="'+tab+'"] [data-unlock]');
   assert(await page.$eval('#modal',e=>getComputedStyle(e).display!=='none'),tab+' modal did not open');
   await page.click('#close');
   assert(await page.$eval('#modal',e=>getComputedStyle(e).display==='none'),tab+' modal did not close');
   console.log('PASS '+tab+' visible teaser, progressive blur, full-height unlock and popup');
 }
 assert.equal(errors.length,0,'Browser errors: '+errors.join(' | '));
 await page.setViewport({width:375,height:800});
 await page.click('[data-tab="intro"]');
 const mobile=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,visible:getComputedStyle(document.querySelector('#intro')).display,gate:document.querySelector('.mt-unlock-stage').getBoundingClientRect().height}));
 assert(mobile.scrollWidth<=mobile.windowWidth+2,'Horizontal overflow on phone');
 assert(mobile.visible!=='none'&&mobile.gate>400,'Mobile intro/paywall fail');
 console.log('PASS mobile layout and original introduction');
 const html=await page.content();
 assert(!html.includes('const S = '),'Do not bundle premium routes in preview');
 console.log('PASS no full premium route data in static preview');
}finally{await browser.close()}
