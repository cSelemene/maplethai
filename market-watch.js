import { supabase } from './supabase-client.js?v=ffa6b49ed5';
import { STAT_LABELS } from './market-items.js?v=6fdbbaa1f1';
import { selectWatchlist } from './market-watch-selection.js?v=1a006e7eda';
const container = document.getElementById('market-watch-items'),
  status = document.getElementById('market-watch-status');
const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const fullPrice = n => new Intl.NumberFormat('en-US').format(n) + ' Meso';
function card({ row, people }, items) {
  const item =
    items.find(i => i.id === row.item_id) ||
    items.find(i => i.name.toLowerCase() === row.item_name.toLowerCase());
  const link = el('a', undefined, 'market-watch-card');
  link.href = './marketplace.html?listing=' + encodeURIComponent(row.id);
  const meta = el('div', undefined, 'market-watch-meta');
  meta.append(
    el('span', row.kind === 'sell' ? 'ประกาศขาย' : 'ประกาศรับซื้อ', 'market-watch-kind ' + row.kind),
    el('span', people > 1 ? 'มีหลายคนลงประกาศ' : 'ประกาศใหม่')
  );
  link.append(meta);
  const heading = el('div', undefined, 'market-watch-item'),
    picture = el('span', undefined, 'market-watch-picture');
  if (item?.icon && /^(?:\.\/assets\/market\/|assets\/market\/|https:\/\/)/.test(item.icon)) {
    const img = el('img');
    img.src = item.icon;
    img.alt = '';
    img.width = 40;
    img.height = 40;
    img.loading = 'lazy';
    img.onerror = () => picture.replaceChildren(el('span', (item.name || row.item_name).slice(0, 2)));
    picture.append(img);
  } else picture.append(el('span', row.item_name.slice(0, 2)));
  heading.append(picture, el('h4', item?.name || row.item_name));
  link.append(heading);
  const price = el('p', undefined, 'market-watch-price');
  const coin = el('img');
  coin.src = './assets/market/meso-coin.svg?v=0e1561a5ba';
  coin.alt = '';
  coin.width = 16;
  coin.height = 16;
  price.append(
    coin,
    el(
      'strong',
      new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(row.price)
    ),
    el('span', 'Meso')
  );
  price.title = fullPrice(row.price);
  price.setAttribute('aria-label', fullPrice(row.price));
  link.append(price);
  const details = el('p', undefined, 'market-watch-details'),
    stats = Object.entries(row.item_stats || {})
      .filter(([key]) => STAT_LABELS[key])
      .slice(0, 2)
      .map(([key, value]) => STAT_LABELS[key] + ' ' + value);
  if (!stats.length && row.atk != null) stats.push('ATK ' + row.atk);
  if (row.slots != null) stats.push('ช่องอัปเกรด ' + row.slots);
  details.textContent = 'จำนวน ' + row.qty + (stats.length ? ' · ' + stats.join(' · ') : '');
  link.append(details);
  const date = new Date(row.created_at);
  link.append(
    el(
      'p',
      Number.isFinite(date.getTime())
        ? 'ลงประกาศ ' + date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
        : '',
      'market-watch-date'
    ),
    el('span', 'ดูประกาศ', 'market-watch-open')
  );
  return link;
}
async function load() {
  try {
    const now = new Date().toISOString();
    const [result, icons] = await Promise.all([
      supabase
        .from('listings')
        .select(
          'id,user_id,kind,item_name,item_id,item_stats,qty,price,price_unit,atk,slots,status,created_at,expires_at'
        )
        .eq('status', 'open')
        .eq('price_unit', 'meso')
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(100),
      fetch('./assets/market/items.json?v=25997792fb')
        .then(r => (r.ok ? r.json() : []))
        .catch(() => [])
    ]);
    if (result.error) throw result.error;
    const selected = selectWatchlist(result.data || []);
    container.replaceChildren();
    if (!selected.length) {
      status.textContent = 'ยังไม่มีประกาศเปิดอยู่ ลงขายของหรือประกาศรับซื้อเป็นคนแรกได้เลย';
      return;
    }
    for (const item of selected) container.append(card(item, Array.isArray(icons) ? icons : []));
    status.textContent = '';
    status.hidden = true;
  } catch {
    status.textContent = 'ยังโหลดประกาศล่าสุดไม่ได้ กดเปิดตลาดซื้อขายเพื่อดูรายการได้เลย';
  }
}
load();
