import { supabase } from './supabase-client.js?v=1e63dbc72a';
export const STATUS = {
  awaiting_slip: 'รอส่งสลิป',
  pending: 'รอตรวจสอบ',
  ok: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  cancelled: 'ยกเลิกแล้ว',
  revoked: 'เพิกถอนสิทธิ์',
  credited: 'เก็บเป็นเครดิตแล้ว'
};
export const money = n =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 }).format(n);
export const date = s => new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
export async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
export async function myOrders() {
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id,product,amount,status,created_at,review_note,recipient,amount_due_cents,credit_applied_cents,received_cents,processing_fee_cents,gift_email,referral_email'
    )
    .order('id', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}
export function showHistory(container, orders, names = {}) {
  container.replaceChildren();
  if (!orders.length) {
    container.textContent = 'ยังไม่มีรายการซื้อ';
    return;
  }
  for (const p of orders) {
    const row = document.createElement('article');
    row.className = 'history-row';
    const title = document.createElement('strong');
    title.textContent = `${names[p.product] || p.product} · ${money(p.amount)}`;
    const status = document.createElement('span');
    status.className = 'tag ' + p.status;
    status.textContent = STATUS[p.status] || p.status;
    const detail = document.createElement('p');
    detail.textContent = date(p.created_at);
    row.append(title, document.createTextNode(' '), status, detail);
    if (p.gift_email) {
      const gift = document.createElement('p');
      gift.textContent =
        'ซื้อให้ ' + p.gift_email + (p.status === 'ok' ? ' · รับไกด์เมื่อเข้าสู่ระบบด้วยอีเมลนี้' : '');
      row.append(gift);
    }
    if (p.referral_email) {
      const referral = document.createElement('p');
      referral.textContent = 'ผู้แนะนำ: ' + p.referral_email;
      row.append(referral);
    }
    if (p.credit_applied_cents) {
      const applied = document.createElement('p');
      applied.textContent =
        (['credited', 'rejected', 'cancelled'].includes(p.status) ? 'คืนเครดิตที่กันไว้ ' : 'ใช้เครดิต ') +
        money(p.credit_applied_cents / 100) +
        ' · ยอดโอนเพิ่ม ' +
        money(p.amount_due_cents / 100);
      row.append(applied);
    }
    if (p.processing_fee_cents) {
      const fee = document.createElement('p');
      fee.textContent =
        'ทศนิยมช่วยตรวจเช็คยอด ' +
        money(p.processing_fee_cents / 100) +
        ' · ยอดชำระผ่านธนาคาร ' +
        money(p.amount_due_cents / 100);
      row.append(fee);
    }
    if (p.received_cents) {
      const received = document.createElement('p');
      received.textContent = 'ตรวจพบยอดโอน ' + money(p.received_cents / 100);
      row.append(received);
    }
    if (p.review_note) {
      const note = document.createElement('p');
      note.textContent = 'ผู้ดูแล: ' + p.review_note;
      row.append(note);
    }
    if (p.product.startsWith('guide_')) {
      const a = document.createElement('a');
      a.href =
        p.status === 'ok' && !p.gift_email
          ? './premium-guide.html?guide=' + p.product.slice(6)
          : './checkout.html?product=' +
            encodeURIComponent(p.product) +
            (p.gift_email ? '&gift=' + encodeURIComponent(p.gift_email) : '');
      a.textContent = p.status === 'ok' && !p.gift_email ? 'เปิดไกด์ฉบับเต็ม' : 'ดูรายการ / ซื้ออีกครั้ง';
      row.append(a);
    }
    if (p.product === 'market') {
      const a = document.createElement('a');
      a.href = p.status === 'ok' ? './marketplace.html' : './checkout.html?product=market';
      a.textContent = p.status === 'ok' ? 'เปิดตลาดซื้อขาย' : 'ดูรายการ / สมัครสมาชิกตลาด';
      row.append(a);
    }
    container.append(row);
  }
}
