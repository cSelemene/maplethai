// Editorial matching weights, not a DPS ranking. Guide availability never affects scoring.
// Scope: Classic World first and second jobs, checked 2026-10-11.
export const CLASSES = [
 {id:'fighter',name:'Fighter',thai:'นักรบสายดาบ / ขวาน',family:'Warrior',source:'fighter',summary:'ชอบเข้าประชิด ใช้ท่าโจมตีตรงไปตรงมา แล้วเสริมแรงด้วย Rage',strength:'Rage เพิ่มพลังโจมตี และ Rush ช่วยขยับเข้าหากลุ่มมอน',tradeoff:'ช่วงอาชีพขั้นสองยังใช้ Power Strike และ Slash Blast เป็นหลัก จังหวะเก็บเวลจึงค่อนข้างซ้ำ'},
 {id:'page',name:'Page',thai:'นักรบสายดาบ / กระบอง',family:'Warrior',source:'page',summary:'เข้าประชิดเหมือนนักรบ แต่ชอบมีเครื่องมือกดดันมอนด้วย Threaten',strength:'Threaten ช่วยลดความสามารถของศัตรู เหมาะกับคนที่ชอบดีบัฟมากกว่าบัฟโจมตี',tradeoff:'ท่าโจมตีหลักยังคล้าย Warrior และยังไม่มีเวทธาตุของ White Knight ในช่วงขั้นสอง'},
 {id:'spearman',name:'Spearman',thai:'นักรบสายหอก / ทวน',family:'Warrior',source:'spearman',summary:'ชอบอาวุธด้ามยาว เข้าประชิดแต่มีระยะตีมากกว่านักรบสายอื่น',strength:'หอกและทวนมีระยะเอื้อมยาวในกลุ่ม Warrior และใช้ Rush จัดกลุ่มมอนได้',tradeoff:'ยังใช้ท่าโจมตีจากขั้นแรกเป็นหลัก และ Iron Will เป็นบัฟตัวเอง'},
 {id:'il',name:'I/L Wizard',thai:'เมจน้ำแข็ง / สายฟ้า',family:'Magician',source:'i-l-wizard',guide:'mage',art:'mage',summary:'ชอบวาร์ปไปตามแมพ แช่แข็งมอน และใช้สายฟ้าโจมตีเป็นกลุ่ม',strength:'Teleport คล่องตัว มี Cold Beam แช่แข็งและ Thunder Bolt โจมตีหลายเป้าหมาย',tradeoff:'ต้องดูแล MP และเลือกมอนให้เหมาะกับธาตุ ไม่ได้เด่นด้านตีเป้าเดี่ยวทุกสถานการณ์'},
 {id:'fp',name:'F/P Wizard',thai:'เมจไฟ / พิษ',family:'Magician',source:'f-p-wizard',summary:'ชอบเล่นกับธาตุไฟและพิษ มากกว่าต้องทำดาเมจทั้งหมดในครั้งเดียว',strength:'ใช้ Fire Arrow ตีเป้าเดี่ยว มี Poison Breath และ Teleport ให้จัดจังหวะการสู้',tradeoff:'พิษมีจังหวะรอให้ทำงาน จึงต้องยอมรับการเก็บเวลที่ต่างจากท่าโจมตีทันที'},
 {id:'cleric',name:'Cleric',thai:'เมจสายฮีล',family:'Magician',source:'cleric',summary:'สนุกกับการช่วยให้ปาร์ตี้เล่นสบายขึ้น และฟาร์มมอนที่เข้าทางเวทศักดิ์สิทธิ์',strength:'Heal ฟื้น HP ให้คนใกล้ตัวและทำดาเมจกับ undead ส่วน Bless ช่วยปาร์ตี้',tradeoff:'การโจมตีขึ้นกับชนิดมอนมาก โดยเฉพาะ Heal ที่ใช้ทำดาเมจกับ undead'},
 {id:'hunter',name:'Hunter',thai:'นักธนู',family:'Bowman',source:'hunter',summary:'ชอบยิงจากระยะไกล แล้วคุมกลุ่มมอนด้วย Arrow Bomb',strength:'Arrow Bomb โจมตีหลายเป้าหมายพร้อมโอกาสสตัน เหมาะกับแมพที่มอนอยู่รวมกัน',tradeoff:'ต้องรักษาระยะ เพราะเมื่อมอนชิดตัวอาจกลายเป็นการฟาดด้วยธนู'},
 {id:'crossbowman',name:'Crossbowman',thai:'นักหน้าไม้',family:'Bowman',source:'crossbowman',summary:'ชอบเล็งจังหวะยิงแรง ๆ และหามุมให้มอนเรียงเป็นแนวเดียวกัน',strength:'Iron Arrow ยิงทะลุมอนหลายตัวที่เรียงกันเป็นแนวตรง',tradeoff:'จังหวะยิงค่อนข้างช้า และพื้นที่แคบหรือมอนชิดตัวทำให้เล่นยากขึ้น'},
 {id:'assassin',name:'Assassin',thai:'โจรปาดาว',family:'Thief',source:'assassin',guide:'assassin',art:'assassin',summary:'ชอบกระโดด ปาดาว แล้วขยับหาตำแหน่งโจมตีใหม่อยู่เรื่อย ๆ',strength:'โจมตีระยะไกลและมี Haste เพิ่มความเร็วกับการกระโดด',tradeoff:'ต้องเตรียมดาวและคุมงบอุปกรณ์ อีกทั้งยังไม่มีท่าโจมตีหมู่ในอาชีพขั้นสอง'},
 {id:'bandit',name:'Bandit',thai:'โจรมีด',family:'Thief',source:'bandit',guide:'bandit',art:'bandit',summary:'ชอบเข้าประชิดแล้วแทงต่อเนื่องหลายฮิต มากกว่ายืนยิงจากระยะไกล',strength:'Savage Blow โจมตีหลายฮิตใส่เป้าหมายเดียว ใช้โล่ได้ และมี Haste',tradeoff:'ระยะโจมตีสั้น ต้องเข้าใกล้มอน และต้องสะสม SP ก่อน Savage Blow จะครบหลายฮิต'}
];
export const QUESTIONS = [
 {title:'อยากสู้กับมอนจากระยะไหน?',options:[
  {text:'เข้าประชิด ตีต่อหน้ากันเลย',reason:'คุณชอบการต่อสู้ระยะประชิด',weights:{fighter:4,page:4,spearman:4,bandit:4}},
  {text:'ยืนห่างหน่อย ยิงหรือปาดาว',reason:'คุณชอบโจมตีจากระยะไกล',weights:{hunter:4,crossbowman:4,assassin:4}},
  {text:'ใช้เวท ระยะไหนก็ได้ถ้าสกิลสนุก',reason:'คุณอยากใช้เวทเป็นหลัก',weights:{il:4,fp:4,cleric:4}},
  {text:'ยังไม่ติดเรื่องระยะ ขอเล่นแล้วเพลิน',weights:{}}
 ]},
 {title:'ตอนเล่น อะไรทำให้รู้สึกสนุกที่สุด?',options:[
  {text:'กวาดมอนหลายตัวในรอบเดียว',reason:'คุณชอบโจมตีมอนเป็นกลุ่ม',weights:{il:4,hunter:4,crossbowman:3,fighter:2,page:2,spearman:2,fp:2}},
  {text:'จัดการเป้าหมายเดียวให้สะใจ',reason:'คุณชอบเน้นเป้าหมายทีละตัว',weights:{bandit:4,assassin:4,fp:2,fighter:2}},
  {text:'ฮีลเพื่อน ให้ปาร์ตี้ไปต่อได้',reason:'คุณสนุกกับการฮีลและช่วยปาร์ตี้',weights:{cleric:6}},
  {text:'ทำให้การสู้ได้เปรียบด้วยบัฟหรือดีบัฟ',reason:'คุณชอบใช้บัฟหรือดีบัฟช่วยการสู้',weights:{fighter:3,page:3,cleric:3,bandit:1,assassin:1}}
 ]},
 {title:'อยากขยับตัวในแมพแบบไหน?',options:[
  {text:'วาร์ปเปลี่ยนตำแหน่งด้วย Teleport',reason:'คุณชอบความคล่องตัวแบบ Teleport',weights:{il:4,fp:4,cleric:4}},
  {text:'วิ่งไว กระโดดคล่องด้วย Haste',reason:'คุณชอบวิ่งและกระโดดคล่องด้วย Haste',weights:{bandit:4,assassin:4}},
  {text:'หามุมยืนดี ๆ แล้วค่อยโจมตี',reason:'คุณชอบจัดตำแหน่งก่อนโจมตี',weights:{hunter:3,crossbowman:4,spearman:2}},
  {text:'ไม่ได้ซีเรียสเรื่องความเร็ว',weights:{}}
 ]},
 {title:'ภาพการต่อสู้แบบไหนถูกใจที่สุด?',options:[
  {text:'แทงมีดติด ๆ กันหลายฮิต',reason:'คุณชอบจังหวะโจมตีหลายฮิตด้วยมีด',weights:{bandit:5}},
  {text:'กระโดดปาดาวใส่เป้าหมาย',reason:'คุณชอบจังหวะกระโดดปาดาว',weights:{assassin:5}},
  {text:'เหวี่ยงดาบ ขวาน หรือกระบอง',reason:'คุณชอบอาวุธประชิดแบบนักรบ',weights:{fighter:4,page:4}},
  {text:'กวาดหอกหรือทวนที่เอื้อมได้ไกล',reason:'คุณชอบอาวุธด้ามยาวที่มีระยะเอื้อม',weights:{spearman:5}},
  {text:'ยิงธนูหรือหน้าไม้จากมุมที่เลือกไว้',reason:'คุณชอบอาวุธยิงและการเลือกมุมโจมตี',weights:{hunter:4,crossbowman:4}},
  {text:'ร่ายเวท แล้วดูผลของสกิลแต่ละแบบ',reason:'คุณชอบการต่อสู้ด้วยเวท',weights:{il:3,fp:3,cleric:3}}
 ]},
 {title:'ข้อไหนที่ยอมรับได้มากที่สุด?',hint:'แต่ละสายมีข้อแลกเปลี่ยน เลือกสิ่งที่คุณรับได้เวลาเล่นจริง',options:[
  {text:'ต้องเข้าใกล้มอน และรับการชนบ่อย',reason:'คุณรับได้กับการเข้าประชิดมอน',weights:{fighter:3,page:3,spearman:3,bandit:3}},
  {text:'ต้องคอยถอยและรักษาระยะยิง',reason:'คุณรับได้กับการคุมระยะยิง',weights:{hunter:3,crossbowman:3,assassin:2}},
  {text:'ต้องเตรียมดาวและวางงบอุปกรณ์',reason:'คุณรับได้กับการเตรียมดาวและอุปกรณ์',weights:{assassin:4}},
  {text:'ต้องดูแล MP และเลือกมอนให้เข้าทางเวท',reason:'คุณรับได้กับการดูแล MP และเลือกชนิดมอน',weights:{il:3,fp:3,cleric:3}},
  {text:'ใช้ท่าเดิมเป็นหลัก แต่ชอบอาวุธที่ถือ',reason:'คุณรับได้กับท่าโจมตีหลักที่ค่อนข้างซ้ำ',weights:{fighter:3,page:3,spearman:3}},
  {text:'ไม่รีบจบทุกตัวทันที รอผลพิษได้',reason:'คุณรับได้กับจังหวะรอให้พิษทำงาน',weights:{fp:4}}
 ]},
 {title:'ถ้าเลือกจุดเด่นเพิ่มได้หนึ่งอย่าง จะเลือกอะไร?',options:[
  {text:'บัฟเพิ่มพลังโจมตีด้วย Rage',reason:'คุณอยากได้บัฟเพิ่มพลังโจมตี',weights:{fighter:5}},
  {text:'ลดความสามารถของมอนด้วย Threaten',reason:'คุณอยากใช้ดีบัฟกดดันศัตรู',weights:{page:5}},
  {text:'แช่แข็งหรือสตันมอนให้สู้สบายขึ้น',reason:'คุณชอบคุมมอนด้วยการแช่แข็งหรือสตัน',weights:{il:4,hunter:4}},
  {text:'ยิงทะลุมอนที่เรียงเป็นแนวตรง',reason:'คุณชอบโจมตีทะลุมอนเป็นแนวตรง',weights:{crossbowman:5}},
  {text:'ฮีลและช่วยลดดาเมจให้ปาร์ตี้',reason:'คุณอยากฮีลและปกป้องปาร์ตี้',weights:{cleric:5}},
  {text:'ไม่ต้องเพิ่ม ขอแนวที่เลือกมาก่อนหน้านี้',weights:{}}
 ]}
];
export function rankClasses(answers){
 if(answers.length!==QUESTIONS.length||answers.some((answer,i)=>!Number.isInteger(answer)||!QUESTIONS[i].options[answer]))throw new Error('กรุณาตอบให้ครบทุกข้อ');
 return CLASSES.map(job=>{
  let score=0;const reasons=[];
  answers.forEach((answer,i)=>{const option=QUESTIONS[i].options[answer],weight=option.weights[job.id]||0;score+=weight;if(weight&&option.reason)reasons.push({text:option.reason,weight,index:i});});
  reasons.sort((a,b)=>b.weight-a.weight||a.index-b.index);
  return {...job,score,reasons:reasons.slice(0,3).map(r=>r.text)};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
