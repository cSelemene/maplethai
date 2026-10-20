import { supabase, readAccount } from './supabase-client.js?v=ffa6b49ed5';
import { rpc, money, STATUS } from './payment-common.js?v=6ff74e298a';
const $ = id => document.getElementById(id);
const fmtDate = value =>
  new Date(value).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
let offset = 0,
  generation = 0,
  ready = false;
function say(text, error = false) {
  $('sales-status').textContent = text;
  $('sales-status').className = 'message' + (error ? ' error' : '');
}
function el(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
function filters() {
  return {
    p_from: $('sales-from').value || null,
    p_to: $('sales-to').value || null,
    p_search: $('sales-search').value.trim().replace(/^#\s*/, ''),
    p_product: $('sales-product').value,
    p_status: $('sales-state').value,
    p_offset: offset
  };
}
function render(report) {
  const s = report.summary;
  $('sales-total').textContent = money(s.sales_cents / 100);
  $('sales-count').textContent = s.sales_count + ' รายการ';
  $('sales-customers').textContent = s.customers + ' คน';
  $('sales-review').textContent = s.needs_review + ' รายการ';
  $('sales-products').replaceChildren();
  for (const p of report.products) {
    const row = el('div', '');
    row.className = 'product-row';
    row.append(
      el('span', p.product_name + ' · ' + p.quantity + ' รายการ'),
      el('strong', money(p.sales_cents / 100))
    );
    $('sales-products').append(row);
  }
  if (!report.products.length) $('sales-products').textContent = 'ไม่มีรายการขายสำเร็จตามตัวกรองนี้';
  $('sales-orders').replaceChildren();
  for (const p of report.orders) {
    const row = el('tr', '');
    const when = el('td', '#' + p.id);
    when.append(el('small', fmtDate(p.created_at)));
    const customer = el('td', p.email || 'บัญชีถูกลบ');
    if (p.manual_sale) customer.append(el('small', 'โอนส่วนตัวนอกระบบ'));
    if (p.gift_email) customer.append(el('small', 'ซื้อให้ ' + p.gift_email));
    const amount = el('td', money(p.amount));
    if (p.processing_fee_cents) amount.append(el('small', 'ทศนิยม ' + money(p.processing_fee_cents / 100)));
    const payment = el('td', p.received_cents == null ? 'ยังไม่มีผลยอดโอน' : money(p.received_cents / 100));
    payment.append(el('small', 'ใช้เครดิต ' + money(p.credit_applied_cents / 100)));
    payment.append(el('small', 'ยอดโอนตามออเดอร์ ' + money(p.amount_due_cents / 100)));
    const state = el('td', STATUS[p.status] || p.status);
    state.append(
      el('small', p.has_access ? 'สิทธิ์ปัจจุบัน: ใช้งานได้' : 'สิทธิ์ปัจจุบัน: ไม่มี / หมดอายุ / ระงับ')
    );
    if (p.bank_review_state === 'needs_review') state.append(el('small', '⚠ รอตรวจเงินจริง'));
    else if (p.bank_review_state === 'confirmed') state.append(el('small', '✓ ผู้ดูแลยืนยันเงินเข้าแล้ว'));
    else if (p.status === 'ok') state.append(el('small', 'ดูรายละเอียดการตรวจในหน้าชำระเงิน'));
    if (p.reviewed_at) state.append(el('small', 'บันทึกผลตรวจ ' + fmtDate(p.reviewed_at)));
    row.append(when, customer, el('td', p.product_name), amount, payment, state);
    $('sales-orders').append(row);
  }
  if (!report.orders.length) {
    const cell = el('td', 'ไม่พบรายการตามตัวกรอง');
    cell.colSpan = 6;
    const row = el('tr', '');
    row.append(cell);
    $('sales-orders').append(row);
  }
  $('sales-results').textContent = 'พบ ' + s.total_orders + ' รายการ · ยอดรวมคำนวณจากทุกหน้าตามตัวกรอง';
  $('sales-prev').disabled = offset === 0;
  $('sales-next').disabled = offset + 50 >= Number(s.total_orders);
  $('sales-page').textContent = 'หน้า ' + (offset / 50 + 1);
}
async function load() {
  if (!ready) return;
  const ticket = ++generation;
  const args = filters();
  if (args.p_from && args.p_to && args.p_from > args.p_to) {
    say('วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด', true);
    return;
  }
  $('sales-submit').disabled = true;
  $('sales-content').setAttribute('aria-busy', 'true');
  say('กำลังโหลดสรุปการขาย…');
  try {
    const report = await rpc('admin_sales_report', args);
    if (ticket !== generation) return;
    render(report);
    say('อัปเดตล่าสุด ' + fmtDate(new Date()));
  } catch (e) {
    if (ticket === generation) {
      for (const id of ['sales-total', 'sales-count', 'sales-customers', 'sales-review'])
        $(id).textContent = '—';
      $('sales-orders').replaceChildren();
      $('sales-products').replaceChildren();
      $('sales-results').textContent = 'โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง';
      say(e.message || 'โหลดรายงานไม่สำเร็จ', true);
    }
  } finally {
    if (ticket === generation) {
      $('sales-submit').disabled = false;
      $('sales-content').setAttribute('aria-busy', 'false');
    }
  }
}
async function verify() {
  const ticket = ++generation;
  ready = false;
  $('sales-content').hidden = true;
  $('sales-login').hidden = true;
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();
    if (ticket !== generation) return;
    if (error) throw error;
    if (!user) {
      say('เข้าสู่ระบบด้วยบัญชีผู้ดูแลเพื่อดูยอดขาย');
      $('sales-login').hidden = false;
      return;
    }
    const account = await readAccount();
    if (ticket !== generation) return;
    if (!account.is_admin) {
      say('บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลการขาย', true);
      return;
    }
    const { data, error: productError } = await supabase.from('products').select('id,name').order('sort');
    if (productError) throw productError;
    if (ticket !== generation) return;
    $('sales-product').replaceChildren(new Option('ทุกสินค้า', ''));
    for (const p of data) $('sales-product').append(new Option(p.name, p.id));
    ready = true;
    $('sales-content').hidden = false;
    await load();
  } catch (e) {
    if (ticket === generation) say(e.message || 'ตรวจสอบสิทธิ์ไม่สำเร็จ', true);
  }
}
$('sales-filters').onsubmit = e => {
  e.preventDefault();
  offset = 0;
  load();
};
$('sales-reset').onclick = () => {
  $('sales-filters').reset();
  offset = 0;
  load();
};
$('sales-prev').onclick = () => {
  offset = Math.max(0, offset - 50);
  load();
};
$('sales-next').onclick = () => {
  offset += 50;
  load();
};
supabase.auth.onAuthStateChange(() => setTimeout(verify, 0));
verify();
