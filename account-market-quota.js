import { supabase, readAccount } from './supabase-client.js?v=0922a5286a';
const node = document.getElementById('account-market-quota');
let generation = 0;
async function refresh() {
  const ticket = ++generation;
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (ticket !== generation) return;
    if (!user) {
      node.textContent = '';
      return;
    }
    await readAccount();
    const { data: q, error } = await supabase.rpc('marketplace_contact_quota');
    if (error) throw error;
    if (ticket !== generation) return;
    node.textContent =
      (q.unlimited
        ? 'สมาชิกตลาด · เปิดดูได้ไม่จำกัด'
        : 'ฟรีรายเดือนเหลือ ' + (q.free_remaining ?? q.remaining) + ' / 10 ครั้ง') +
      ' · โบนัสสะสม ' +
      (q.bonus_remaining ?? 0) +
      ' ครั้ง';
  } catch {
    if (ticket === generation) node.textContent = 'ยังโหลดสิทธิ์ดูตลาดไม่ได้ กรุณากดตรวจสอบสิทธิ์อีกครั้ง';
  }
}
document.getElementById('refresh-rights')?.addEventListener('click', refresh);
supabase.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();
