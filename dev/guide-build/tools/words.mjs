import puppeteer from 'puppeteer-core';
const exe='/home/claude/tools/chrome-headless-shell/linux-155.0.8059.84/chrome-headless-shell-linux64/chrome-headless-shell';
const b=await puppeteer.launch({executablePath:exe,args:['--no-sandbox']});
for (const n of ['bandit','assassin','mage']){
  const p=await b.newPage(); await p.goto('file:///home/claude/out/'+n+'.html');
  const r=await p.evaluate(async()=>{
    const hits=[];
    const scan=(tag)=>{ const t=document.body.innerText; for (const m of t.matchAll(/.{0,40}(grind|Grind| chain|ATK 19\b|27,600|22,000|Wooden Wand \(M.ATK 27)/g)) hits.push(tag+': '+m[0].replace(/\n/g,' ')); };
    for (const t of ['intro','builds','grind','opt','money']){ setTab(t); await new Promise(r=>setTimeout(r,30)); scan(t); }
    setTab('route');
    for (let i=0;i<S.length;i++){ go(i); scan('step'+(i+1)); }
    for (const q of SQ){ openSq(q.id); scan('sq '+q.id); }
    return [...new Set(hits)];
  });
  console.log('=====',n,r.length); r.forEach(x=>console.log('  ',x));
}
await b.close();
