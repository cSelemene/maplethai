// Builds a throwaway database from supabase/migrations + seed, then runs every
// rolled-back SQL test against it. Needs psql and a Postgres 17 server.
// Usage: PGHOST=... PGPORT=... PGUSER=postgres node scripts/test-schema.mjs
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

const db='maplethai_schema_test';
const psql=(args,input)=>execFileSync('psql',['-v','ON_ERROR_STOP=1','-q','-X',...args],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']});

psql(['-d','postgres','-c',`drop database if exists ${db}`,'-c',`create database ${db}`]);
const run=(file,transform=s=>s)=>psql(['-d',db,'-f','-'],transform(readFileSync(file,'utf8')));

run('supabase/tests/supabase-stubs.sql');
for(const f of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())
 run(join('supabase/migrations',f),s=>s.replace(/^create extension if not exists supabase_vault.*$/m,'-- (vault is stubbed in tests)'));
run('supabase/seed.sql');
run('supabase/tests/fixtures.sql');

const q=v=>v===null||v===undefined||v===''?'null':"'"+String(v).replace(/'/g,"''")+"'";
const items=JSON.parse(readFileSync('assets/market/items.json','utf8'));
psql(['-d',db,'-f','-'],'insert into public.items(id,name,type,subtype,lv) values\n'+items.map(i=>`(${Number(i.id)},${q(i.name)},${q(i.type)},${q(i.subtype)},${i.lv===''||i.lv==null?'null':Number(i.lv)})`).join(',\n')+';');

const tests=[...readdirSync('scripts').filter(f=>/^test-.*\.sql$/.test(f)).map(f=>join('scripts',f))].sort();
let failed=0;
for(const t of tests){
 try{const out=psql(['-d',db,'-tA','-f',t]);console.log('ok  ',t,out.trim().split('\n').filter(l=>/PASS/.test(l)).join(' | '));}
 catch(e){failed++;console.log('FAIL',t,'\n',String(e.stderr||e.message).trim().split('\n').slice(0,4).join('\n '));}
}
psql(['-d','postgres','-c',`drop database ${db}`]);
console.log(`${tests.length-failed}/${tests.length} SQL test files passed`);
process.exit(failed?1:0);
