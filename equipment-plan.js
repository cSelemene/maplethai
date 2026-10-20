import { ITEMS } from './equipment-data.js?v=8d89249229';
const tier = (level, items, note) => ({ level, items, note });
const thief = [
  tier(
    10,
    [723, 950, 1170, 959, 1179],
    'เริ่มจากของที่ใส่ได้ตามสเตตัส ยังไม่ต้องซื้อทุกชิ้น ถ้าของเดิมตีมอนได้สบาย'
  ),
  tier(
    15,
    [760, 969, 1185],
    'หมวกยังเพิ่ม LUK เท่าเดิม เปลี่ยนเมื่ออยากได้พลังป้องกัน ไม่ใช่ของที่ต้องซื้อทันที'
  ),
  tier(20, [777, 987, 1203, 998, 1214], 'ชุดช่วงนี้เพิ่ม LUK +2 ต่อชิ้น เป็นจุดที่ควรเทียบกับของ Lv.10–15'),
  tier(
    25,
    [804, 1224, 1020, 1231, 1462],
    'ชุดหญิง Dark Sneak เพิ่ม LUK +2 แต่เสื้อชาย Black Sneak เพิ่ม DEX +1 / LUK +1 จึงยังใช้ Black Pao ที่มี LUK +2 ต่อได้ กางเกงใหม่ยัง LUK +2 เท่าเดิม ได้พลังป้องกันเพิ่ม'
  ),
  tier(
    35,
    [845, 1048, 1264],
    'ชุดชาย Black Knucklevest เพิ่ม LUK +3 ต่อชิ้น ชุดหญิงที่แนะนำยังใช้ Dark Sneak ต่อได้'
  ),
  tier(
    40,
    [864, 1065, 1281, 1074, 1290],
    'Dark Shadow เพิ่ม LUK +4 ต่อชิ้น เทียบค่าสเตตัสจริงกับชุดที่สกอลล์แล้วก่อนเปลี่ยน'
  ),
  tier(
    50,
    [],
    'เก็บ Dark Shadow Lv.40 ใช้ต่อได้ ไม่จำเป็นต้องซื้อชุด Lv.50 ถ้าค่า LUK ลดลง เงินส่วนนี้อาจคุ้มกว่าถ้าใช้กับอาวุธ'
  )
];
const weapons = {
  bandit: [
    [10, 560],
    [15, 562],
    [20, 564],
    [25, 566],
    [30, 569],
    [35, 570],
    [40, 571],
    [50, 574]
  ],
  assassin: [
    [10, 680],
    [15, 682],
    [20, 686],
    [25, 688],
    [30, 689],
    [35, 692],
    [40, 695],
    [50, 702]
  ],
  mage: [
    [10, 648],
    [15, 650],
    [20, 651],
    [25, 652],
    [30, 653],
    [35, 654],
    [50, 656]
  ]
};
const mage = [
  tier(
    10,
    [727, 944, 1166, 953, 1173, 917],
    'ดู M.ATK ของไม้เท้าและ INT ของชุดเป็นหลัก ค่า W.ATK ไม่ใช่พลังโจมตีเวท'
  ),
  tier(15, [750, 1092, 973, 1189], 'Blue Plain Robe เป็นชุดเต็มตัว จึงใช้แทนเสื้อและกางเกงพร้อมกัน'),
  tier(20, [768, 981, 1199, 991, 1207], 'เสื้อและท่อนล่างเพิ่ม INT +2 ต่อชิ้น รวม +4 เมื่อใส่คู่กัน'),
  tier(25, [1099, 1102], 'Blue Doros / Brown Doroness เพิ่ม INT +5 และเป็นชุดเต็มตัว ใช้แทนเสื้อกับท่อนล่าง'),
  tier(
    30,
    [814, 1107],
    'หมวก Brown Jester เพิ่ม INT +3 ชุดชาย Blue Wizard Robe เพิ่ม INT +6 ส่วนชุดหญิงใช้ Doroness ต่อได้'
  ),
  tier(
    35,
    [1120],
    'Blue Chaos Robe ยังเพิ่ม INT +6 เท่า Blue Wizard Robe เปลี่ยนเพื่อพลังป้องกันหรือ MP ได้ แต่ไม่ต้องรีบซื้อ'
  ),
  tier(
    40,
    [1133, 1138],
    'Blue Starlight / Blue Moonlight เพิ่ม INT +8 ใช้ไม้เท้า Wizard ต่อได้ถ้ายังไม่มีชิ้นที่ M.ATK ดีกว่า'
  ),
  tier(
    50,
    [877, 1142, 1149],
    'Cromi เป็นจุดเปลี่ยนไม้เท้าถัดไป ชุดเต็มตัวเพิ่ม INT +10 ต้องตรวจ LUK ที่ต้องใช้ก่อนซื้อ'
  )
];
// Spearman (polearm): armour and weapons together, one list per checkpoint.
const spearman = [
  tier(
    10,
    [724, 942, 1164, 951, 1171, 640],
    'ซื้อ Pole Arm ก่อนเป็นอย่างแรก ชุด Lv.10 จาก Harry ใน Perion ไม่บังคับ ถ้าเงินไม่พอให้รอซื้อชุด Lv.15 ทีเดียว'
  ),
  tier(
    15,
    [743, 965, 1183, 1094, 1321, 641],
    'ชุด Lv.15 ของ Harry รวมราว 9,000 meso ช่วยลดค่ายาได้มาก Iron Ball ต้องมี DEX 15 รวมชุด ใส่ได้ราวเลเวล 17'
  ),
  tier(
    20,
    [765, 1096, 988, 1204, 1335],
    'หมวกและรองเท้า DEX +2 ทำให้ถึงเกณฑ์ DEX ของ polearm เล่มถัดไป Red Kendo Robe ไม่บังคับ ใช้ชุด Lv.15 ต่อได้'
  ),
  tier(
    25,
    [1350, 643],
    "Mithril War Boots ได้ฟรีจากเควสของ Nella ส่วน Janitor's Mop คราฟต์ได้เมื่อ Weaponcrafting ถึง 5 ถ้าไม่มีใช้อาวุธเดิมต่อ"
  ),
  tier(
    30,
    [812, 1106, 1112, 644],
    'Mithril Pole Arm คืออัปเกรดที่คุ้มที่สุดของช่วงนี้ ซื้อจากผู้เล่นราว 15,800 meso ชุดเกราะใช้ของเดิมต่อได้'
  ),
  tier(35, [829, 1117, 1123, 645], 'ชุด STR +6 เป็นตัวเลือก ถ้างบไม่พอใช้ Sauna Robe จากเควสหรือชุดเดิมต่อ'),
  tier(
    40,
    [847, 1404, 646],
    'Steel Nordic Helm ได้ฟรีจากเควส Cursed Dolls ส่วน Crescent Polearm คราฟต์ด้วย Weaponcrafting 8 หรือซื้อจากผู้เล่น'
  ),
  tier(
    50,
    [873, 647],
    'Bronze Crusader Helm ได้จากเควสของ Luke ไม่บังคับ The Nine Dragons ดรอปอย่างเดียว ถ้าแพงใช้ Crescent Polearm ต่อได้'
  )
];
// Fighter (two-handed axe): armour and weapons together, one list per checkpoint.
const fighter = [
  tier(
    10,
    [724, 942, 1164, 951, 1171, 617],
    'ซื้อ Metal Axe ก่อนเป็นอย่างแรก ชุด Lv.10 จาก Harry ใน Perion ไม่บังคับ ถ้าเงินไม่พอให้รอซื้อชุด Lv.15 ทีเดียว'
  ),
  tier(
    15,
    [743, 965, 1183, 1094, 1321],
    'ชุด Lv.15 ของ Harry รวมราว 9,000 meso ช่วยลดค่ายาได้มาก ขวานสองมือไม่มีเล่มเลเวล 15 ใช้ Metal Axe ต่อ'
  ),
  tier(
    20,
    [765, 1096, 988, 1204, 1335],
    'หมวกและรองเท้า DEX +2 ทำให้ DEX ถึง 25 พอใส่ Two-Handed Axe Iron Axe แรงกว่า Metal Axe แค่ 5 ไม่ต้องซื้อ'
  ),
  tier(
    25,
    [1350, 620],
    'Two-Handed Axe แรงกว่า Metal Axe 15 ใช้ได้ถึงเลเวล 35 ผู้เล่นขายราว 10,000 meso ถูกกว่าร้าน Mithril War Boots ได้ฟรีจากเควสของ Nella'
  ),
  tier(
    30,
    [812, 1106, 1112],
    'ใช้ Two-Handed Axe ต่อ Blue Axe (Lv.30) แทบไม่มีคนขาย ไม่ต้องตามหา ชุดเกราะใช้ของเดิมต่อได้'
  ),
  tier(
    35,
    [829, 1117, 1123, 622],
    'Niam คืออัปเกรดใหญ่ของช่วงนี้ คราฟต์ด้วย Weaponcrafting 7 หรือซื้อจากผู้เล่น ชุด STR +6 เป็นตัวเลือก'
  ),
  tier(
    40,
    [847, 1404, 623],
    'Steel Nordic Helm ได้ฟรีจากเควส Cursed Dolls ส่วน Sabretooth คราฟต์ด้วย Weaponcrafting 8 หรือซื้อจากผู้เล่น'
  ),
  tier(
    50,
    [873, 624],
    'Bronze Crusader Helm ได้จากเควสของ Luke ไม่บังคับ The Rising ดรอปอย่างเดียว ถ้าแพงใช้ Sabretooth ต่อได้'
  )
];
// Page (two-handed blunt weapon): armour and weapons together, one list per checkpoint.
const page = [
  tier(
    10,
    [724, 942, 1164, 951, 1171, 625],
    'ซื้อ Wooden Mallet ก่อนเป็นอย่างแรก ชุด Lv.10 จาก Harry ใน Perion ไม่บังคับ ถ้าเงินไม่พอให้รอซื้อชุด Lv.15 ทีเดียว'
  ),
  tier(
    15,
    [743, 965, 1183, 1094, 1321],
    'ชุด Lv.15 ของ Harry รวมราว 9,000 meso ช่วยลดค่ายาได้มาก Heavy Mace แพงเกินไป ใช้ Wooden Mallet ต่อถึงเลเวล 20'
  ),
  tier(
    20,
    [765, 1096, 988, 1204, 1335, 627],
    'Square Hammer แรงกว่า Wooden Mallet 10 ต้องมี DEX 20 หมวกหรือรองเท้า DEX +2 ทำให้ถึง'
  ),
  tier(
    25,
    [1350, 628],
    'Monkey Wrench คราฟต์ด้วย Weaponcrafting 5 ถ้าไม่ได้ปั๊มใช้ Square Hammer ต่อ Mithril War Boots ได้ฟรีจากเควสของ Nella'
  ),
  tier(
    30,
    [812, 1106, 1112, 629],
    'Mithril Maul ซื้อจากผู้เล่นราว 15,000 meso ต้องมี DEX 30 ชุดเกราะใช้ของเดิมต่อได้'
  ),
  tier(
    35,
    [829, 1117, 1123, 630],
    'Sledgehammer คืออัปเกรดใหญ่ของช่วงนี้ คราฟต์ด้วย Weaponcrafting 7 หรือซื้อจากผู้เล่น ชุด STR +6 เป็นตัวเลือก'
  ),
  tier(
    40,
    [847, 1404, 631],
    'Steel Nordic Helm ได้ฟรีจากเควส Cursed Dolls ส่วน Titan คราฟต์ด้วย Weaponcrafting 8 หรือซื้อจากผู้เล่น'
  ),
  tier(
    50,
    [873, 632],
    'Bronze Crusader Helm ได้จากเควสของ Luke ไม่บังคับ Golden Mole ดรอปอย่างเดียว ถ้าแพงใช้ Titan ต่อได้'
  )
];
const hunter = [
  tier(
    10,
    [663, 731, 946, 955, 1180, 1175, 1314],
    "Beginner's War Bow (ATK 29) ที่ได้ตอนเปลี่ยนอาชีพ แรงน้อยกว่า War Bow ในร้านแค่ 1 จึงไม่ต้องซื้อ ใช้เงินซื้อลูกธนูและชุด Lv.10 จาก Sam แทน"
  ),
  tier(
    15,
    [665, 751, 966, 974, 1180, 1190, 1324, 1439],
    'Composite Bow ต้องมี STR 15 ซึ่งแผน AP นี้มีพอดีที่เลเวล 15 ชุดเกราะซื้อจาก Sam ใน Henesys ตัวละครหญิงใช้ Green Able Armor คู่ Green Able Armor Skirt'
  ),
  tier(
    20,
    [666, 665, 771, 984, 994, 1215, 1209, 1324, 1449, 1439],
    "Hunter's Bow (ATK 42) แรงกว่า Composite Bow 7 คุ้มกับราคา 13,500 meso ชุด Lv.20 ของ Sam ให้ DEX เพิ่มรวมราว 5 แต้ม"
  ),
  tier(
    25,
    [666, 667, 798, 789, 1006, 1003, 1215, 1209, 1357, 1324, 1457, 1449],
    "Battle Bow (ATK 44) ยิงเร็วขึ้นหนึ่งขั้น แต่ไม่บังคับ ใช้ Hunter's Bow ต่อแล้วเก็บเงินไว้ทำ Ryden ตอนเลเวล 30 ได้ รองเท้า Brown Jack Boots ได้จากสายเควสของ Nella"
  ),
  tier(
    30,
    [668, 666, 818, 798, 1023, 1006, 1003, 1238, 1215, 1357, 1380, 1470, 1457],
    "Ryden ไม่มีขายจาก NPC แล้ว คราฟต์ด้วย Woodcrafting Lv.6 หรือซื้อจากผู้เล่น ถ้ายังไม่มีใช้ Hunter's Bow ต่อได้ ชุดเกราะ Lv.30 ส่วนใหญ่ต้องดรอปหรือคราฟต์ ใช้ชุด Lv.25 ต่อได้"
  ),
  tier(
    35,
    [669, 668, 831, 818, 1105, 1111, 1041, 1257, 1357, 1380, 1482, 1470],
    'Red Viper ต้องใช้ Woodcrafting Lv.7 ถ้าคราฟต์ไม่ได้ ใช้ Ryden ต่อถึงเลเวล 40 Sauna Robe ได้ตอนเลเวล 37 ใส่แทนเสื้อและกางเกงได้'
  ),
  tier(
    40,
    [670, 669, 859, 1105, 1111, 1041, 1070, 1285, 1357, 1380, 1493, 1482],
    'Vaulter 2000 ต้องใช้ Woodcrafting Lv.8 และ Drake Skull 40 ชิ้น ถ้าคราฟต์ไม่ได้ซื้อจากผู้เล่น หรือใช้อาวุธเดิมต่อ'
  ),
  tier(
    45,
    [670, 859, 1105, 1111, 1041, 1357, 1380, 1493, 1482],
    'Olympus (Lv.50) ดรอปจากมอนเท่านั้น ถ้าไม่เจอใช้ Vaulter 2000 ต่อ'
  )
];
const crossbowman = [
  tier(
    10,
    [672, 731, 946, 955, 1180, 1175, 1314],
    "ใช้ Beginner's War Bow ที่ได้ฟรีไปก่อน crossbow เล่มแรกที่ควรซื้อคือ Battle Crossbow ตอนเลเวล 15 สกิลขั้นแรกใช้กับ bow และ crossbow ได้เหมือนกัน"
  ),
  tier(
    15,
    [673, 751, 966, 974, 1180, 1190, 1324, 1439],
    'Battle Crossbow ไม่ต้องใช้ STR ใส่ได้ทันทีที่เลเวล 15 เปลี่ยนลูกธนูเป็น Arrows for Crossbows ด้วย ตัวละครหญิงใช้ Green Able Armor คู่ Green Able Armor Skirt'
  ),
  tier(
    20,
    [673, 674, 771, 984, 994, 1215, 1209, 1324, 1449, 1439],
    'Balanche (ATK 39) แรงกว่า Battle Crossbow แค่ 2 ให้เก็บเงินไว้ซื้อ Mountain Crossbow (ATK 47) ตอนเลเวล 25 ชุด Lv.20 ของ Sam ให้ DEX เพิ่มรวมราว 5 แต้ม'
  ),
  tier(
    25,
    [675, 673, 798, 789, 1006, 1003, 1215, 1209, 1357, 1324, 1457, 1449],
    'Mountain Crossbow (ATK 47) แรงกว่า Battle Crossbow 10 ซื้อจาก Karl ราคา 16,500 meso รองเท้า Brown Jack Boots ได้จากสายเควสของ Nella'
  ),
  tier(
    30,
    [676, 675, 818, 798, 1023, 1006, 1003, 1238, 1215, 1357, 1380, 1470, 1457],
    'Eagle Crow ไม่มีขายจาก NPC แล้ว คราฟต์ด้วย Woodcrafting Lv.6 หรือซื้อจากผู้เล่น ถ้ายังไม่มีใช้ Mountain Crossbow ต่อได้ ATK ต่างกันแค่ 5'
  ),
  tier(
    35,
    [676, 675, 831, 818, 1105, 1111, 1041, 1257, 1357, 1380, 1482, 1470],
    'crossbow เลเวล 35 ไม่มีให้ซื้อหรือคราฟต์ ใช้ Eagle Crow ต่อถึงเลเวล 40 Sauna Robe ได้ตอนเลเวล 37 ใส่แทนเสื้อและกางเกงได้'
  ),
  tier(
    40,
    [677, 676, 859, 1105, 1111, 1041, 1070, 1285, 1357, 1380, 1493, 1482],
    'Heckler ต้องใช้ Woodcrafting Lv.8 และยิงเร็วกว่า crossbow อื่น (Normal) ถ้าคราฟต์ไม่ได้ซื้อจากผู้เล่น หรือใช้ Eagle Crow ต่อ'
  ),
  tier(
    45,
    [677, 678, 859, 1105, 1111, 1041, 1357, 1380, 1493, 1482],
    'Silver Crow (Lv.45) และ Rower (Lv.50) ดรอปจากมอนเท่านั้น ถ้าไม่เจอใช้ Heckler ต่อ'
  )
];
export const PLANS = Object.fromEntries(
  Object.keys(weapons)
    .map(guide => {
      const levels = new Set([
        ...(guide === 'mage' ? mage : thief).map(x => x.level),
        ...weapons[guide].map(x => x[0]),
        ...(guide === 'bandit' ? [22] : [])
      ]);
      return [
        guide,
        [...levels]
          .sort((a, b) => a - b)
          .map(level => {
            const base = (guide === 'mage' ? mage : thief).find(x => x.level === level);
            return tier(
              level,
              [
                ...(base?.items || []),
                ...weapons[guide].filter(x => x[0] === level).map(x => x[1]),
                ...(guide === 'bandit' && level === 10 ? [917] : []),
                ...(guide === 'bandit' && level === 22 ? [922] : [])
              ],
              base?.note ||
                (level === 22
                  ? 'Nimble Wristguard เป็นโล่โจร Lv.22 ใช้กับมีดได้ เพิ่มพลังป้องกัน ไม่ได้เพิ่ม LUK'
                  : 'เน้นเทียบพลังโจมตีของอาวุธกับชิ้นเดิม โดยเฉพาะชิ้นที่สกอลล์แล้ว')
            );
          })
      ];
    })
    .concat([
      ['spearman', spearman],
      ['fighter', fighter],
      ['page', page],
      ['hunter', hunter],
      ['crossbowman', crossbowman]
    ])
);
// F/P uses the same wands, shield and robes as I/L.
PLANS.fp = PLANS.mage;
PLANS.cleric = PLANS.mage;
export function equipmentAt(guide, level, gender = 'male') {
  if (!PLANS[guide]) return { current: [], next: null, checkpoints: [] };
  const checkpoints = PLANS[guide].filter(x => x.level <= level),
    slots = new Map();
  for (const t of checkpoints)
    for (const id of t.items) {
      const item = ITEMS[id];
      if (item.gender !== 'any' && item.gender !== gender) continue;
      if (item.slot === 'Overall') {
        slots.delete('Top');
        slots.delete('Bottom');
      } else if (['Top', 'Bottom'].includes(item.slot)) slots.delete('Overall');
      slots.set(item.slot, { ...item, checkpoint: t.level });
    }
  return { current: [...slots.values()], next: PLANS[guide].find(x => x.level > level) || null, checkpoints };
}
