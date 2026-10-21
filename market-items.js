export const STAT_LABELS = {
  atk: 'ATK',
  matk: 'M.ATK',
  def: 'DEF',
  mdef: 'M.DEF',
  str: 'STR',
  dex: 'DEX',
  int: 'INT',
  luk: 'LUK',
  hp: 'HP',
  mp: 'MP',
  acc: 'Accuracy',
  avoid: 'Avoidability',
  speed: 'Speed',
  jump: 'Jump'
};
// item_stats hold each stat's difference from the item's standard value (+2, +0, -1), not the total.
export const STAT_DIFF_MAX = { hp: 999, mp: 999 };
export const formatStatDiff = value => (Number(value) >= 0 ? '+' : '') + Number(value);
export function parseStatDiff(key, text) {
  const value = String(text)
    .trim()
    .replace(/^[\u2212\u2013]/, '-');
  if (!/^[+-]?\d{1,3}$/.test(value)) return null;
  const number = Number(value);
  return Math.abs(number) <= (STAT_DIFF_MAX[key] || 99) ? number : null;
}
const weapons = new Set([
  'Bow',
  'Crossbow',
  'Claw',
  'Dagger',
  'One-Handed Axe',
  'One-Handed Blunt Weapon',
  'One-Handed Sword',
  'Polearm',
  'Spear',
  'Staff',
  'Two-Handed Axe',
  'Two-Handed Blunt Weapon',
  'Two-Handed Sword',
  'Wand'
]);
export function itemCategory(item) {
  if (item?.type === 'Equip') return weapons.has(item.subtype) ? 'weapon' : 'armor';
  if (item?.subtype === 'Scroll') return 'scroll';
  if (item?.type === 'Etc') return 'material';
  if (item?.type === 'Use') return 'consumable';
  return 'other';
}
export function itemFields(item) {
  if (item?.type !== 'Equip') return [];
  if (['Staff', 'Wand'].includes(item.subtype)) return ['matk', 'atk', 'int', 'luk', 'mdef', 'hp', 'mp'];
  if (weapons.has(item.subtype)) return ['atk', 'str', 'dex', 'int', 'luk', 'acc', 'speed'];
  if (item.subtype === 'Shield')
    return ['def', 'mdef', 'str', 'dex', 'int', 'luk', 'hp', 'mp', 'acc', 'avoid'];
  if (item.subtype === 'Gloves')
    return ['def', 'atk', 'matk', 'str', 'dex', 'int', 'luk', 'acc', 'avoid', 'hp', 'mp'];
  return ['def', 'mdef', 'str', 'dex', 'int', 'luk', 'hp', 'mp', 'acc', 'avoid', 'speed', 'jump'];
}
export const itemUrl = item => 'https://meowdb.com/msclassic/item-db/' + item.id;
export function findItems(items, query) {
  const text = query
    .trim()
    .toLowerCase()
    .replace(/steelies/g, 'steely')
    .replace(/ilbis/g, 'ilbi');
  if (!text) return [];
  const words = text.split(/\s+/);
  return items
    .filter(i => words.every(w => i.name.toLowerCase().includes(w)))
    .sort(
      (a, b) =>
        Number(b.name.toLowerCase() === text) - Number(a.name.toLowerCase() === text) ||
        Number(b.name.toLowerCase().startsWith(text)) - Number(a.name.toLowerCase().startsWith(text)) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 12);
}
