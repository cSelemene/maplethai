import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const entry='http://127.0.0.1:8765/bandit-artifact-preview-v3.html';
try{
 await page.setViewport({width:1440,height:900});
 await page.goto(entry,{waitUntil:'networkidle2'});
 const specs={intro:1000,builds:1180,opt:1180,money:1180};
 for(const [tab,width] of Object.entries(specs)){
  await page.click('.tabs button[data-tab="'+tab+'"]');
  const metrics=await page.evaluate(name=>{const tab=document.querySelector('.mt-panel[data-panel="'+name+'"]');const reader=tab.querySelector('.mt-readable'),hero=reader.querySelector('.card'),stage=tab.querySelector('.mt-unlock-stage');
   return {hidden:tab.hidden,readerWidth:reader.getBoundingClientRect().width,heroWidth:hero?.getBoundingClientRect().width,fontSize:getComputedStyle(document.body).fontSize,hasOriginalCard:!!reader.querySelector('.card'),hasOriginalMarkup:!!reader.querySelector('.osec'),blur:getComputedStyle(tab.querySelector('.mt-read-fade')).backdropFilter,sticky:getComputedStyle(stage.querySelector('.mt-unlock-sticky')).position,title:reader.innerText.slice(0,180),scrollHeight:document.documentElement.scrollHeight};
  },tab);
  assert(!metrics.hidden&&metrics.readerWidth>=width-4&&metrics.readerWidth<=width+4,'Incorrect original width: '+tab+' '+JSON.stringify(metrics));
  assert(metrics.fontSize==='16px'&&metrics.hasOriginalCard&&metrics.hasOriginalMarkup,tab+' missing original design '+JSON.stringify(metrics));
  assert(metrics.blur.includes('blur(')&&metrics.sticky==='sticky','Broken scroll transition: '+tab+' '+JSON.stringify(metrics));
  console.log('PASS '+tab+' artifact width, 16px base text, original card styles, blur: '+JSON.stringify(metrics));
 }
 await page.click('.tabs button[data-tab="intro"]');
 assert(await page.$eval('.mt-panel[data-panel="intro"]',e=>e.innerText.includes('Pure Bandit คืออะไร')&&e.innerText.includes('Beginner')),'Original intro missing');
 await page.click('.mt-panel[data-panel="intro"] .toc a[data-locked]');
 assert(await page.$eval('#lockDialog',e=>!e.hidden),'Restricted intro section did not open lock');
 await page.click('#lockClose');
 const stageY=await page.$eval('.mt-panel[data-panel="intro"] .mt-unlock-stage',e=>e.getBoundingClientRect().top+scrollY);
 const sample=async y=>{await page.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,120));return page.$eval('.mt-panel[data-panel="intro"] .mt-unlock-content',e=>({opacity:Number(getComputedStyle(e).opacity),matrix:getComputedStyle(e).transform}))};
 const a=await sample(Math.max(0,stageY-500)),b=await sample(stageY+450);
 assert(b.opacity>a.opacity&&b.matrix!==a.matrix,'Unlock card failed to animate upward '+JSON.stringify({a,b}));
 console.log('PASS progressive floating CTA, intro navigation and lock',a,b);
 await page.setViewport({width:390,height:844});
 await page.evaluate(()=>scrollTo(0,0));
 for(const tab of Object.keys(specs)){
  await page.click('.tabs button[data-tab="'+tab+'"]');
  let m=await page.evaluate(name=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth,shown:!document.querySelector('.mt-panel[data-panel="'+name+'"]').hidden}),tab);
  assert(m.scroll<=m.viewport+2&&m.shown,'Horizontal overflow or hidden content on mobile '+tab+' '+JSON.stringify(m));
 }
 console.log('PASS four tabs on 390px mobile');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle2'}),page.click('.tabs button[data-tab="route"]')]);
 assert(page.url().endsWith('bandit-route-original.html'),'Route must use original illustrated renderer');
 assert((await page.$eval('#side',e=>e.querySelectorAll('[data-i]').length))===12,'Route lost 12-step boundary');
 assert(!errors.length,'Browser JS errors: '+errors.join(' | '));
 console.log('PASS route original and strictly 12 free steps');
}finally{await browser.close()}
