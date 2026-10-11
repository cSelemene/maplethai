import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
 res.end(await readFile(file));
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu']});
try{
 const page=await browser.newPage();
 await page.setViewport({width:1250,height:850});
 await page.goto('http://127.0.0.1:'+server.address().port+'/bandit-immersive-v2.html',{waitUntil:'load'});
 await page.waitForSelector('#route-list button');
 for(const tab of ['intro','builds','opt','money']){
  await page.click('[data-tab="'+tab+'"]');
  const state=await page.evaluate(t=>{
   const pane=document.querySelector('[data-panel="'+t+'"]');
   const fade=pane.querySelector('.mt-read-fade');
   return {visible:!pane.hidden,height:pane.getBoundingClientRect().height,blur:getComputedStyle(fade).backdropFilter,gate:!!pane.querySelector('[data-unlock]')};
  },tab);
  assert(state.visible&&state.height>650&&state.blur.includes('blur(')&&state.gate,tab+' preview and unlock failed');
  await page.$eval('[data-panel="'+tab+'"] .mt-unlock-stage',e=>window.scrollTo({top:window.scrollY+e.getBoundingClientRect().top+innerHeight,behavior:'instant'}));
  await page.waitForFunction(t=>getComputedStyle(document.querySelector('[data-panel="'+t+'"] .mt-unlock-content')).pointerEvents==='auto',{},tab);
  await page.click('[data-panel="'+tab+'"] [data-unlock]');
  assert(await page.$eval('#modal',e=>!e.hidden),'Unlock dialog did not open');
  await page.click('#close');
  assert(await page.$eval('#modal',e=>e.hidden),'Unlock dialog did not close');
 }
 await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.click('[data-tab="route"]')]);
 await page.waitForSelector('#side .tab[data-i]');
 assert.equal(await page.$('.mt-read-fade'),null,'Route must not use blur');
 await page.waitForFunction(()=>parseFloat(document.documentElement.style.getPropertyValue('--guide-header-height'))>0);
 const header=await page.$eval('.bar',e=>({height:e.getBoundingClientRect().height,bg:getComputedStyle(e).backgroundColor}));
 assert.equal(header.bg,'rgb(255, 248, 233)','Guide header must use a light reading surface');
 assert(await page.$eval('#side .tab',e=>parseFloat(getComputedStyle(e).fontSize)>=14),'Step navigation text is too small');
 await page.click('#side .tab[data-i="4"]');
 await page.waitForSelector('.mm, .npcmap');
 assert(await page.$eval('.mm, .npcmap',e=>getComputedStyle(e).backgroundColor==='rgb(191, 216, 238)'),'Map canvas must retain its original blue background');
 assert(await page.$eval('#side .tab[aria-current="step"]',e=>getComputedStyle(e).color==='rgb(60, 43, 32)'),'Selected step must retain dark readable text');
 console.log('PASS light header, readable step navigation and original map canvas');
 const steps=await page.$$eval('#side .tab[data-i]',els=>els.length);
 await page.click('#side .tab[data-i="'+(steps-1)+'"]');
 console.log('BOUNDARY',await page.evaluate(()=>{const b=document.querySelector('#next'),r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {selected:document.querySelector('#side [aria-current="step"]')?.dataset.i,count:document.querySelector('#count').textContent,rect:{x:r.x,y:r.y,w:r.width,h:r.height},hit:hit?.outerHTML.slice(0,220)}}));
 await page.click('#next');
 assert(await page.$eval('#premiumLock',e=>!e.hidden),'Route must lock after the free steps');
 await page.click('#premiumClose');
 await page.click('#openKeep');
 assert(await page.$eval('#keepModal',e=>e.classList.contains('open')),'Keep items dialog failed');
 await page.click('#closeKeep');
 await page.setViewport({width:375,height:800});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Route horizontal overflow on mobile');
 console.log('PASS five tabs, progressive blur, route step lock, unlock dialog and mobile layout');
}finally{await browser.close();await new Promise(r=>server.close(r))}
