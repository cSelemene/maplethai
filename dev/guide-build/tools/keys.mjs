import puppeteer from 'puppeteer-core';
const exe='/home/claude/tools/chrome-headless-shell/linux-155.0.8059.84/chrome-headless-shell-linux64/chrome-headless-shell';
const b=await puppeteer.launch({executablePath:exe,args:['--no-sandbox']});
for (const n of ['bandit','assassin','mage']){
  const p=await b.newPage(); await p.goto('file:///home/claude/g/'+n+'.html');
  const d=await p.evaluate(()=>({MOB:Object.keys(MOB),MOBE:Object.keys(MOBE),FARM:Object.keys(FARM),MAP:Object.keys(MAP),MOB_MAPS:Object.keys(MOB_MAPS),NPC:Object.keys(NPC)}));
  console.log('=====',n); for(const[k,v] of Object.entries(d)) console.log(k,v.length,v.filter(x=>/Boar|Lorang|Clang|Florina|Burnt|Horny|Zombie Mush|Green Mush|Pason|Ant Tunnel|Beach|Look-Out/.test(x)).join(', '));
}
await b.close();
