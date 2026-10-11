import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const p=await b.newPage();
const logs=[];p.on('pageerror',e=>logs.push('ERROR '+e.message));try{
 await p.goto('http://127.0.0.1:8765/bandit-route-original.html',{waitUntil:'networkidle2'});
 await p.evaluate(()=>go(2));
 const before=await p.evaluate(()=>{const el=document.querySelector('#main .tile.map');const n=el?.dataset?.map;window.__clickTargets=[];document.addEventListener('click',e=>{if(e.target.closest('.tile.map'))window.__clickTargets.push({tag:e.target.tagName,closest:e.target.closest('.tile.map').dataset.map,lock:!!e.target.closest('[data-go]'),open:document.querySelector('#lightbox').className})},true);return {el:el?.outerHTML.slice(0,450),dataset:n,exists:!!MAP[n],mapSize:MAP[n],position:el?.getBoundingClientRect().toJSON()}});console.log('BEFORE',JSON.stringify(before));
 await p.click('#main .tile.map');
 console.log('AFTER CLICK',JSON.stringify(await p.evaluate(()=>({clicked:window.__clickTargets,open:document.querySelector('#lightbox').className,figure:document.querySelector('#lbBody').innerHTML.slice(0,300)}))));
 await p.evaluate(()=>{openMap(document.querySelector('#main .tile.map').dataset.map)});
 console.log('AFTER DIRECT',JSON.stringify(await p.evaluate(()=>({open:document.querySelector('#lightbox').className,figure:document.querySelector('#lbBody').innerHTML.slice(0,300)}))));
 console.log('ERRORS',JSON.stringify(logs));
}finally{await b.close()}
