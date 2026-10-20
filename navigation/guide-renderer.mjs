import { getBundle } from './navigation-data.mjs?v=33600e0cde';
const escape = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
let reference = { MINI: {}, NAV: {} };
export async function loadReference() {
  reference = (await getBundle()).reference;
}
export function mapThumbnail(map) {
  const asset = reference.MINI[map.id];
  return asset
    ? `https://cselemene.github.io/maplethai/${asset.u}`
    : map.hasMinimapImage
      ? `https://meowdb.com/msclassic/maps/minimaps/${map.id}.png`
      : `https://meowdb.com/msclassic/api/assets/maps/${map.id}?v=12`;
}
export function mapFrame(m) {
  return m.hasMinimapImage
    ? { w: m.minimapWidth, h: m.minimapHeight, cx: m.miniMapCenterX, cy: m.miniMapCenterY }
    : m.sceneBounds
      ? {
          w: m.sceneBounds[2] - m.sceneBounds[0],
          h: m.sceneBounds[3] - m.sceneBounds[1],
          cx: -m.sceneBounds[0],
          cy: -m.sceneBounds[1]
        }
      : null;
}
export function percent(m, p) {
  const f = mapFrame(m);
  return f && p ? [(100 * (p.x + f.cx)) / f.w, (100 * (p.y + f.cy)) / f.h] : null;
}
// The original guide's mmHTML markup and navHTML row structure, with dynamic map data.
export function mmHTML(o) {
  const m = reference.MINI[o.m.id],
    f = mapFrame(o.m);
  if (!m && !f) return '';
  const ratio = m ? m.w / m.h : f.w / f.h;
  const image = m
    ? `https://cselemene.github.io/maplethai/${m.u}`
    : o.m.hasMinimapImage
      ? `https://meowdb.com/msclassic/maps/minimaps/${o.m.id}.png`
      : `https://meowdb.com/msclassic/api/assets/maps/${o.m.id}?v=12`;
  const dot = (p, c, l) =>
    p ? `<span class="mmdot ${c}" style="left:${p[0]}%;top:${p[1]}%" title="${escape(l)}"></span>` : '';
  return `<button type="button" class="mm" aria-label="ขยายแผนที่ ${escape(o.m.name)}" aria-expanded="false" style="--ar:${ratio.toFixed(3)};aspect-ratio:${ratio}"><img referrerpolicy="no-referrer" src="${image}" alt="แผนที่ ${escape(o.m.name)}" loading="lazy">${dot(o.a, 'in' + (o.uncertain ? ' uncertain' : ''), o.uncertain ? 'จุดเข้าโดยประมาณ' : 'จุดที่เข้ามา')}${dot(o.b, o.k === 'npc' ? 'np' : 'out', o.k === 'npc' ? 'NPC' : 'ทางออก')}</button>`;
}
export function navHTML(rows) {
  const kinds = { walk: 'เดิน', npc: 'หา NPC', scroll: 'Scroll', txt: 'ถึงปลายทาง' };
  return `<div class="navbox"><div class="route-section-head"><h3>เส้นทางเดิน</h3><span>${rows.length} จุด · แตะแผนที่เพื่อขยาย</span></div><p class="navlegend"><span class="mmdot in st"></span> จุดที่เข้ามา <span class="mmdot out st"></span> ทางออกที่ต้องไป <span class="mmdot np st"></span> ตำแหน่ง NPC</p><ol class="navlist">${rows.map(o => `<li class="nv ${o.k}"><div class="nvt"><span class="nvk ${o.k}">${kinds[o.k]}</span> ${o.t}</div>${mmHTML(o)}</li>`).join('')}</ol></div>`;
}
export function curatedText(map, exit, to) {
  const b = percent(map, exit);
  if (!b) return null;
  for (const group of Object.values(reference.NAV))
    for (const row of group) {
      if (
        row.k === 'walk' &&
        row.m === map.id &&
        row.b &&
        Math.hypot(row.b[0] - b[0], row.b[1] - b[1]) < 1 &&
        row.t.includes(to.name)
      )
        return row.t;
    }
  return null;
}
export function bindMapZoom(container) {
  container.addEventListener('click', e => {
    const button = e.target.closest('.mm');
    if (!button) return;
    button.classList.toggle('big');
    button.setAttribute('aria-expanded', String(button.classList.contains('big')));
    button.setAttribute('aria-label', (button.classList.contains('big') ? 'ย่อ' : 'ขยาย') + 'แผนที่');
  });
}
