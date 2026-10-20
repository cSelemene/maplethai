import { ITEMS } from './equipment-data.js?v=1ade3c6d87';
import { equipmentAt, PLANS } from './equipment-plan.js?v=03123bf8ce';
const script = document.querySelector('script[data-equipment-guide]');
const guide = script?.dataset.equipmentGuide;
const main = document.getElementById('main');
const esc = v =>
  String(v).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const names = {
  Dagger: 'มีด',
  Claw: 'กรงเล็บ',
  Wand: 'ไม้เท้า',
  Hat: 'หมวก',
  Top: 'เสื้อ',
  Bottom: 'ท่อนล่าง',
  Overall: 'ชุดเต็มตัว',
  Gloves: 'ถุงมือ',
  Shoes: 'รองเท้า',
  Polearm: 'polearm',
  'Two-Handed Axe': 'ขวานสองมือ',
  'Two-Handed Blunt Weapon': 'ค้อนสองมือ',
  Shield: 'โล่'
};
let key = '';
function itemCard(item) {
  return `<li class="equipment-item">${item.icon ? `<img src="${esc(item.icon)}" alt="" loading="lazy" width="40" height="40">` : ''}<div><span class="equipment-slot">${names[item.slot] || esc(item.slot)} · Lv.${item.level}${item.gender === 'any' ? '' : item.gender === 'male' ? ' · ชาย' : ' · หญิง'}</span><h4>${esc(item.name)}</h4><p class="equipment-stats">${Object.entries(
    item.stats
  )
    .map(([k, v]) => `${esc(k)} +${v}`)
    .join(' · ')}</p><p class="equipment-requires">ต้องมี ${
    Object.entries(item.requirements)
      .map(([k, v]) => `${esc(k)} ${v}`)
      .join(' / ') || 'เลเวลตามกำหนด'
  }</p><a href="${esc(item.source)}" target="_blank" rel="noopener">ข้อมูลไอเทม</a></div></li>`;
}
function draw(root) {
  const level = Number(root.dataset.level) || 10,
    gender = root.dataset.gender || 'male';
  const plan = equipmentAt(guide, level, gender);
  const items =
    plan.next?.items.map(id => ITEMS[id]).filter(x => x.gender === 'any' || x.gender === gender) || [];
  root.innerHTML = `<div class="equipment-heading"><div><span class="equipment-eyebrow">อุปกรณ์ตามช่วงเลเวล</span><h3>ตอนนี้ใส่อะไรดี?</h3></div><div class="equipment-controls"><label>เลเวลตัวละคร<input class="equipment-level" type="number" min="1" max="50" value="${level}"></label><label>ชุดสำหรับ<select class="equipment-gender"><option value="male" ${gender === 'male' ? 'selected' : ''}>ตัวละครชาย</option><option value="female" ${gender === 'female' ? 'selected' : ''}>ตัวละครหญิง</option></select></label></div></div><p class="equipment-intro">เลือกเลเวลจริงของคุณเพื่อดูชุดที่น่าใช้ ค่าด้านล่างเป็นค่าพื้นฐานของชิ้นที่ยังไม่สกอลล์ แต่ละชิ้นต้องผ่านทั้งเลเวลและสเตตัสที่ระบุ</p>${level < 10 ? '<p>ช่วงก่อนเปลี่ยนอาชีพใช้ของเดิมได้ เก็บเงินไว้เตรียมอาวุธ Lv.10</p>' : `<ul class="equipment-grid">${plan.current.map(itemCard).join('')}</ul><p class="equipment-advice">${esc(plan.checkpoints.at(-1)?.note || '')}</p>`}${guide === 'assassin' ? '<p class="equipment-advice">กรงเล็บต้องใช้คู่กับดาวกระจาย เทียบ W.ATK ของทั้งสองอย่างร่วมกัน ดาวไม่ได้ปลดล็อกตามขั้น 15 / 20 / 25 เหมือนกรงเล็บ และไม่ใช้โล่ร่วมกับกรงเล็บ</p>' : ''}<p class="equipment-keep">มีของที่สกอลล์แล้วให้เทียบค่าจริงก่อนซื้อ ของเลเวลสูงกว่าไม่ได้ดีกว่าเสมอ และค่าสเตตัสที่ต้องใช้ไม่ได้หมายความว่าต้องเปลี่ยนแนวลง AP ตามนี้</p>${plan.next ? `<details class="equipment-next"><summary>เตรียมไว้สำหรับ Lv.${plan.next.level}</summary><p>${esc(plan.next.note)}</p>${items.length ? `<ul class="equipment-grid">${items.map(itemCard).join('')}</ul>` : '<p>ใช้ชุดเดิมต่อได้</p>'}</details>` : ''}<details class="equipment-timeline"><summary>ดูจุดเปลี่ยนอุปกรณ์ Lv.10–50</summary>${PLANS[
    guide
  ]
    .map(
      t =>
        `<div class="equipment-milestone"><h4>Lv.${t.level}</h4><p>${esc(t.note)}</p><p>${
          t.items
            .map(id => ITEMS[id])
            .filter(x => x.gender === 'any' || x.gender === gender)
            .map(
              x =>
                `${esc(x.name)} (${Object.entries(x.stats)
                  .filter(([k]) => ['LUK', 'INT', 'W.ATK', 'M.ATK'].includes(k))
                  .map(([k, v]) => `${k} +${v}`)
                  .join(', ')})`
            )
            .join(' · ') || 'ใช้ชุดเดิมต่อได้'
        }</p></div>`
    )
    .join(
      ''
    )}</details><small class="equipment-source">ตรวจข้อมูล Classic World จาก Nia / MeowDB · 11 ต.ค. 2026</small>`;
  root.querySelector('.equipment-level').addEventListener('change', e => {
    root.dataset.level = Math.max(1, Math.min(50, Number(e.target.value) || 10));
    draw(root);
  });
  root.querySelector('.equipment-gender').addEventListener('change', e => {
    root.dataset.gender = e.target.value;
    draw(root);
  });
}
function mount() {
  const card = main?.querySelector('article.card');
  if (!card) return;
  const label = card.querySelector('.card-head .lv')?.textContent || '';
  const nextKey = label + '|' + (card.querySelector('.card-head h2')?.textContent || '');
  let root = card.querySelector('.equipment-guide');
  if (root) return;
  key = nextKey;
  const level = Math.max(1, Math.min(50, Number(label.match(/\d+/)?.[0]) || 10));
  root = document.createElement('section');
  root.className = 'equipment-guide';
  root.dataset.level = level;
  root.setAttribute('aria-label', 'อุปกรณ์ตามช่วงเลเวล');
  card.append(root);
  draw(root);
}
function mountBuilds() {
  if (guide !== 'bandit') return;
  const host = document.getElementById('bgear');
  if (!host || !host.children.length || host.querySelector('.equipment-guide')) return;
  const label = host.querySelector('[data-bbr][aria-selected="true"]')?.textContent || '';
  const level = Math.max(1, Math.min(50, Number(label.match(/\d+/)?.[0]) || 10));
  const root = document.createElement('section');
  root.className = 'equipment-guide';
  root.dataset.level = level;
  root.setAttribute('aria-label', 'อุปกรณ์ตามช่วงเลเวล');
  host.append(root);
  draw(root);
}
if (main && PLANS[guide]) {
  new MutationObserver(() => {
    mount();
    mountBuilds();
  }).observe(document.body, { childList: true, subtree: true });
  mount();
  mountBuilds();
}
