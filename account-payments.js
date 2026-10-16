import { supabase } from './supabase-client.js?v=16f4430b96';
import { myOrders, showHistory } from './payment-common.js?v=1d4c2d5add';
const box = document.getElementById('account-orders');
let generation = 0;
async function refresh() {
  const ticket = ++generation;
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      box.replaceChildren();
      return;
    }
    const orders = await myOrders();
    const { data, error } = await supabase.from('products').select('id,name');
    if (error) throw error;
    if (ticket !== generation) return;
    showHistory(box, orders, Object.fromEntries(data.map(p => [p.id, p.name])));
  } catch {
    if (ticket === generation) box.textContent = 'โหลดประวัติไม่สำเร็จ กรุณาลองอีกครั้ง';
  }
}
document.getElementById('refresh-orders').onclick = refresh;
supabase.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();
