import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../bandit-free.html');
const chrome=process.env.CHROME_BIN || '/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-gpu']});
try{
 const page=await browser.newPage();
 await page.setViewport({width:1227,height:900});
 await page.goto('file://'+file,{waitUntil:'load'});
 const intro=await page.$eval('#intro',e=>({display:getComputedStyle(e).display,height:e.getBoundingClientRect().height,text:e.innerText.includes('Pure Bandit คืออะไร'),visible:!!e.offsetParent}));
 assert(intro.display!=='none'&&intro.height>300&&intro.text&&intro.visible,'Free intro is NOT visible: '+JSON.stringify(intro));
 console.log('PASS: intro visible on initial load',intro);
 await page.click('[data-tab="builds"]');
 const builds=await page.evaluate(()=>({intro:getComputedStyle(document.querySelector('#intro')).display,teaser:getComputedStyle(document.querySelector('#teaser')).display,text:document.querySelector('#teaser').innerText}));
 assert(builds.intro==='none'&&builds.teaser!=='none'&&builds.text.includes('Builds'),'Builds teaser failed: '+JSON.stringify(builds));
 await page.click('[data-tab="intro"]');
 assert(await page.$eval('#intro',e=>getComputedStyle(e).display!=='none'),'Returning to intro failed');
 await page.click('#unlock');
 assert(await page.$eval('#modal',e=>getComputedStyle(e).display!=='none'),'Premium modal failed');
 await page.click('#close');
 assert(await page.$eval('#modal',e=>getComputedStyle(e).display==='none'),'Premium modal close failed');
 const html=await page.content();
 assert(!html.includes('const S = '),'Full route data must not be in free preview');
 console.log('PASS: tab switching, paywall modal, and no paid route data');
}finally{await browser.close()}
