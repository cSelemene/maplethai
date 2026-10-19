import puppeteer from 'puppeteer-core';
const exe='/home/claude/tools/chrome-headless-shell/linux-155.0.8059.84/chrome-headless-shell-linux64/chrome-headless-shell';
const b=await puppeteer.launch({executablePath:exe,args:['--no-sandbox']});
const n=process.argv[2]; const code=process.argv[3];
const p=await b.newPage(); await p.goto('file:///home/claude/out/'+n+'.html');
console.log(await p.evaluate(code));
await b.close();
