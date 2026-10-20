// Homepage banner for the launch all-guides pack. Shows the visitor's own price (99 baht off per guide they own).
import { supabase } from './supabase-client.js?v=cb12a9f448';
const box = document.getElementById('pack-promo');
const baht = n => '฿' + Number(n).toLocaleString('th-TH');
async function refresh() {
  if (!box) return;
  try {
    const { data: q, error } = await supabase.rpc('pack_quote');
    if (error) throw error;
    if (!q?.active) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const $ = k => box.querySelector('[data-pack-' + k + ']');
    const off = q.separate_price > q.base ? Math.round((1 - q.base / q.separate_price) * 100) : 0;
    $('badge').hidden = !off;
    $('badge').textContent = '-' + off + '%';
    const was = (label, n) => ($('was').innerHTML = label + ' <s>' + baht(n) + '</s>');
    was('ซื้อแยก', q.separate_price);
    $('count').textContent = q.guides;
    $('buy').href = './checkout.html?product=pack_all';
    if (q.owns_pack) {
      $('price').textContent = 'มีแล้ว';
      $('badge').hidden = true;
      $('personal').textContent = 'บัญชีนี้ปลดล็อกทุกอาชีพและตลาดถาวรแล้ว';
      $('buy').textContent = 'เปิดไกด์ของฉัน →';
      $('buy').href = './my-guides.html';
    } else if (q.price === 0) {
      was('ราคาแพ็ก', q.base);
      $('price').textContent = 'ฟรี';
      $('personal').textContent = 'คุณมีไกด์ ' + q.owned_guides + ' เล่ม ส่วนลดครบราคาแพ็กแล้ว กดรับได้เลย';
      $('buy').textContent = 'รับแพ็กฟรี →';
      $('badge').textContent = 'ฟรี!';
    } else if (q.discount > 0) {
      was('ราคาแพ็ก', q.base);
      $('price').textContent = baht(q.price);
      $('personal').textContent =
        'ราคาของคุณ ลด ' + baht(q.discount) + ' จากไกด์ ' + q.owned_guides + ' เล่มที่มีอยู่';
      $('buy').textContent = 'อัปเกรดเป็นแพ็ก ' + baht(q.price) + ' →';
      $('badge').textContent = '-' + Math.round((1 - q.price / q.base) * 100) + '%';
    } else {
      $('price').textContent = baht(q.base);
      $('personal').textContent = 'มีไกด์อยู่แล้ว? ลดเล่มละ ฿99 · มี 3 เล่มขึ้นไปรับฟรี';
      $('buy').textContent = 'รับแพ็กราคาโปร →';
    }
  } catch {}
}
supabase.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();
