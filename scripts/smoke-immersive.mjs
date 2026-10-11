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
  await page.click('[data-panel="'+tab+'"] [data-unlock]');
  assert(await page.$eval('#modal',e=>!e.hidden),'Unlock dialog did not open');
  await page.click('#close');
  assert(await page.$eval('#modal',e=>e.hidden),'Unlock dialog did not close');
 }
 await page.click('[data-tab="route"]');
 assert.equal(await page.$eval('[data-panel="route"] .mt-read-fade',()=>true).catch(()=>false),false,'Route must not use blur');
 const steps=await page.$$eval('#route-list button',els=>els.length);
 for(let i=0;i<steps;i++)await page.click('#route-next');
 assert(await page.$eval('#modal',e=>!e.hidden),'Route must lock after the free steps');
 await page.click('#close');
 await page.setViewport({width:375,height:800});
 for(const tab of ['intro','builds','route','opt','money']){
  await page.click('[data-tab="'+tab+'"]');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),tab+' horizontal overflow on mobile');
 }
 console.log('PASS five tabs, progressive blur, route step lock, unlock dialog and mobile layout');
}finally{await browser.close();await new Promise(r=>server.close(r))}
