import {supabase,GUIDES,hasGuide,readAccount} from './supabase-client.js';
const section=document.getElementById('member-section');let generation=0;
async function refresh(){const ticket=++generation;document.getElementById('member-guides')?.remove();
 try{const {data:{user}}=await supabase.auth.getUser();const accountLink=document.querySelector('header a[href="./auth.html"]');if(accountLink)accountLink.textContent=user?'บัญชี / ไกด์ของฉัน':'เข้าสู่ระบบ / สมัครสมาชิก';if(!user)return;const account=await readAccount();if(ticket!==generation)return;
 const box=document.createElement('div');box.id='member-guides';const title=document.createElement('p');title.textContent='เข้าสู่ระบบแล้ว • ไกด์ที่อ่านได้';box.append(title);let count=0;for(const [id,name] of Object.entries(GUIDES)){if(!hasGuide(account,id))continue;count++;const a=document.createElement('a');a.className='button';a.href='./premium-guide.html?guide='+id;a.textContent='อ่าน '+name+'';box.append(a)}if(!count){title.textContent='เข้าสู่ระบบแล้ว • ยังไม่มีสิทธิ์ไกด์ฉบับเต็ม เลือกซื้อไกด์หรือใช้โค้ดได้ในหน้าบัญชี'}section.append(box);
 }catch{ /* Keep the public homepage usable when account checks fail. */ }
}
supabase.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();
