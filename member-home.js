import {supabase} from './supabase-client.js';
import {renderProfile} from './profile-ui.js';
let generation=0;
async function refresh(){
 const ticket=++generation;
 try{
  const {data:{user}}=await supabase.auth.getUser();
  if(ticket!==generation)return;
  const link=document.querySelector('header a[data-account-link]');
  if(link){link.replaceChildren();link.classList.toggle('profile-link',!!user);link.setAttribute('aria-label',user?'บัญชีของฉัน':'เข้าสู่ระบบ');if(user)renderProfile(link,user);else link.textContent='เข้าสู่ระบบ';}
  document.getElementById('member-section').hidden=!!user;
 }catch{}
}
supabase.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();
