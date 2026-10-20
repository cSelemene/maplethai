import { supabase, readAccount } from './supabase-client.js?v=ffa6b49ed5';
const $ = id => document.getElementById(id);
async function verify() {
  $('grant-form').hidden = true;
  $('login').hidden = true;
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      $('status').textContent = 'กรุณาเข้าสู่ระบบด้วยบัญชีแอดมิน';
      $('login').hidden = false;
      return;
    }
    const account = await readAccount();
    if (!account.is_admin) {
      $('status').textContent = 'บัญชีนี้ไม่มีสิทธิ์จัดการลูกค้า';
      return;
    }
    $('grant-form').hidden = false;
    $('status').textContent = 'แอดมินพร้อมจัดการสิทธิ์';
  } catch {
    $('status').textContent = 'ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองใหม่';
  }
}
$('grant-form').onsubmit = async event => {
  event.preventDefault();
  if($('access-action').value==='suspend' && !window.confirm('ระงับสิทธิ์ '+$('product').selectedOptions[0].textContent+' ของ '+$('customer-email').value+'?'))return;
  $('grant-submit').disabled = true;
  try {
    const { error } = await supabase.rpc('admin_set_customer_access', {
      p_email: $('customer-email').value.trim(),
      p_product: $('product').value,
      p_grant:$('access-action').value==='grant',
      p_note:$('access-note').value.trim()
    });
    if (error) throw error;
    $('status').textContent = 'บันทึกสิทธิ์แล้ว ลูกค้ารีเฟรชหน้าเว็บเพื่อรับสถานะล่าสุด';
    await lookup();
  } catch (error) {
    $('status').textContent = error.message || 'ให้สิทธิ์ไม่สำเร็จ';
  } finally {
    $('grant-submit').disabled = false;
  }
};
supabase.auth.onAuthStateChange(() => setTimeout(verify, 0));
verify();

async function lookup(){
 const {data,error}=await supabase.rpc('admin_customer_access',{p_email:$('customer-email').value.trim()});
 if(error)throw error;
 $('customer-access').replaceChildren();
 for(const p of data){const row=document.createElement('p');row.textContent=p.name+' · '+(p.has_access?'ใช้งานได้':'ไม่มีสิทธิ์ / ระงับ / หมดอายุ')+(p.expires_at?' · ถึง '+new Date(p.expires_at).toLocaleString('th-TH'):'');$('customer-access').append(row);}
}
$('lookup-access').onclick=async()=>{try{await lookup()}catch(e){$('status').textContent=e.message}};
