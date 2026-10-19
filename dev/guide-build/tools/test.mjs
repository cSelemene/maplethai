import puppeteer from 'puppeteer-core';
const exe='/home/claude/tools/chrome-headless-shell/linux-155.0.8059.84/chrome-headless-shell-linux64/chrome-headless-shell';
const b=await puppeteer.launch({executablePath:exe,args:['--no-sandbox','--allow-file-access-from-files']});
const shots=process.argv.includes('--shots');
for (const n of ['bandit','assassin','mage']){
  for (const vw of [{width:1280,height:900},{width:390,height:844,isMobile:true}]){
    const p=await b.newPage(); const errs=[];
    p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('console: '+m.text())});
    await p.setViewport(vw);
    await p.goto('file:///home/claude/out/'+n+'.html',{waitUntil:'load'});
    await new Promise(r=>setTimeout(r,500));
    const res=await p.evaluate(async ()=>{
      const out={};
      for (const t of ['intro','builds','route','grind','opt','money']){
        setTab(t); await new Promise(r=>setTimeout(r,50));
        const el = t==='route'? document.getElementById('main') : document.getElementById(t);
        out[t]={len:el.innerText.length, h2:[...el.querySelectorAll('h2')].length, overflow: document.documentElement.scrollWidth > innerWidth+1};
      }
      // builds: click through brackets
      setTab('builds'); let bad=[];
      for (let i=0;i<BUILD.br.length;i++){ bState.br=i; renderGear(); const imgs=[...document.querySelectorAll('#bgear img')].filter(x=>!x.getAttribute('src')); if(imgs.length) bad.push(i); }
      for (const tb of BUILD.tables){ bState.tb=tb.k; renderBTable(); }
      out.buildsBad=bad;
      // route hints
      setTab('route'); let hints=0; for (let i=0;i<S.length;i++){ if (grindHint(i)) hints++; }
      out.hints=hints;
      go(19); out.hintShown=!!document.querySelector('.ghint');
      return out;
    });
    console.log(n, vw.width, JSON.stringify(res), errs.length?'ERRS '+JSON.stringify(errs.slice(0,5)):'ok');
    if (shots){
      for (const t of ['grind','builds','intro']){
        await p.evaluate(t=>setTab(t),t); await new Promise(r=>setTimeout(r,300));
        await p.screenshot({path:`/home/claude/out/shot_${n}_${t}_${vw.width}.png`, fullPage: t!=='intro'});
      }
      await p.evaluate(()=>{setTab('route'); go(19);}); await new Promise(r=>setTimeout(r,300));
      await p.screenshot({path:`/home/claude/out/shot_${n}_route_${vw.width}.png`});
    }
    await p.close();
  }
}
await b.close();
