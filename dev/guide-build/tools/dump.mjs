import puppeteer from 'puppeteer-core';
import fs from 'fs';
const exe='/home/claude/tools/chrome-headless-shell/linux-155.0.8059.84/chrome-headless-shell-linux64/chrome-headless-shell';
const b=await puppeteer.launch({executablePath:exe,args:['--no-sandbox','--allow-file-access-from-files']});
for (const n of ['bandit','assassin','mage']){
  const p=await b.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.setViewport({width:1280,height:900});
  await p.goto('file:///home/claude/g/'+n+'.html',{waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  const d=await p.evaluate(()=>{
    const out={};
    out.steps=S.map((s,i)=>({i,ch:s.ch,lv:s.lv,title:s.title,where:s.where,acts:s.act.length,keys:Object.keys(s)}));
    out.sq=SQ.map(q=>({id:q.id,lv:q.lv,title:q.title,after:q.after}));
    out.nav=Object.keys(NAV).length;
    out.keep=KEEP.length;
    out.rare=RAREDATA.length;
    out.optkeys=Object.keys(OPTDATA);
    out.optlens=Object.fromEntries(Object.entries(OPTDATA).map(([k,v])=>[k,Array.isArray(v)?v.length:Object.keys(v).length]));
    out.farm=Object.keys(FARM).length;
    out.tabs={};
    for (const t of ['intro','route','opt','money','builds']){
      const btn=document.querySelector(`.tabs [data-tab="${t}"]`); if(!btn) continue;
      setTab(t);
      const el = t==='route'? document.getElementById('main') : document.getElementById(t);
      out.tabs[t]={text:el.innerText, heads:[...el.querySelectorAll('h2,h3')].map(h=>h.tagName+' '+h.innerText.trim())};
    }
    return out;
  });
  d.errs=errs;
  fs.writeFileSync('/home/claude/g/'+n+'.json',JSON.stringify(d,null,1));
  console.log(n,'steps',d.steps.length,'sq',d.sq.length,'nav',d.nav,'keep',d.keep,'rare',d.rare,'farm',d.farm,'opt',JSON.stringify(d.optlens),'errs',errs);
  for (const [t,v] of Object.entries(d.tabs)) console.log('  ',t,v.text.length,'chars',v.heads.length,'heads');
}
await b.close();
