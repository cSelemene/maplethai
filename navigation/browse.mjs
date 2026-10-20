import { getBundle } from './navigation-data.mjs?v=608009c7ee';
let profiles = { npcs: [], images: {} };
let monsterProfiles = [];
export async function loadMonsterProfiles() {
  monsterProfiles = (await getBundle()).monsterProfiles.monsters;
}
export function monsterProfile(choice) {
  const mob =
    monsterProfiles.find(m => String(m.id) === String(choice.id)) ||
    monsterProfiles.find(m => m.name === choice.name);
  if (!mob) return { image: null, description: 'ยังไม่มีข้อมูลมอนสเตอร์' };
  const report = mob.mesos;
  const mesos =
    report?.trustedCount > 0 && Number.isFinite(report.medianMin) && Number.isFinite(report.medianMax)
      ? (report.medianMin === report.medianMax
          ? report.medianMin
          : report.medianMin + '–' + report.medianMax) + ' meso โดยประมาณ / ตัว'
      : 'meso: ยังไม่มีรายงาน';
  return {
    image: `https://meowdb.com/msclassic/monsters/sprites/mob_${mob.id}.png`,
    description: `Lv.${mob.level} · ${mob.exp.toLocaleString()} EXP / ตัว · ${mesos}`
  };
}
export async function loadNpcProfiles() {
  profiles = (await getBundle()).npcProfiles;
}
export function npcProfile(choice) {
  const npc =
    profiles.npcs.find(n => String(n.id) === String(choice.id)) ||
    profiles.npcs.find(n => n.name === choice.name);
  if (!npc) return { description: 'NPC', image: null };
  const roles = npc.roles || [],
    labels = [];
  if (roles.includes('Shopkeeper') || npc.shopFunction) {
    const places = (npc.maps || []).map(m => m.mapName).join(' '),
      shop = npc.shopFunction || '';
    labels.push(
      /Grocer|Mobile Store/i.test(shop)
        ? 'ขายยา / ของใช้ทั่วไป'
        : /Weapon/i.test(shop)
          ? 'ขายอาวุธ'
          : /Armor/i.test(shop)
            ? 'ขายเกราะ'
            : /Pharmacy/i.test(places)
              ? 'ขายยา'
              : /Weapon (Store|Shop)/i.test(places)
                ? 'ขายอาวุธ / อุปกรณ์'
                : /Armor/i.test(places)
                  ? 'ขายเกราะ'
                  : 'ร้านขายของทั่วไป'
    );
  }
  if (roles.includes('Job Instructor')) labels.push('เปลี่ยนอาชีพ');
  if (roles.includes('Transport')) labels.push('บริการเดินทาง');
  if (roles.includes('Storage')) labels.push('ฝากของ');
  if (roles.includes('Quest Giver') || (npc.quests || []).length || (npc.turnInQuests || []).length)
    labels.push('ให้เควส / รับส่งเควส');
  if (!labels.length) labels.push(roles.includes('Environmental') ? 'จุดโต้ตอบในแมพ' : 'ชาวเมือง');
  return { description: labels.join(' · '), image: profiles.images[npc.id] || null };
}
export function browseChoices(maps, type, origin) {
  const field = type === 'npc' ? 'npcs' : 'monsters',
    items = new Map();
  for (const map of maps)
    for (const entity of map[field] || []) {
      const name = entity.name || entity.displayName;
      if (!name) continue;
      let item = items.get(name);
      if (!item) {
        item = { name, id: entity.id, maps: [], local: false };
        items.set(name, item);
      }
      if (!item.maps.includes(map.name)) item.maps.push(map.name);
      if (map.id === origin) item.local = true;
    }
  return [...items.values()].sort(
    (a, b) => Number(b.local) - Number(a.local) || a.name.localeCompare(b.name)
  );
}
