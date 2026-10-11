import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage();await page.setViewport({width:1280,height:900});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8765/bandit-route-original.html',{waitUntil:'networkidle2'});
 assert(!errors.length,'Initial JS errors: '+errors.join('; '));
 const first=await page.evaluate(()=>({
  cards:document.querySelectorAll('#main .card').length,steps:document.querySelectorAll('#side [data-i]').length,
  actions:document.querySelectorAll('#main .act').length,images:document.querySelectorAll('#main img').length,
  maps:document.querySelectorAll('#main .mm').length,loot:document.querySelectorAll('#main .tiles').length,
  hasRealMaps:[...document.querySelectorAll('#main img')].some(x=>x.complete&&x.naturalWidth>0),
  title:document.querySelector('#main .card-head h2')?.innerText,
  lightbox:!!document.querySelector('#lightbox'),keep:!!document.querySelector('#openKeep')
 }));
 assert(first.cards>=1&&first.steps===12&&first.actions>0&&first.images>0&&first.maps>0&&first.loot>0&&first.hasRealMaps,JSON.stringify(first));
 console.log('PASS original Claude route cards/icons/map tiles/steps:',first);
 await page.click('#openKeep');assert(await page.$eval('#keepModal',e=>e.classList.contains('open')),'Keep table not opening');
 await page.click('#closeKeep');
 let mainCheckbox=await page.$('#main .act input[type=checkbox]');assert(mainCheckbox,'Missing original checklist');await mainCheckbox.click();
 assert(await page.$eval('#main .act input[type=checkbox]',e=>e.checked),'Checklist not toggled');
 await page.click('#next');await page.click('#prev');assert(await page.$eval('#main .act input[type=checkbox]',e=>e.checked),'Checklist did not persist');
 await page.reload({waitUntil:'networkidle2'});assert(await page.$eval('#main .act input[type=checkbox]',e=>e.checked),'Checklist lost after reload');
 console.log('PASS checklist, keep-modal, persistence');
 // The very first tutorial step has no .tile.map; check a step with an actual map card.
 await page.evaluate(()=>go(2));
 assert(await page.$('#main .tile.map'),'Step 3 must render a map card');
 await page.click('#main .tile.map');
 assert(await page.$eval('#lightbox',e=>e.classList.contains('open')&&getComputedStyle(e).display==='flex'),'Map card did not open the lightbox');
 assert(await page.$eval('#lbBody',e=>!!e.querySelector('img')&&!!e.querySelector('figcaption')),'Enlarged map image or caption missing');
 await page.keyboard.press('Escape');
 assert(await page.$eval('#lightbox',e=>!e.classList.contains('open')),'Escape did not close map');
 assert(await page.$('#main .npcmap'),'Step 3 NPC map must be interactive');
 await page.click('#main .npcmap');
 assert(await page.$eval('#lightbox',e=>e.classList.contains('open')),'NPC map did not open');
 await page.keyboard.press('Escape');
 await page.click('#main details.navbox summary');
 const before=await page.$eval('#main .mm',e=>e.getBoundingClientRect().width);
 await page.click('#main .mm');
 const after=await page.$eval('#main .mm',e=>e.getBoundingClientRect().width);
 assert(after>before+30,'Route travel map did not expand on click');
 await page.click('#side .tab[data-i="1"]');
 assert(await page.$eval('#main .stepno',e=>e.innerText.includes('2')),'Clicking sidebar step did not navigate');
 await page.click('#side .mt-locked-step');
 assert(await page.$eval('#premiumLock',e=>!e.hidden),'Sidebar premium step did not show lock');
 await page.click('#premiumClose');
 console.log('PASS map card lightbox, NPC location, travel map zoom, sidebar nav, and premium step');
 await page.evaluate(()=>go(0));
 for(let i=0;i<11;i++)await page.click('#next');
 assert(await page.$eval('#main .stepno',e=>e.innerText.includes('12')),'Did not reach final Lv.10 route');
 await page.click('#next');assert(await page.$eval('#premiumLock',e=>!e.hidden),'Clicking past Lv.10 did not lock');
 assert(await page.$eval('#main .stepno',e=>e.innerText.includes('12')),'Locked step advanced too far');
 await page.click('#premiumClose');
 await page.click('#prev');
 assert(await page.$eval('#main .stepno',e=>e.innerText.includes('11')),'Back button not working');
 console.log('PASS 12 free steps and paywall on next');
 await page.setViewport({width:390,height:844});await page.click('#openDrawer');assert(await page.$eval('#drawer',e=>e.classList.contains('open')),'Mobile drawer failed');
 assert(!errors.length,'JS errors: '+errors.join('; '));
 console.log('PASS mobile drawer with no script exceptions');
}finally{await browser.close()}
