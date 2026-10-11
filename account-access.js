import {supabase,GUIDES,hasGuide,readAccount} from './supabase-client.js';
const $=id=>document.getElementById(id);let generation=0;
async function refresh(){const ticket=++generation; $('my-guides').replaceChildren();$('admin-link').hidden=true;
 try{const {data:{user},error}=await supabase.auth.getUser();if(error||!user){$('rights-status').textContent='เข้าสู่ระบบเพื่อดูสิทธิ์ไกด์';return}
 const account=await readAccount();if(ticket!==generation)return;
 for(const [id,name] of Object.entries(GUIDES)){const row=document.createElement('p');const link=document.createElement('a');const owns=hasGuide(account,id);link.textContent=name+(owns?' — อ่านฉบับเต็ม →':' — ทดลองอ่านฟรี →');link.href=owns?'./premium-guide.html?guide='+id:(id==='bandit'?'./bandit-artifact-preview-v3.html':'./guide-preview.html?guide='+id);row.append(link);$('my-guides').append(row)}
 $('rights-status').textContent='สิทธิ์แยกตามอาชีพ • หากเพิ่งได้รับสิทธิ์ ให้กดตรวจสอบอีกครั้ง';$('admin-link').hidden=!account.is_admin;
 }catch{if(ticket===generation)$('rights-status').textContent='ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง'}
}
$('refresh-rights').onclick=refresh;
$('redeem-form').onsubmit=async e=>{e.preventDefault();$('redeem-submit').disabled=true;$('redeem-status').textContent='กำลังตรวจสอบโค้ด…';try{const {error}=await supabase.rpc('redeem_code',{p_code:$('redeem-code').value.trim()});if(error)throw error;$('redeem-code').value='';$('redeem-status').textContent='ปลดล็อกสำเร็จ';await refresh()}catch(error){$('redeem-status').textContent=error.message||'ใช้โค้ดไม่สำเร็จ'}finally{$('redeem-submit').disabled=false}};
supabase.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();
