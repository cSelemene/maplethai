import { supabase } from './supabase-client.js?v=1e63dbc72a';
import { money, date, rpc } from './payment-common.js?v=3b8a17f7a6';
const status = document.getElementById('account-credit-status'),
  box = document.getElementById('account-credit-history');
let generation = 0;
const kinds = {
  reserve: 'ใช้ / กันเครดิตสำหรับรายการ',
  release: 'คืนเครดิตที่กันไว้',
  transfer: 'รับยอดโอนที่ตรวจสอบแล้ว',
  purchase: 'หักเครดิตชำระสินค้า'
};
async function refresh() {
  if (!status || !box) return;
  const ticket = ++generation;
  box.replaceChildren();
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (ticket !== generation) return;
    if (!user) {
      status.textContent = 'เข้าสู่ระบบเพื่อดูเครดิต';
      return;
    }
    const balance = await rpc('credit_summary');
    const { data, error } = await supabase
      .from('credit_ledger')
      .select('kind,delta_cents,balance_after_cents,created_at')
      .eq('user_id', user.id)
      .order('id', { ascending: false })
      .limit(20);
    if (error) throw error;
    if (ticket !== generation) return;
    status.textContent =
      'ใช้ได้ ' +
      money(balance.available_cents / 100) +
      (balance.reserved_cents ? ' · กันไว้สำหรับรายการที่ค้าง ' + money(balance.reserved_cents / 100) : '');
    for (const row of data) {
      const p = document.createElement('p');
      p.textContent =
        date(row.created_at) +
        ' · ' +
        (kinds[row.kind] || row.kind) +
        ' · ' +
        (row.delta_cents > 0 ? '+' : '−') +
        money(Math.abs(row.delta_cents) / 100);
      box.append(p);
    }
  } catch {
    if (ticket === generation) status.textContent = 'โหลดเครดิตไม่สำเร็จ กรุณาโหลดหน้าใหม่';
  }
}
supabase.auth.onAuthStateChange(() => setTimeout(refresh, 0));
document.getElementById('refresh-orders')?.addEventListener('click', refresh);
refresh();
