import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu']});
const base='http://127.0.0.1:8765';
const stub=`
const auth={
 getUser:async()=>({data:{user:window.__TEST_AUTH.user},error:null}),
 onAuthStateChange:(fn)=>{window.__TEST_AUTH.listener=fn;setTimeout(()=>fn('INITIAL_SESSION',{user:window.__TEST_AUTH.user}),0);return {data:{subscription:{unsubscribe(){}}}}},
 signInWithOAuth:async options=>{window.__TEST_AUTH.calls.push({method:'google',options});return {data:{url:'https://accounts.google.com/mock'},error:null}},
 signUp:async options=>{window.__TEST_AUTH.calls.push({method:'signup',options});return {data:{user:{id:'test'},session:null},error:null}},
 signInWithPassword:async options=>{window.__TEST_AUTH.calls.push({method:'login',options});window.__TEST_AUTH.user={id:'test-user',email:options.email};window.__TEST_AUTH.listener?.('SIGNED_IN',{user:window.__TEST_AUTH.user});return {error:null}},
 resetPasswordForEmail:async(email,options)=>{window.__TEST_AUTH.calls.push({method:'forgot',email,options});return {error:null}},
 signOut:async()=>{window.__TEST_AUTH.user=null;window.__TEST_AUTH.listener?.('SIGNED_OUT',null);return {error:null}},
 updateUser:async()=>({error:null})
};
export const createClient=()=>({auth,rpc:async()=>({data:null,error:{message:'Mock: no entitlements'}})});
`;
async function createPage(startUser=null){
 const page=await browser.newPage();
 await page.evaluateOnNewDocument(user=>{window.__TEST_AUTH={user,calls:[],listener:null}},startUser);
 await page.setRequestInterception(true);
 page.on('request',async req=>{
   if(req.url().startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')){
     return req.respond({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*','cache-control':'no-store'},body:stub})
   }
   return req.continue();
 });
 return page;
}
async function waitFor(fn,ms=3500){await fn();}
try{
 const p=await createPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/auth.html',{waitUntil:'networkidle2'});
 assert(await p.$('#google-login'),'Google button missing');
 assert(await p.$eval('#google-login',e=>getComputedStyle(e).display!=='none'),'Google button not visible');
 assert(await p.$eval('#guest',e=>!e.classList.contains('hidden')),'Login form not shown');
 await p.click('#google-login');
 const oauth=await p.evaluate(()=>window.__TEST_AUTH.calls.find(x=>x.method==='google'));
 assert(oauth.options.provider==='google','OAuth provider is not Google');
 assert(oauth.options.options.redirectTo===base+'/auth.html','OAuth callback must be allowed exact auth URL');
 console.log('PASS: Google button starts Supabase OAuth, correct callback URL');
 await p.click('#signup-tab');
 await p.type('#email','new-user@example.com');
 await p.type('#password','securePassword_2026');
 await p.click('#submit');
 const signup=await p.evaluate(()=>window.__TEST_AUTH.calls.find(x=>x.method==='signup'));
 assert(signup.options.email==='new-user@example.com'&&signup.options.options.emailRedirectTo===base+'/auth.html','Signup wrong callback');
 assert((await p.$eval('#message',e=>e.textContent)).includes('อีเมล'),'Signup confirmation message missing');
 console.log('PASS: email signup and confirmation callback');
 await p.click('#login-tab');
 await p.click('#forgot');
 const forgot=await p.evaluate(()=>window.__TEST_AUTH.calls.find(x=>x.method==='forgot'));
 assert(forgot.email==='new-user@example.com'&&forgot.options.redirectTo===base+'/auth.html','Password recovery wrong callback');
 console.log('PASS: reset password request');
 await p.click('#submit');
 await p.waitForFunction(()=>!document.querySelector('#account').classList.contains('hidden'));
 assert((await p.$eval('#account-email',e=>e.textContent))==='new-user@example.com','Signed-in email not rendered');
 await p.click('#logout');
 await p.waitForFunction(()=>!document.querySelector('#guest').classList.contains('hidden'));
 console.log('PASS: email login, account view and signout');
 assert(!errors.length,'JS errors: '+errors.join(', '));
 await p.setViewport({width:390,height:844});
 assert(await p.$eval('body',e=>document.documentElement.scrollWidth<=innerWidth+2),'Horizontal scroll on mobile');
 console.log('PASS: mobile auth UI');

 const safe=await createPage();
 await safe.goto(base+'/auth.html?next='+encodeURIComponent('premium-guide.html?guide=bandit'),{waitUntil:'networkidle2'});
 await safe.type('#email','owner@example.com');
 await safe.type('#password','password_2026');
 await Promise.all([safe.waitForNavigation({waitUntil:'domcontentloaded'}),safe.click('#submit')]);
 assert(safe.url().includes('/premium-guide.html?guide=bandit'),'Safe post-login return to guide failed: '+safe.url());
 console.log('PASS: secure post-login return to premium guide');

 const unsafe=await createPage();
 await unsafe.goto(base+'/auth.html?next='+encodeURIComponent('https://evil.example/steal'),{waitUntil:'networkidle2'});
 await unsafe.type('#email','owner@example.com');
 await unsafe.type('#password','password_2026');
 await unsafe.click('#submit');
 await unsafe.waitForFunction(()=>!document.querySelector('#account').classList.contains('hidden'));
 assert(new URL(unsafe.url()).pathname==='/auth.html','External open-redirect was allowed');
 console.log('PASS: malicious external return URL refused');

 const existing=await createPage({id:'existing',email:'existing@example.com'});
 await existing.goto(base+'/auth.html',{waitUntil:'networkidle2'});
 await existing.waitForFunction(()=>!document.querySelector('#account').classList.contains('hidden'));
 assert((await existing.$eval('#account-email',e=>e.textContent))==='existing@example.com','Existing OAuth session not detected');
 console.log('PASS: already signed-in OAuth/email session');
}finally{await browser.close()}
