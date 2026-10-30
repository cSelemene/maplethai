import { supabase, GUIDES, hasGuide, readAccount } from './supabase-client.js?v=cb12a9f448';
const $ = id => document.getElementById(id);
let generation = 0;
async function refresh() {
  const ticket = ++generation;
  $('my-guides').replaceChildren();
  $('admin-link').hidden = true;
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();
    if (error || !user) {
      $('rights-status').textContent = 'เข้าสู่ระบบเพื่อดูสิทธิ์ไกด์';
      return;
    }
    const account = await readAccount();
    if (ticket !== generation) return;
    const pack = account.entitlements?.find(e => e.product === 'pack_all');
    if (pack) {
      const row = document.createElement('p');
      row.dataset.guide = 'pack_all';
      row.textContent =
        pack.source === 'domain'
          ? 'แพ็กทุกอาชีพ + ตลาดถาวร · สิทธิ์จากอีเมลสถาบันของคุณ ไม่มีวันหมดอายุ'
          : 'แพ็กทุกอาชีพ + ตลาดถาวร · ใช้งานได้ไม่มีวันหมดอายุ';
      $('my-guides').append(row);
    }
    for (const [id, name] of Object.entries(GUIDES)) {
      if (!hasGuide(account, id)) continue;
      const row = document.createElement('p');
      row.dataset.guide = id;
      row.textContent = name + ' · ใช้งานได้';
      $('my-guides').append(row);
    }
    $('rights-status').textContent = $('my-guides').children.length
      ? 'สิทธิ์ที่เปิดใช้งานอยู่'
      : 'ยังไม่มีสิทธิ์ไกด์ฉบับเต็ม';
    $('admin-link').hidden = !account.is_admin;
  } catch {
    if (ticket === generation) $('rights-status').textContent = 'ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง';
  }
}
$('refresh-rights').onclick = refresh;
$('redeem-form').onsubmit = async e => {
  e.preventDefault();
  $('redeem-submit').disabled = true;
  $('redeem-status').textContent = 'กำลังตรวจสอบโค้ด…';
  try {
    const { error } = await supabase.rpc('redeem_code', { p_code: $('redeem-code').value.trim() });
    if (error) throw error;
    $('redeem-code').value = '';
    $('redeem-status').textContent = 'ปลดล็อกสำเร็จ';
    await refresh();
  } catch (error) {
    $('redeem-status').textContent = error.message || 'ใช้โค้ดไม่สำเร็จ';
  } finally {
    $('redeem-submit').disabled = false;
  }
};
supabase.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();
