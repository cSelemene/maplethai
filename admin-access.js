import { supabase, readAccount } from './supabase-client.js?v=16f4430b96';
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
  $('grant-submit').disabled = true;
  try {
    const { error } = await supabase.rpc('admin_grant', {
      p_email: $('customer-email').value.trim(),
      p_product: $('product').value
    });
    if (error) throw error;
    $('status').textContent = 'ให้สิทธิ์สำเร็จ ลูกค้ากดตรวจสอบสิทธิ์อีกครั้งในหน้าบัญชีได้';
    $('customer-email').value = '';
  } catch (error) {
    $('status').textContent = error.message || 'ให้สิทธิ์ไม่สำเร็จ';
  } finally {
    $('grant-submit').disabled = false;
  }
};
supabase.auth.onAuthStateChange(() => setTimeout(verify, 0));
verify();
