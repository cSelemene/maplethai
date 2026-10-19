/* Bandit skill guide update: source supplied by owner, Classic World second test. */
const BANDIT_SKILL_VERSION = '20261011-v1';
const BANDIT_FINAL_BUILDS = [
  {name:'A · Steal + Recovery เต็ม',points:[20,30,20,1,20,30],fit:'อยากได้บัฟ Steal เต็มและช่วยประหยัดยา ยอมกด Booster บ่อย',cost:'Booster 1: บัฟ 100 วินาที ใช้ HP/MP อย่างละ 30 ต่อครั้ง'},
  {name:'B · Steal เต็ม + บัฟสะดวก',points:[20,30,20,20,1,30],fit:'อยากได้บัฟ Steal เต็มและกด Booster พร้อม Haste ทุก 5 นาที',cost:'Recovery 1: หลังหลบสำเร็จมีโอกาส 20% ฟื้น HP/MP เพียง 1%'},
  {name:'C · Recovery เต็ม + บัฟสะดวก',points:[20,30,20,20,20,11],fit:'ฟาร์มระยะประชิดนาน ๆ เน้นฟื้น HP/MP และไม่อยากกด Booster บ่อย',cost:'Steal 11: สำเร็จ 50% ได้ Attack Power +15 นาน 30 วินาที แทน +35 ที่เต็ม'},
];
const BANDIT_LEVEL_PLAN = [
  [30,30,'Dagger Mastery',1], [31,31,'Dagger Mastery',3],
  [32,32,'Dagger Mastery',1], [32,32,'Dagger Booster',1], [32,32,'Haste',1],
  [33,33,'Haste',3], [34,34,'Haste',1], [34,34,'Steal',1], [34,34,'Nimble Recovery',1],
  [35,41,'Savage Blow',3], [42,46,'Dagger Mastery',3], [47,49,'Savage Blow',3],
  [50,54,'Haste',3],
];
function banditSkillOptionsHTML(){
  const names=['Dagger Mastery','Savage Blow','Haste','Dagger Booster','Nimble Recovery','Steal'];
  return `<h3 class="sub-h">ขั้นแรก · เลือกมีดล้วน หรือปาดาวก่อน</h3>
  <div class="card band pad"><div class="btbl"><table><thead><tr><th>ทางเลือก</th><th>แต้มเมื่อจบขั้นแรก · 61 SP</th><th>เหมาะกับใคร / ข้อแลกเปลี่ยน</th></tr></thead><tbody>
  <tr><td>Pure Dagger · มีดตั้งแต่ต้น</td><td>Double Stab 20 · Nimble Body 15 · Disorder 6 · Dark Sight 20</td><td>ใช้มีดตาม Route นี้ได้เลย เริ่ม Double Stab 4 ก่อนถ้ายังไม่ขาด ACC แล้วค่อยตัดสินใจเพิ่ม Nimble Body เมื่อเริ่ม MISS</td></tr>
  <tr><td>Sindit · ปาดาวก่อนเปลี่ยนมีด</td><td>Lucky Seven 20 · Nimble Body 15 · Keen Eyes 3 · Disorder 3 · Dark Sight 20</td><td>ชอบตีไกลช่วงแรก ไม่ต้องรีเซ็ตสกิลตามแผนนี้ แต่ระยะดาวไม่เต็มและไม่มี Double Stab หลังเปลี่ยนอาชีพยังใช้ Claw + Lucky Seven จนมีดกับ Savage Blow พร้อม จังหวะเปลี่ยนขึ้นกับของที่มี</td></tr>
  </tbody></table></div><p>Dark Sight ต้องมี Disorder 3 ก่อน ทั้งสองแบบใช้ครบ 61 SP โดยไม่มีแต้มเหลือ ตาราง Route และ Timeline ด้านล่างเป็น Pure Dagger; Sindit อย่าใช้ลำดับ Double Stab ตาม Route</p></div>
  <h3 class="sub-h">ขั้นสอง · 3 ทางเลือกเมื่อ Lv.70</h3>
  <div class="card band pad"><p>ขั้นสองมี <b>121 SP</b> แต่เต็มทั้ง 6 สกิลต้องใช้ 140 SP จึงต้องลดรวม 19 แต้ม ทั้งสามแบบเต็ม Mastery 20 / Savage Blow 30 / Haste 20 เหมือนกัน</p>
  <div class="btbl"><table><thead><tr><th>สกิล</th>${BANDIT_FINAL_BUILDS.map(b=>`<th>${b.name}</th>`).join('')}</tr></thead><tbody>
  ${names.map((n,i)=>`<tr><td>${n}</td>${BANDIT_FINAL_BUILDS.map(b=>`<td class="num">${b.points[i]}</td>`).join('')}</tr>`).join('')}
  <tr><td>รวม SP</td>${BANDIT_FINAL_BUILDS.map(b=>`<td>${b.points.reduce((a,c)=>a+c,0)}</td>`).join('')}</tr>
  <tr><td>เหมาะกับ</td>${BANDIT_FINAL_BUILDS.map(b=>`<td>${b.fit}</td>`).join('')}</tr>
  <tr><td>สิ่งที่ต้องแลก</td>${BANDIT_FINAL_BUILDS.map(b=>`<td>${b.cost}</td>`).join('')}</tr></tbody></table></div>
  <p><b>Booster 1 ก็เร็วเต็ม 2 ขั้นแล้ว</b> แต้มเพิ่มช่วยให้บัฟนานขึ้นและใช้ HP/MP น้อยลง; Booster 20 อยู่ 300 วินาที ใช้อย่างละ 10 ส่วน Haste 20 ให้ Speed +30 / Jump +10 นาน 300 วินาที</p>
  <p><b>Recovery ไม่ฟื้นอัตโนมัติทุก 30 วินาที</b> ต้องหลบการโจมตีสำเร็จก่อน และสกิลไม่ติดคูลดาวน์ เมื่อเต็มจะฟื้น HP/MP อย่างละ 10% แล้วคูลดาวน์ 30 วินาที ประหยัดยาได้มากแค่ไหนขึ้นกับการหลบและ HP/MP ที่ขาด อย่าจงใจรับการโจมตีเพิ่ม</p>
  <p><b>Steal 30</b> สำเร็จ 90% ได้ Attack Power +35 นาน 30 วินาที และสตันเป้าหมายที่ขโมยสำเร็จ 1.5 วินาที โจมตีได้สูงสุด 2 ตัว ค่า Attack Power ไม่ใช่ Weapon Attack +35 ของมีด และผลต่อบอสยังไม่ยืนยัน</p></div>
  <h3 class="sub-h">Pure Dagger · ลำดับเปิดเครื่องมือก่อนเร่ง Savage Blow</h3>
  <div class="card band pad"><ol class="steps">
  <li>Lv.30: Mastery 1 → Lv.31: Mastery 4 → Lv.32: Mastery 5 / Booster 1 / Haste 1</li>
  <li>Lv.33: Haste 4 → Lv.34: Haste 5 / Steal 1 / Recovery 1 รวม 13 SP ขั้นสอง</li>
  <li>Lv.35–41: Savage Blow +3 ต่อเลเวล จนถึง 21 ที่ Lv.41 ได้ครบ 6 ฮิต</li>
  <li>Lv.42–46: Mastery +3 ต่อเลเวล จนเต็ม 20 → Lv.47–49: Savage Blow จนเต็ม 30</li>
  <li>Lv.50: Haste 8; รวม Mastery 20 / Savage Blow 30 / Haste 8 / Booster 1 / Steal 1 / Recovery 1 = 61 SP</li>
  <li>Lv.51–54: Haste จนเต็ม 20 จากนั้น Lv.55–70 มีอีก 48 SP: A ลง Steal +29 / Recovery +19; B ลง Steal +29 / Booster +19; C ลง Recovery +19 / Booster +19 / Steal +10 เลือกลงก่อนหลังตามความต้องการ และแบ่งแต้มในเลเวลที่สกิลเต็ม</li>
  </ol><p>ใช้ Double Stab 20 ระหว่างเตรียม Savage Blow: Double Stab รวม 320% / MP 16; Savage Blow 1 รวม 260% / MP 14, 11 รวม 325% / MP 19, 21 รวม 390% / MP 24, 30 รวม 450% / MP 28 ถ้า Double Stab ฆ่าได้ครั้งเดียวก็ใช้ต่อเพื่อประหยัด MP ตัวเลขเป็นผลรวมดาเมจที่ระบุ ไม่ใช่ดาเมจจริงหลัง DEF</p>
  <p>อยากได้ดาเมจสม่ำเสมอก่อน สามารถเต็ม Mastery เร็วขึ้น หรือเพิ่ม Haste ก่อนเพื่อเดินไวขึ้น แต่ Savage Blow 6 ฮิตจะช้ากว่า Lv.41 เป็นทางเลือก ไม่ใช่ลำดับที่ถูกต้องเพียงแบบเดียว</p>
  <p class="onote">อ้างอิงคำอธิบาย Bandit ที่ส่งมา ช่วง 16:01–21:13: ข้อมูล Classic World second test อาจเปลี่ยนเมื่อเปิดจริง ตัวเลขจำลองความแรงและประหยัดยาไม่ใช่ผลทดสอบเล่นจริง ไม่มีการยืนยันสกิลขั้นสามในแหล่งนี้</p></div>`;
}
BUILD.text.spRules = [
  '<b>Beginner</b> Three Snails / Recovery / Nimble Feet อย่างละ 3 ใช้แต้มคนละชุดกับสกิล Thief',
  '<b>ขั้นแรกมี 61 SP</b> เลือก Pure Dagger หรือ Sindit ตามตารางด้านล่าง ทั้งสองแบบไม่ต้องรีเซ็ต',
  '<b>Route หลักเป็น Pure Dagger</b> Double Stab เต็มก่อน แล้ว Nimble Body / Disorder / Dark Sight; หาก MISS บ่อยสามารถเร่ง Nimble Body ก่อน',
  '<b>ขั้นสองมี 121 SP</b> เปิด Mastery 5 → Booster 1 และ Haste 5 → Steal 1 พร้อม Recovery 1 ก่อนเร่ง Savage Blow ตามแผนหลัก',
  '<b>เลือกสิ่งที่ให้ความสำคัญ</b> Steal / Recovery / ระยะเวลาบัฟ Booster เพราะแต้มไม่พอเต็มทุกสกิล',
];
BUILD.sp = [
  {n:'Double Stab',d:'มีดล้วน · MAX 20',seg:[[10,17,20]]},
  {n:'Nimble Body',d:'MAX 15',seg:[[17,22,15]]},
  {n:'Disorder',d:'ปลด Dark Sight ก่อน',seg:[[22,23,3],[30,30,6]]},
  {n:'Dark Sight',d:'MAX 20',seg:[[23,29,20]]},
  {n:'Dagger Mastery',d:'เปิด Booster แล้วกลับมาเต็ม',seg:[[30,32,5],[42,46,20]]},
  {n:'Dagger Booster',d:'1 แต้มก็เร็วเต็ม',seg:[[32,32,1]]},
  {n:'Haste',d:'ปลด Steal แล้วเต็ม Lv.54',seg:[[32,34,5],[50,50,8]]},
  {n:'Steal',d:'บัฟเมื่อขโมยสำเร็จ',seg:[[34,34,1]]},
  {n:'Nimble Recovery',d:'ต้องหลบสำเร็จ',seg:[[34,34,1]]},
  {n:'Savage Blow',d:'6 ฮิต Lv.41 / MAX Lv.49',seg:[[35,41,21],[47,49,30]]},
];
const banditRouteSP = {
  35:'Lv.30 ลง Disorder เพิ่ม 3 รวม 6 เพื่อใช้ครบ 61 SP ขั้นแรก เมื่อเปลี่ยนเป็น Bandit ลง Mastery 1 (แต้มขั้นสองคนละชุด)',
  36:'Lv.31 ลง Mastery +3 รวม 4',
  37:'Lv.32 ลง Mastery +1 รวม 5 / Booster 1 / Haste 1',
  38:'Lv.33 ลง Haste +3 รวม 4; Lv.34 ลง Haste 5 / Steal 1 / Nimble Recovery 1; Lv.35 ลง Savage Blow 3',
  39:'Lv.36 ลง Savage Blow 6 และ Lv.37 ลงถึง 9 ใช้ Double Stab 20 ระหว่างเตรียม Savage Blow',
  40:'Lv.38–41 ลง Savage Blow +3 ต่อเลเวลเป็น 12 / 15 / 18 / 21 ได้ 6 ฮิตที่ Lv.41 จากนั้น Lv.42–46 ลง Mastery +3 ต่อเลเวลเป็น 8 / 11 / 14 / 17 / 20 ใช้ Double Stab ต่อได้ถ้าฆ่ามอนครั้งเดียวเพื่อประหยัด MP',
  41:'Lv.46 Mastery เต็ม 20 ตามแผนหลัก ยังมี Savage Blow 21',
  42:'Lv.47–49 ลง Savage Blow เป็น 24 / 27 / 30; Lv.50 ลง Haste ถึง 8 เลือกแผน A/B/C ใน Builds สำหรับ Lv.51–70',
};
for (const [i,sp] of Object.entries(banditRouteSP)) S[Number(i)].sp = sp;
