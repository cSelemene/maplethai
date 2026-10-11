import {supabase} from './supabase-client.js';
const $=id=>document.getElementById(id);
const callbackUrl=new URL('./auth.html',location.href).href;
const siteRoot=new URL('./',location.href);
const nextKey='maplethai.auth.next.v1';
const knownFiles=new Set([
 'index.html','home.html','bandit-artifact-preview-v3.html','bandit-route-original.html',
 'guide-preview.html','my-guides.html','premium-guide.html','admin.html','auth.html','checkout.html','admin-payments.html'
]);
let mode='login',recovering=false,working=false,showing=false;

function validatedNext(value){
 if(typeof value!=='string'||!value||value.length>800)return null;
 try{
   const url=new URL(value,siteRoot);
   if(url.origin!==location.origin||!url.pathname.startsWith(siteRoot.pathname))return null;
   const sub=url.pathname.slice(siteRoot.pathname.length);
   if(sub&&!knownFiles.has(sub))return null;
   if(sub==='auth.html')return null;
   if(url.username||url.password)return null;
   return url.pathname+url.search+url.hash;
 }catch{return null}
}
function readNext(){
 try{return validatedNext(sessionStorage.getItem(nextKey))}catch{return null}
}
function setNext(value){
 const safe=validatedNext(value);
 if(!safe)return;
 try{sessionStorage.setItem(nextKey,safe)}catch{}
}
function clearNext(){try{sessionStorage.removeItem(nextKey)}catch{}}
const requestNext=new URLSearchParams(location.search).get('next');
if(requestNext)setNext(requestNext);

function say(text='',kind=''){
 $('message').textContent=text;$('message').className='message'+(kind?' '+kind:'');
}
function setMode(next){
 mode=next;
 $('login-tab').setAttribute('aria-selected',String(mode==='login'));
 $('signup-tab').setAttribute('aria-selected',String(mode==='signup'));
 $('submit').textContent=mode==='login'?'เข้าสู่ระบบ':'สมัครสมาชิก';
 $('password').autocomplete=mode==='login'?'current-password':'new-password';
 $('password').minLength=mode==='login'?1:12;
 $('password-hint').classList.toggle('hidden',mode!=='signup');
 $('forgot').hidden=mode!=='login';
 say('');
}
function busy(value){
 working=value;
 for(const id of ['submit','forgot','google-login','logout','recovery-submit'])$(id).disabled=value;
}
function setView(which){
 for(const k of ['guest','account','recovery'])$(k).classList.toggle('hidden',k!==which);
}
function finishedLogin(){
 const to=readNext();
 if(!to)return false;
 clearNext();
 location.replace(to);
 return true;
}
async function display(){
 if(recovering||showing)return;
 showing=true;
 try{
   const {data,error}=await supabase.auth.getUser();
   if(error&&error.name!=='AuthSessionMissingError')throw error;
   const user=data?.user;
   if(user){
     if(finishedLogin())return;
     $('account-email').textContent=user.email||'บัญชีที่เข้าสู่ระบบ';
     $('account-next').href='./index.html';
     setView('account');
     say('');
   }else{
     setView('guest');
   }
 }catch(error){
   setView('guest');say('ยังตรวจสอบสถานะบัญชีไม่ได้ กรุณาลองอีกครั้ง','error');
 }finally{showing=false}
}

$('login-tab').addEventListener('click',()=>setMode('login'));
$('signup-tab').addEventListener('click',()=>setMode('signup'));
$('google-login').addEventListener('click',async()=>{
 if(working)return;
 busy(true);say('กำลังเชื่อมต่อ Google…');
 try{
   const {error}=await supabase.auth.signInWithOAuth({
     provider:'google',
     options:{redirectTo:callbackUrl,queryParams:{prompt:'select_account'}}
   });
   if(error)throw error;
 }catch(error){
   say(error?.message||'ไม่สามารถเริ่มเข้าสู่ระบบด้วย Google ได้ กรุณาลองอีกครั้ง','error');
 }finally{busy(false)}
});
$('auth-form').addEventListener('submit',async e=>{
 e.preventDefault();if(working)return;
 const email=$('email').value.trim();
 const password=$('password').value;
 if(mode==='signup'&&password.length<12){say('ใช้รหัสผ่านอย่างน้อย 12 ตัวอักษร','error');return}
 busy(true);say('');
 try{
   if(mode==='signup'){
     const {data,error}=await supabase.auth.signUp({
       email,password,options:{emailRedirectTo:callbackUrl}
     });
     if(error)throw error;
     if(data.session){await display();if(!$('account').classList.contains('hidden'))say('สมัครสมาชิกเรียบร้อยแล้ว','success')}
     else{say('หากอีเมลนี้สมัครได้ ระบบจะส่งลิงก์ยืนยันไปให้ กรุณาตรวจสอบกล่องจดหมาย','success')}
   }else{
     const {error}=await supabase.auth.signInWithPassword({email,password});
     if(error)throw error;
     await display();
   }
 }catch(error){say(error?.message||'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล','error')}
 finally{busy(false)}
});
$('forgot').addEventListener('click',async()=>{
 if(working)return;
 const email=$('email').value.trim();
 if(!email){say('กรุณากรอกอีเมลก่อนกดลืมรหัสผ่าน','error');$('email').focus();return}
 busy(true);say('');
 try{
   const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:callbackUrl});
   if(error)throw error;
   say('หากอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่','success');
 }catch(error){say(error?.message||'ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่','error')}
 finally{busy(false)}
});
$('logout').addEventListener('click',async()=>{
 if(working)return;
 busy(true);clearNext();
 try{
   const {error}=await supabase.auth.signOut();
   if(error)throw error;
   setMode('login');setView('guest');say('ออกจากระบบเรียบร้อยแล้ว','success');
 }catch(error){say(error?.message||'ไม่สามารถออกจากระบบได้','error')}
 finally{busy(false)}
});
$('recovery-form').addEventListener('submit',async e=>{
 e.preventDefault();if(working)return;
 const password=$('new-password').value;
 if(password.length<12){say('รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร','error');return}
 busy(true);say('');
 try{
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw error;
   recovering=false;setView('account');
   await display();say('ตั้งรหัสผ่านใหม่สำเร็จ','success');
 }catch(error){say(error?.message||'ไม่สามารถตั้งรหัสผ่านใหม่ได้','error')}
 finally{busy(false)}
});
// Avoid calling awaited Supabase auth methods synchronously inside the auth callback.
supabase.auth.onAuthStateChange(event=>{
 if(event==='PASSWORD_RECOVERY'){
   recovering=true;setView('recovery');say('ตั้งรหัสผ่านใหม่เพื่อใช้งานบัญชีต่อ');
 }else if(!recovering && ['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)){
   setTimeout(()=>display(),0);
 }
});
setMode('login');
const query=new URLSearchParams(location.search);
const fragment=new URLSearchParams(location.hash.replace(/^#/,''));
const callbackError=query.get('error_description')||fragment.get('error_description');
if(callbackError){
 const errorCode=query.get('error_code')||query.get('error')||'';
 say(/provider.*not.*enabled|unsupported_provider|provider_disabled/i.test(errorCode+' '+callbackError)
  ? 'Google Login ยังไม่ได้เปิดใช้งานใน Supabase กรุณาติดต่อผู้ดูแล MapleThai'
  : 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ: '+callbackError,'error');
}
display().catch(()=>say('ไม่สามารถเชื่อมต่อระบบสมาชิกได้ กรุณาลองใหม่','error'));
