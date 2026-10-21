import { supabase } from './supabase-client.js?v=cb12a9f448';

// Fills [data-price-item="<exact item name>"] with the latest market snapshot from
// public.market_prices (the same daily snapshot the guides use). Articles keep their
// written reference prices; this only adds the newest numbers next to them.
const compact = n =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const full = n => new Intl.NumberFormat('en-US').format(n);

// Match the meso pill already used in the paid guides (.cx.meso / .ci).
// The coin is CSS-drawn; do not load the different marketplace SVG here.
function mesoAmount(amount, tag = 'span') {
  const value = document.createElement(tag);
  value.className = 'meso-amount';
  const coin = document.createElement('span');
  coin.className = 'ci';
  coin.setAttribute('aria-hidden', 'true');
  const number = document.createElement('b');
  number.textContent = compact(amount);
  const unit = document.createElement('small');
  unit.textContent = 'meso';
  value.append(coin, number, unit);
  value.title = full(amount) + ' meso';
  value.setAttribute('aria-label', full(amount) + ' meso');
  return value;
}

function render(node, price) {
  node.replaceChildren();
  if (!price || (!price.usual && !price.cheapestSell)) {
    node.textContent = 'ยังไม่มีข้อมูลซื้อขาย';
    node.classList.add('empty');
    return;
  }
  const label = document.createElement('span');
  label.textContent = node.dataset.priceLabel ?? 'ล่าสุด ';
  const main = mesoAmount(price.usual || price.cheapestSell, 'b');
  node.append(label, main);
  const small = document.createElement('small');
  // Ignore offers far below the usual price, which may be mistyped listings.
  if (price.usual && price.cheapestSell && price.cheapestSell >= price.usual * 0.2) {
    small.append('ขายถูกสุด ', mesoAmount(price.cheapestSell));
  }
  if (price.finishedTrades) {
    if (small.childNodes.length) small.append(' · ');
    small.append('ซื้อขายจริง ' + price.finishedTrades + ' ครั้ง');
  }
  if (small.childNodes.length) node.append(small);
}

async function run() {
  const nodes = document.querySelectorAll('[data-price-item]');
  const stamp = document.querySelectorAll('[data-price-updated]');
  if (!nodes.length) return;
  try {
    const { data, error } = await supabase
      .from('market_prices')
      .select('data,fetched_at')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) throw error || Error('no data');
    const prices = data.data?.prices || {};
    nodes.forEach(node => render(node, prices[node.dataset.priceItem]));
    const when = new Date(data.fetched_at);
    const days = Math.floor((Date.now() - when.getTime()) / 86400000);
    const text =
      when.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Bangkok'
      }) + (days >= 2 ? ` (${days} วันก่อน)` : '');
    stamp.forEach(s => (s.textContent = text));
  } catch {
    nodes.forEach(node => {
      node.textContent = 'โหลดราคาล่าสุดไม่ได้';
      node.classList.add('empty');
    });
    stamp.forEach(s => (s.textContent = 'โหลดไม่ได้'));
  }
}
run();
