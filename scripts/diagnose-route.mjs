import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage();await page.setViewport({width:1100,height:900});
const errors=[];page.on('pageerror',e=>errors.push('ERR '+e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push('CONSOLE '+msg.text())});
const out=[];
try{
 await page.goto('http://127.0.0.1:8765/bandit-route-original.html',{waitUntil:'networkidle2'});
 for(let i=0;i<12;i++){
  await page.evaluate(i=>go(i),i);
  const base=await page.evaluate(()=>({i:state.i,maps:document.querySelectorAll('#main .tile.map').length,npc:document.querySelectorAll('#main .npcmap').length,mm:document.querySelectorAll('#main .mm').length,nav:document.querySelectorAll('#main .navbox').length,images:document.querySelectorAll('#main img').length,broken:[...document.querySelectorAll('#main img')].filter(e=>e.complete&&!e.naturalWidth).slice(0,5).map(x=>x.src)}));
  const checks={step:i+1,base};
  if(base.maps){
    try{await page.click('#main .tile.map');checks.mapPopup=await page.$eval('#lightbox',e=>({open:e.classList.contains('open'),display:getComputedStyle(e).display,figure:e.querySelector('figure').textContent.slice(0,70)}));await page.keyboard.press('Escape')}
    catch(e){checks.mapPopupError=String(e).slice(0,200)}
  }
  if(base.npc){
    try{await page.click('#main .npcmap');checks.npcPopup=await page.$eval('#lightbox',e=>({open:e.classList.contains('open'),display:getComputedStyle(e).display,figure:e.querySelector('figure').textContent.slice(0,70)}));await page.keyboard.press('Escape')}
    catch(e){checks.npcPopupError=String(e).slice(0,200)}
  }
  if(base.mm){
   try{
    await page.click('#main details.navbox summary');
    const before=await page.$eval('#main .mm',e=>({big:e.classList.contains('big'),w:e.getBoundingClientRect().width,disp:getComputedStyle(e).display}));
    await page.click('#main .mm');
    const after=await page.$eval('#main .mm',e=>({big:e.classList.contains('big'),w:e.getBoundingClientRect().width,disp:getComputedStyle(e).display}));
    checks.miniMap={before,after};
   }catch(e){checks.miniMapError=String(e).slice(0,200)}
  }
  out.push(checks);
 }
 console.log('DIAG',JSON.stringify(out));
 console.log('ERRORS',JSON.stringify(errors.slice(0,40)));
}finally{await browser.close()}
