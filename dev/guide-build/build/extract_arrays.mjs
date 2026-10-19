import fs from 'fs';
const out={};
for (const [n,names] of [['bandit',['sk']],['assassin',['sk','dg']],['mage',['sp1','sp2','builds','wd']]]){
  const src=fs.readFileSync(`/home/claude/g/${n}_introfn.js`,'utf8');
  out[n]={};
  for (const v of names){
    const m=src.match(new RegExp(`const ${v} = (\\[[\\s\\S]*?\\n  \\]|\\[.*?\\]);`));
    if(!m) throw new Error(n+v);
    out[n][v]=eval(m[1]);
  }
}
fs.writeFileSync('/home/claude/build/intro_arrays.json',JSON.stringify(out,null,1));
console.log(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([a,b])=>[a,b.length]))])));
