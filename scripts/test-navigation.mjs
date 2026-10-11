import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile('navigation/navigation-data.mjs','utf8');
const client=await fs.readFile('supabase-client.js','utf8');
async function scenario(user,account,params='',rpcError=false){
 let listener,calls=0;const context=vm.createContext({URLSearchParams,location:{search:params},Date,console});
 const fake={auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:fn=>listener=fn},rpc:async(name)=>{if(name==='sync_account')return {data:account,error:null};calls++;return {data:{mapData:{maps:[{id:'a'}]}},error:rpcError?{}:null};}};
 const sdk=new vm.SyntheticModule(['createClient'],function(){this.setExport('createClient',()=>fake);},{context});
 const config=new vm.SyntheticModule(['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'],function(){this.setExport('SUPABASE_URL','test');this.setExport('SUPABASE_PUBLISHABLE_KEY','test');},{context});
 const clientModule=new vm.SourceTextModule(client,{context});await clientModule.link(spec=>spec.startsWith('https:')?sdk:config);
 const module=new vm.SourceTextModule(source,{context});await module.link(()=>clientModule);await module.evaluate();return {module,calls:()=>calls,logout:()=>listener('SIGNED_OUT',null)};
}
const guest=await scenario(null,{});await assert.rejects(()=>guest.module.namespace.getBundle());assert.equal(guest.calls(),0);
const unpaid=await scenario({id:'buyer'},{entitlements:[]});await assert.rejects(()=>unpaid.module.namespace.getBundle());assert.equal(unpaid.calls(),0);
const expired=await scenario({id:'buyer'},{entitlements:[{product:'guide_bandit',expires_at:'2000-01-01'}]});await assert.rejects(()=>expired.module.namespace.getBundle());
const buyer=await scenario({id:'buyer'},{entitlements:[{product:'guide_bandit',expires_at:null}]},'?guide=bandit');assert.equal((await buyer.module.namespace.getBundle()).mapData.maps.length,1);await buyer.module.namespace.getBundle();assert.equal(buyer.calls(),1);let cleared=false;buyer.module.namespace.onAccessChange(()=>cleared=true);buyer.logout();assert.ok(cleared);await assert.rejects(()=>buyer.module.namespace.getBundle());
const wrongGuide=await scenario({id:'buyer'},{entitlements:[{product:'guide_bandit',expires_at:null}]},'?guide=mage');await assert.rejects(()=>wrongGuide.module.namespace.getBundle());assert.equal(wrongGuide.calls(),0);
const denied=await scenario({id:'buyer'},{entitlements:[{product:'guide_bandit',expires_at:null}]},'',true);await assert.rejects(()=>denied.module.namespace.getBundle());
const html=await fs.readFile('navigation/index.html','utf8');assert.ok(!html.includes('id="access"'));assert.ok(html.includes('id="planner" hidden'));assert.ok(!source.includes('data/maps.json'));assert.ok(!(await fs.readdir('navigation/data')).includes('maps.json'));
console.log('Navigation access: guest, unpaid, expired, buyer, wrong guide, server denial, sign-out, cached RPC and no public dataset passed.');
