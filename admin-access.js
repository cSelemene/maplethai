import { supabase, readAccount } from './supabase-client.js?v=ffa6b49ed5';
const $ = id => document.getElementById(id);
let saving = false,
  saleKey = null,
  saleSignature = '';
function updateSaleFields() {
  const grant = $('access-action').value === 'grant';
  $('manual-sale-option').hidden = !grant;
  if (!grant) $('manual-sale').checked = false;
  const on = grant && $('manual-sale').checked;
  $('manual-sale-fields').hidden = !on;
  $('manual-sale-amount').required = on;
  $('manual-sale-amount').disabled = $('manual-sale-date').disabled = !on;
  $('grant-submit').textContent = on ? 'เพิ่มสิทธิ์และบันทึกยอดขาย' : 'บันทึกสิทธิ์สินค้านี้';
}
$('manual-sale').onchange = updateSaleFields;
$('access-action').onchange = updateSaleFields;
updateSaleFields();
function thaiTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value + ':00+07:00');
  if (!Number.isFinite(parsed.getTime())) throw Error('วันเวลาที่รับเงินไม่ถูกต้อง');
  return parsed.toISOString();
}
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
  if (saving) return;
  if (
    $('access-action').value === 'suspend' &&
    !window.confirm(
      'ระงับสิทธิ์ ' + $('product').selectedOptions[0].textContent + ' ของ ' + $('customer-email').value + '?'
    )
  )
    return;
  saving = true;
  $('grant-submit').disabled = true;
  try {
    const external = $('access-action').value === 'grant' && $('manual-sale').checked;
    if (external) {
      const amount = Number($('manual-sale-amount').value);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000)
        throw Error('กรอกราคาขายเป็นจำนวนเต็มตั้งแต่ 1 ถึง 1,000,000 บาท');
      const args = {
        p_email: $('customer-email').value.trim(),
        p_product: $('product').value,
        p_amount: amount,
        p_note: $('access-note').value.trim(),
        p_paid_at: thaiTimestamp($('manual-sale-date').value)
      };
      const signature = JSON.stringify(args);
      if (!saleKey || saleSignature !== signature) {
        saleKey = crypto.randomUUID();
        saleSignature = signature;
      }
      const { data, error } = await supabase.rpc('admin_record_manual_sale', { ...args, p_request: saleKey });
      if (error) throw error;
      $('status').textContent =
        (data.already_recorded ? 'รายการนี้บันทึกไว้แล้ว' : 'เพิ่มสิทธิ์และบันทึกยอดขายแล้ว') +
        ' · #' +
        data.id +
        ' · ' +
        amount +
        ' บาท';
      saleKey = null;
      saleSignature = '';
      $('manual-sale').checked = false;
      $('manual-sale-amount').value = '';
      $('manual-sale-date').value = '';
      updateSaleFields();
    } else {
      const { error } = await supabase.rpc('admin_set_customer_access', {
        p_email: $('customer-email').value.trim(),
        p_product: $('product').value,
        p_grant: $('access-action').value === 'grant',
        p_note: $('access-note').value.trim()
      });
      if (error) throw error;
      $('status').textContent = 'บันทึกสิทธิ์แล้ว ลูกค้ารีเฟรชหน้าเว็บเพื่อรับสถานะล่าสุด';
    }
    try {
      await lookup();
    } catch {
      $('status').textContent += ' · โหลดสิทธิ์ล่าสุดไม่สำเร็จ กดตรวจสิทธิ์อีกครั้งได้';
    }
  } catch (error) {
    $('status').textContent = error.message || 'ให้สิทธิ์ไม่สำเร็จ';
  } finally {
    saving = false;
    $('grant-submit').disabled = false;
  }
};
supabase.auth.onAuthStateChange(() => setTimeout(verify, 0));
verify();

async function lookup() {
  const { data, error } = await supabase.rpc('admin_customer_access', {
    p_email: $('customer-email').value.trim()
  });
  if (error) throw error;
  $('customer-access').replaceChildren();
  for (const p of data) {
    const row = document.createElement('p');
    row.textContent =
      p.name +
      ' · ' +
      (p.has_access ? 'ใช้งานได้' : 'ไม่มีสิทธิ์ / ระงับ / หมดอายุ') +
      (p.expires_at ? ' · ถึง ' + new Date(p.expires_at).toLocaleString('th-TH') : '');
    $('customer-access').append(row);
  }
}
$('lookup-access').onclick = async () => {
  try {
    await lookup();
  } catch (e) {
    $('status').textContent = e.message;
  }
};
