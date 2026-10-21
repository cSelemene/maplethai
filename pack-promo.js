// Homepage all-guides pack: launch banner + pack card. The price shown is only a preview;
// checkout recalculates it on the server (create_payment_order -> private.pack_price).
import { supabase } from './supabase-client.js';
const all = sel => [...document.querySelectorAll(sel)];
const baht = n => '฿' + Number(n).toLocaleString('en-US');
const set = (sel, text) => all(sel).forEach(n => (n.textContent = text));
let generation = 0;
function tiers(base) {
  const list = document.querySelector('[data-pack-tiers]');
  if (!list) return;
  const rows = [0, 1, 2, 3].map(n => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = n === 0 ? 'ยังไม่มีไกด์' : n === 3 ? 'มีตั้งแต่ 3 ไกด์' : 'มี ' + n + ' ไกด์';
    const value = document.createElement('strong');
    const price = Math.max(0, base - 99 * n);
    value.textContent = price ? baht(price) : 'ฟรี';
    li.append(label, value);
    return li;
  });
  list.replaceChildren(...rows);
}
async function refresh() {
  const ticket = ++generation;
  try {
    const [{ data: q, error }, { data: session }] = await Promise.all([
      supabase.rpc('pack_quote'),
      supabase.auth.getSession()
    ]);
    if (ticket !== generation || error || !q) return;
    if (!q.active) {
      all('[data-pack]').forEach(n => (n.hidden = true));
      return;
    }
    const signedIn = !!session?.session;
    set('[data-pack-base]', baht(q.base));
    if (q.separate_price > q.base) set('[data-pack-separate]', baht(q.separate_price));
    if (q.guides) set('[data-pack-guides]', String(q.guides));
    tiers(q.base);
    let price = baht(q.base),
      note = 'ซื้อครั้งเดียว',
      personal = signedIn
        ? 'บัญชีนี้ยังไม่มีไกด์ ราคาแพ็ก ' + baht(q.base)
        : 'เข้าสู่ระบบเพื่อดูราคาตามไกด์ที่บัญชีของคุณมีอยู่',
      buy = 'ซื้อแพ็กทุกอาชีพ',
      href = './checkout.html?product=pack_all';
    if (signedIn && q.owns_pack) {
      price = 'มีแล้ว';
      note = 'ปลดล็อกครบทุกอาชีพ';
      personal = 'บัญชีนี้มีแพ็กทุกอาชีพแล้ว เปิดอ่านไกด์ทุกอาชีพได้ใน “ไกด์ของฉัน” และใช้ตลาดได้ไม่จำกัด';
      buy = 'เปิดไกด์ของฉัน';
      href = './my-guides.html';
    } else if (signedIn && q.owned_guides > 0) {
      price = q.price ? baht(q.price) : 'ฟรี';
      note = 'หักส่วนลดลูกค้าเดิม ' + baht(q.discount);
      personal =
        'บัญชีนี้มีไกด์ ' +
        q.owned_guides +
        ' อาชีพ ได้ส่วนลด ' +
        baht(q.discount) +
        (q.price ? ' ชำระเพิ่มเพียง ' + baht(q.price) : ' จึงรับแพ็กได้ฟรี ไม่ต้องโอนเงิน');
      buy = q.price ? 'ชำระเพิ่ม ' + baht(q.price) : 'รับแพ็กฟรี';
    }
    set('[data-pack-price]', price);
    set('[data-pack-price-note]', note);
    set('[data-pack-personal]', personal);
    all('[data-pack-buy]').forEach(a => {
      a.textContent = buy;
      a.href = href;
    });
    all('[data-pack-was]').forEach(n => (n.hidden = !(signedIn && !q.owns_pack && q.owned_guides > 0)));
  } catch {}
}
supabase.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();
