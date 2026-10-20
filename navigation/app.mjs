import { getBundle, onAccessChange } from './navigation-data.mjs?v=5374da8f12';
import {
  browseChoices,
  loadNpcProfiles,
  npcProfile,
  loadMonsterProfiles,
  monsterProfile
} from './browse.mjs?v=e6ac36627b';
import {
  loadReference,
  mapThumbnail,
  mapFrame,
  percent,
  navHTML,
  curatedText,
  bindMapZoom
} from './guide-renderer.mjs?v=19ff6dabb9';
import { route, search, recommendations, arrival, suggestions } from './route.mjs?v=45458d0711';
const el = id => document.getElementById(id),
  esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
let maps = [],
  byId,
  selected = null,
  active = -1;
const frame = m =>
  m.hasMinimapImage
    ? { w: m.minimapWidth, h: m.minimapHeight, cx: m.miniMapCenterX, cy: m.miniMapCenterY }
    : m.sceneBounds
      ? {
          w: m.sceneBounds[2] - m.sceneBounds[0],
          h: m.sceneBounds[3] - m.sceneBounds[1],
          cx: -m.sceneBounds[0],
          cy: -m.sceneBounds[1]
        }
      : null;
const direction = (m, p) => {
  if (!p || !frame(m)) return 'ตำแหน่งที่ทำเครื่องหมายบนภาพ';
  const x = (p.x + frame(m).cx) / frame(m).w,
    y = (p.y + frame(m).cy) / frame(m).h;
  return `${y < 0.33 ? 'ด้านบน' : y > 0.67 ? 'ด้านล่าง' : 'ช่วงกลาง'}${x < 0.33 ? 'ฝั่งซ้าย' : x > 0.67 ? 'ฝั่งขวา' : ''}`;
};
function show(dest, mode = 'walk') {
  selected = dest;
  const start = el('start').value,
    { walk, shortcut } = recommendations(maps, start, dest),
    steps = mode === 'scroll' && shortcut ? shortcut.steps : walk;
  const origin = byId.get(start),
    target = byId.get(dest),
    rows = [];
  let html = `<article class="card"><div class="card-head"><div class="stepno">NAVIGATION · ${steps ? steps.length + ' ขั้นตอน' : 'ไม่พบเส้นทาง'}</div><div class="route-endpoints"><div class="route-endpoint"><span>ต้นทาง</span><h2>${esc(origin.name)}</h2></div><div class="route-endpoint destination"><span>ปลายทาง</span><h2>${esc(target.name)}</h2></div></div><p>เดินตามจุดบนแผนที่ทีละแมพ แตะภาพเพื่อขยายเหมือนในไกด์หลัก</p></div>`;
  if (shortcut)
    html += `<div class="shortcut"><strong>💡 ถ้ามี Return Scroll to ${esc(byId.get(shortcut.item.to).name)} แนะนำให้ใช้</strong><p>ใช้ 1 ใบ แล้วเดินต่อ ${shortcut.steps.length - 1} วาร์ป${walk ? ' แทนการเดิน ' + walk.length + ' วาร์ป' : ''} • มีอยู่แล้วจ่ายเพิ่ม 0 mesos • ราคาซื้อ NPC ${shortcut.item.price.toLocaleString()} mesos</p><button id="use-shortcut" class="bar-btn big">ดูทางใช้ Scroll</button>${walk ? '<button id="use-walk" class="bar-btn">ดูทางเดิน</button>' : ''}<p class="small-note">เปรียบเทียบจำนวนขั้นตอน ไม่ใช่เวลาเดินที่วัดจริง • <a target="_blank" rel="noopener" href="https://meowdb.com/msclassic/item-db/${shortcut.item.item}">ข้อมูล Scroll และราคา</a></p></div>`;
  if (steps) {
    steps.forEach((step, i) => {
      const m = byId.get(step.from),
        to = byId.get(step.to),
        entry = arrival(m, steps[i - 1]);
      let text;
      if (step.kind === 'scroll')
        text = `<b>${esc(m.name)}</b>: ใช้ <b>Return Scroll to ${esc(to.name)}</b> 1 ใบ → <b>${esc(to.name)}</b>`;
      else if (step.kind === 'npc')
        text = `<b>${esc(m.name)}</b>: เดินไปหา <b>${esc(step.npc.name || step.npc.displayName)}</b> ${direction(m, step.npc)} (จุดสีเขียว) → คุยแล้วเลือกเดินทางไป <b>${esc(to.name)}</b>`;
      else
        text =
          curatedText(m, step.portal, to) ||
          `<b>${esc(m.name)}</b>: ไปทาง <b>${direction(m, step.portal)}</b> ของแมพ → เข้าวาร์ป <b>${esc(step.portal.name)}</b> กด ↑ → <b>${esc(to.name)}</b>`;
      text += `<div class="row-note">${entry.point ? 'จุดสีฟ้า: ' + direction(m, entry.point) + ' · อ้างอิงวาร์ปย้อนกลับ ยังไม่ยืนยันจุดปรากฏจริง' : i === 0 ? 'เริ่มจากตำแหน่งที่คุณอยู่ตอนนี้' : 'ยังไม่ทราบจุดที่ตัวละครปรากฏหลังเดินทาง'}</div>`;
      rows.push({
        m,
        k: step.kind === 'scroll' ? 'scroll' : step.kind === 'npc' ? 'npc' : 'walk',
        t: text,
        a: percent(m, entry.point),
        b: percent(m, step.kind === 'npc' ? step.npc : step.portal),
        uncertain: !entry.confirmed
      });
    });
    const entry = arrival(target, steps.at(-1)),
      q = el('query').value.toLowerCase(),
      npc =
        el('type').value === 'npc' ? (target.npcs || []).find(n => n.name.toLowerCase().includes(q)) : null;
    rows.push({
      m: target,
      k: npc ? 'npc' : 'txt',
      a: percent(target, entry.point),
      b: percent(target, npc),
      uncertain: !entry.confirmed,
      t: npc
        ? `<b>${esc(npc.name)}</b> อยู่ใน <b>${esc(target.name)}</b> ${direction(target, npc)} → เดินไปจุดสีเขียวแล้วคุยกับ NPC`
        : `ถึง <b>${esc(target.name)}</b> แล้ว${el('type').value === 'monster' ? ' — เริ่มหามอนสเตอร์ที่เลือกในแมพนี้' : ''}`
    });
    html +=
      navHTML(rows) +
      `<div class="route-summary">${mode === 'scroll' ? 'ใช้ Scroll 1 ใบ • จ่ายเพิ่ม 0 mesos ถ้ามีไอเท็มอยู่แล้ว' : 'เดินผ่านวาร์ป ' + steps.filter(s => s.kind === 'portal').length + ' จุด' + (steps.some(s => s.kind === 'npc') ? ' • คุย NPC เดินทาง ' + steps.filter(s => s.kind === 'npc').length + ' ครั้ง (NPC อาจเก็บค่าโดยสาร)' : ' • ค่าเดินทางผ่านวาร์ป 0 mesos')}<p class="small-note">วงสีฟ้าเส้นประเป็นจุดเข้าโดยประมาณ จุดออกสีส้มและ NPC สีเขียวมาจากพิกัดในข้อมูลแผนที่</p></div>`;
  } else
    html +=
      '<div class="route-summary">ข้อมูลวาร์ปชุดนี้ยังไม่มีเส้นทางที่เชื่อมถึงกัน ต้องตรวจบริการ Taxi/เรือหรือเงื่อนไขพิเศษ</div>';
  html += '</article>';
  const cabs = maps
    .filter(m => (m.npcs || []).some(n => /cab/i.test(n.name)))
    .map(m => ({ m, path: route(maps, start, m.id) }))
    .filter(v => v.path !== null)
    .sort((a, b) => a.path.length - b.path.length);
  if (cabs.length) {
    const cab = cabs[0],
      npc = cab.m.npcs.find(n => /cab/i.test(n.name));
    html += `<details class="card taxi"><summary>🚕 Taxi ใกล้ต้นทาง — ${esc(cab.m.name)}</summary><p><b>${esc(npc.name)}</b> ${cab.path.length ? 'อยู่ห่าง ' + cab.path.length + ' วาร์ป' : 'อยู่ในแมพเดียวกับคุณ'}</p><p class="small-note">ยังไม่มีรายการปลายทางและค่าโดยสารที่ยืนยัน จึงยังไม่คำนวณเส้นทาง Taxi หรือยอดรวม</p><button id="cab-route" class="bar-btn">ดูทางไปหา Taxi</button></details>`;
  }
  el('journey').innerHTML = html;
  if (el('use-shortcut')) el('use-shortcut').onclick = () => show(dest, 'scroll');
  if (el('use-walk')) el('use-walk').onclick = () => show(dest);
  if (el('cab-route')) el('cab-route').onclick = () => show(cabs[0].m.id);
}

function pickDestination(id) {
  show(id);
  el('results').replaceChildren();
  el('status').textContent = 'เส้นทางไป ' + byId.get(id).name;
  el('journey').scrollIntoView({ block: 'start', behavior: 'instant' });
}
function clear() {
  selected = null;
  el('journey').innerHTML = '';
  el('results').innerHTML = '';
}
function results() {
  if (!el('start').value) {
    el('status').textContent = 'เลือกแมพต้นทางจากรายการแนะนำก่อน';
    return;
  }
  clear();
  el('suggestions').hidden = true;
  const found = search(maps, el('type').value, el('query').value);
  el('status').textContent = found.length
    ? `พบ ${found.length} แมพ เลือกแมพที่จะไป`
    : 'ไม่พบข้อมูล ลองชื่อภาษาอังกฤษ';
  for (const m of found) {
    const b = document.createElement('button');
    b.className = 'result';
    b.textContent = m.name;
    b.onclick = () => pickDestination(m.id);
    el('results').append(b);
  }
  if (found.length === 1) pickDestination(found[0].id);
}
function hideSuggestions(input, list) {
  el(list).hidden = true;
  el(input).setAttribute('aria-expanded', 'false');
  el(input).removeAttribute('aria-activedescendant');
}
function autocomplete(input, list, getType, onEdit, onSelect) {
  let active = -1;
  const render = () => {
    active = -1;
    const type = getType();
    const items =
      input === 'query' && ['npc', 'monster'].includes(type) && !el(input).value.trim()
        ? browseChoices(maps, type, el('start').value)
        : suggestions(maps, type, el(input).value);
    el(list).replaceChildren();
    el(list).hidden = !items.length;
    el(input).setAttribute('aria-expanded', String(!!items.length));
    el(input).removeAttribute('aria-activedescendant');
    items.forEach((v, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.role = 'option';
      button.id = list + '-' + i;
      button.textContent = v.name;
      if (type === 'map') {
        const map = byId.get(v.id);
        button.classList.add('map-choice');
        const text = document.createElement('span');
        text.className = 'choice-text';
        text.textContent = v.name;
        const avatar = document.createElement('span');
        avatar.className = 'choice-avatar city-avatar';
        const img = document.createElement('img');
        img.src = './data/town-icon.png?v=d30615496a';
        img.alt = '';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => {
          img.remove();
          avatar.textContent = map.isTown ? '🏘️' : '🗺️';
        };
        if (map.isTown) avatar.append(img);
        else avatar.textContent = '🌳';
        button.replaceChildren(avatar, text);
      } else if (type === 'npc' || type === 'monster') {
        button.classList.add('npc-choice');
        const profile = type === 'npc' ? npcProfile(v) : monsterProfile(v);
        const text = document.createElement('span');
        text.className = 'choice-text';
        text.textContent = v.name;
        const note = document.createElement('small');
        note.className = 'choice-note';
        note.textContent = profile.description;
        text.append(note);
        const avatar = document.createElement('span');
        avatar.className = 'choice-avatar';
        if (profile.image) {
          const img = document.createElement('img');
          img.src = profile.image;
          img.alt = '';
          img.loading = 'lazy';
          img.referrerPolicy = 'no-referrer';
          img.onerror = () => {
            img.remove();
            avatar.textContent = '?';
          };
          avatar.append(img);
        } else avatar.textContent = '?';
        button.replaceChildren(avatar, text);
      } else if (v.maps) {
        const note = document.createElement('small');
        note.className = 'choice-note';
        note.textContent = v.local
          ? 'อยู่ในแมพต้นทาง'
          : v.maps.slice(0, 2).join(' · ') + (v.maps.length > 2 ? ' และแมพอื่น' : '');
        button.append(note);
      }
      button.onclick = () => {
        el(input).value = v.name;
        hideSuggestions(input, list);
        onSelect(v);
      };
      el(list).append(button);
    });
  };
  el(input).oninput = () => {
    onEdit();
    render();
  };
  el(input).onfocus = render;
  el(input).onclick = render;
  el(input).onkeydown = e => {
    const buttons = [...el(list).children];
    if (e.key === 'Escape') {
      hideSuggestions(input, list);
      return;
    }
    if (!el(list).hidden && buttons.length && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
      e.preventDefault();
      if (e.key === 'Enter') {
        buttons[Math.max(0, active)].click();
        return;
      }
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons.forEach((b, i) => b.setAttribute('aria-selected', String(i === active)));
      el(input).setAttribute('aria-activedescendant', buttons[active].id);
    } else if (e.key === 'Enter' && input === 'query') results();
  };
}
autocomplete(
  'origin-query',
  'origin-suggestions',
  () => 'map',
  () => {
    el('start').value = '';
    el('query').disabled = true;
    el('find').disabled = true;
    el('journey').replaceChildren();
    el('results').replaceChildren();
    hideSuggestions('query', 'suggestions');
    el('status').textContent = 'เลือกแมพต้นทางจากรายการแนะนำ';
  },
  v => {
    el('start').value = v.id;
    el('query').disabled = false;
    el('find').disabled = false;
    el('status').textContent = 'ต้นทาง: ' + v.name + ' — ค้นหาปลายทางได้เลย';
    if (selected) show(selected);
  }
);
autocomplete(
  'query',
  'suggestions',
  () => el('type').value,
  clear,
  v => {
    if (el('type').value === 'map') pickDestination(v.id);
    else results();
  }
);
el('find').onclick = results;
el('type').onchange = () => {
  el('query').value = '';
  el('query').placeholder =
    el('type').value === 'npc'
      ? 'เลือก NPC หรือพิมพ์ชื่อบางส่วน'
      : el('type').value === 'monster'
        ? 'เลือกมอนสเตอร์ หรือพิมพ์ชื่อบางส่วน'
        : 'พิมพ์ชื่อแมพปลายทาง';
  clear();
  hideSuggestions('query', 'suggestions');
};
document.addEventListener('click', e => {
  if (!e.target.closest('.search')) {
    hideSuggestions('query', 'suggestions');
    hideSuggestions('origin-query', 'origin-suggestions');
  }
});
bindMapZoom(el('journey'));
try {
  const bundle = await getBundle();
  await Promise.all([loadReference(), loadNpcProfiles(), loadMonsterProfiles()]);
  const data = bundle.mapData;
  el('planner').hidden = false;
  el('intro').hidden = true;
  maps = data.maps.sort((a, b) => a.name.localeCompare(b.name));
  byId = new Map(maps.map(m => [m.id, m]));
  el('origin-query').disabled = false;
  el('status').textContent = 'เริ่มจากพิมพ์ชื่อแมพที่คุณอยู่ แล้วเลือกจากรายการแนะนำ';
} catch {
  el('planner').hidden = true;
  el('intro').hidden = false;
  el('access-status').textContent = 'เข้าสู่ระบบด้วยบัญชีที่ซื้อไกด์ฉบับเต็มเพื่อใช้ระบบนำทาง';
}
onAccessChange(() => {
  maps = [];
  byId = new Map();
  clear();
  el('planner').hidden = true;
  el('intro').hidden = false;
});
