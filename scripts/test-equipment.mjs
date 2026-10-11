import assert from 'node:assert/strict';
import {equipmentAt,PLANS} from '../equipment-plan.js';
import {ITEMS} from '../equipment-data.js';
for(const [guide,tiers] of Object.entries(PLANS))for(const t of tiers)for(const id of t.items){assert.ok(ITEMS[id],`${guide}: ${id}`);assert.ok(ITEMS[id].level<=t.level)}
const ids=(g,l,s)=>equipmentAt(g,l,s).current.map(x=>x.id);
assert.ok(ids('bandit',25,'male').includes(987));assert.ok(!ids('bandit',25,'male').includes(1009));
assert.ok(ids('bandit',25,'female').includes(1020));assert.ok(!ids('bandit',25,'female').includes(987));
assert.equal(ITEMS[1020].stats.LUK,2);assert.equal(ITEMS[1009].stats.LUK,1);
assert.ok(ids('bandit',25,'male').includes(566));assert.ok(!ids('bandit',25,'male').includes(569));
assert.ok(!equipmentAt('assassin',50).current.some(x=>x.slot==='Shield'));
for(const gender of ['male','female'])for(let level=1;level<=50;level++)for(const guide of Object.keys(PLANS)){
 const gear=equipmentAt(guide,level,gender).current;assert.ok(gear.every(x=>x.level<=level&&(x.gender==='any'||x.gender===gender)));
 if(gear.some(x=>x.slot==='Overall'))assert.ok(!gear.some(x=>['Top','Bottom'].includes(x.slot)));
}
assert.equal(equipmentAt('mage',25,'female').current.find(x=>x.slot==='Wand').stats['M.ATK'],48);
assert.ok(ids('mage',40,'male').includes(654));assert.ok(ids('bandit',50,'male').includes(1065));
console.log('Equipment data, unlock levels, genders, retained upgrades and slots passed');
if(!process.env.CHROME_BIN)process.exit(0);
const {default:puppeteer}=await import('puppeteer-core');
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox']});
try{for(const guide of Object.keys(PLANS)){
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:390,height:844});
 await page.goto('http://127.0.0.1:8765/');
 await page.evaluate(guide=>{
  document.head.innerHTML='<link rel="stylesheet" href="equipment-guide.css">';
  document.body.innerHTML='<div id="main"></div><button id="next">Next</button>';
  window.originalState={i:0,done:{}};window.renderTest=()=>{document.getElementById('main').innerHTML='<article class="card"><div class="card-head"><span class="lv">Lv.'+(window.originalState.i?40:25)+'</span><h2>Route</h2></div><input id="check" type="checkbox"><div id="map">Original NPC markers</div></article>';document.getElementById('check').onchange=e=>{window.originalState.done.a=e.target.checked}};
  window.renderTest();document.getElementById('next').onclick=()=>{window.originalState.i++;window.renderTest()};
  const script=document.createElement('script');script.type='module';script.dataset.equipmentGuide=guide;script.src='equipment-guide.js';document.body.append(script);
 },guide);
 await page.waitForSelector('.equipment-guide');
 assert.equal(await page.$eval('.equipment-level',x=>x.value),'25');
 await page.click('#check');await page.select('.equipment-gender','female');
 assert.equal(await page.evaluate(()=>window.originalState.done.a),true);
 assert.equal(await page.$eval('#map',x=>x.textContent),'Original NPC markers');
 assert.equal(await page.$$eval('.equipment-guide',x=>x.length),1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.click('#next');await page.waitForFunction(()=>document.querySelector('.equipment-level')?.value==='40');
 assert.equal(await page.evaluate(()=>window.originalState.i),1);assert.equal(await page.$$eval('.equipment-guide',x=>x.length),1);
 assert.deepEqual(errors,[]);await page.close();
}console.log('All three guide mounts, route rerender, gender, checklist, map and mobile passed')}finally{await browser.close()}
