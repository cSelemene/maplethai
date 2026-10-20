// Editorial matching weights, not a DPS ranking. Guide availability never affects scoring.
// Scope: Classic World first and second jobs. Owner-supplied class pros/cons
// transcript (0:00–14:38) supplements mechanics; cost weights are qualitative,
// not live market prices. Bandit timing follows the owner's detailed skill guide.
export const CLASSES = [
 {id:'fighter',name:'Fighter',thai:'นักรบสายดาบ / ขวาน',family:'Warrior',source:'fighter',guide:'fighter',summary:'ชอบเข้าประชิด ใช้ท่าโจมตีตรงไปตรงมา แล้วเสริมแรงด้วย Rage',strength:'Rage เพิ่มพลังโจมตี และ Rush ช่วยขยับเข้าหากลุ่มมอน',tradeoff:'ยังใช้ Power Strike / Slash Blast เป็นหลัก เดินค่อนข้างช้า และการเข้าประชิดกับใช้ Rush เพิ่มภาระค่ายาได้ อุปกรณ์มีแนวโน้มใช้งบน้อยกว่าสายที่นิยมสูง'},
 {id:'page',name:'Page',thai:'นักรบสายดาบ / กระบอง',family:'Warrior',source:'page',guide:'page',summary:'เข้าประชิดเหมือนนักรบ แต่ชอบมีเครื่องมือกดดันมอนด้วย Threaten',strength:'Threaten ช่วยลดความสามารถของศัตรู เหมาะกับคนที่ชอบดีบัฟมากกว่าบัฟโจมตี',tradeoff:'เดินค่อนข้างช้า ต้องรับการชนและค่ายา Threaten ไม่ได้ช่วยทุกจุดฟาร์มเท่ากัน และยังไม่มีเวทธาตุของ White Knight ในขั้นสอง'},
 {id:'spearman',name:'Spearman',thai:'นักรบสายหอก / ทวน',family:'Warrior',source:'spearman',guide:'spearman',summary:'ชอบอาวุธด้ามยาว เข้าประชิดแต่มีระยะตีมากกว่านักรบสายอื่น',strength:'หอกและทวนมีระยะเอื้อมยาวในกลุ่ม Warrior ส่วน Iron Will ช่วยป้องกันให้ตัวเองระหว่างฟาร์ม',tradeoff:'ยังใช้ท่าโจมตีขั้นแรกเป็นหลัก เดินค่อนข้างช้า แม้มีระยะและบัฟป้องกันช่วยก็ยังต้องคุมค่ายาเมื่อเข้าประชิด'},
 {id:'il',name:'I/L Wizard',thai:'เมจน้ำแข็ง / สายฟ้า',family:'Magician',source:'i-l-wizard',guide:'mage',art:'mage',summary:'ชอบวาร์ปไปตามแมพ แช่แข็งมอน และใช้สายฟ้าโจมตีเป็นกลุ่ม',strength:'Teleport คล่องตัว มี Cold Beam แช่แข็งและ Thunder Bolt กวาดกลุ่มมอน ส่วน Meditation ช่วยปาร์ตี้สายเวท',tradeoff:'ต้องดูแล MP และเลือกมอนให้เหมาะกับธาตุ การอัปเกรดอุปกรณ์ INT อาจใช้งบมากตามตลาด'},
 {id:'fp',name:'F/P Wizard',thai:'เมจไฟ / พิษ',family:'Magician',source:'f-p-wizard',guide:'fp',art:'mage',summary:'ชอบใช้ Fire Arrow ตีเป้าเดี่ยว และเลือกมอนที่แพ้ธาตุให้คุ้ม',strength:'Fire Arrow เป็นท่าหลักสำหรับเป้าเดี่ยว มี Teleport ขยับตำแหน่งและ Meditation ช่วยปาร์ตี้สายเวท',tradeoff:'Poison Breath มีภาระ MP จึงไม่ควรสมมติว่าคุ้มสำหรับกวาดมอนทุกช่วง ต้องเลือกมอนตามธาตุและวางงบอุปกรณ์'},
 {id:'cleric',name:'Cleric',thai:'เมจสายฮีล',family:'Magician',source:'cleric',guide:'cleric',art:'cleric',summary:'สนุกกับการช่วยให้ปาร์ตี้เล่นสบายขึ้น และฟาร์มมอนที่เข้าทางเวทศักดิ์สิทธิ์',strength:'Heal ช่วยลดการซื้อยา HP ให้ตัวเองและคนใกล้ตัว โจมตี undead ได้ มี Bless ช่วยปาร์ตี้และ Teleport สำหรับเดินแมพ',tradeoff:'Heal ทำดาเมจกับ undead จึงต้องเลือกจุดฟาร์ม ยังมีค่ายา MP และอุปกรณ์ INT ไม่ได้ถูกเพียงเพราะประหยัดยา HP'},
 {id:'hunter',name:'Hunter',thai:'นักธนู',family:'Bowman',source:'hunter',guide:'hunter',art:'hunter',summary:'ชอบยิงจากระยะไกล แล้วคุมกลุ่มมอนด้วย Arrow Bomb',strength:'Arrow Bomb กวาดกลุ่มมอนพร้อมโอกาสสตัน มี Soul Arrow ลดภาระลูกธนู เหมาะกับพื้นที่เปิดที่รักษาระยะได้',tradeoff:'ต้องรักษาระยะ มอนชิดตัวอาจกลายเป็นการฟาดด้วยธนู ไม่มีสกิลเคลื่อนที่แบบ Teleport / Haste และ Arrow Bomb ต้องคุมค่ายา MP'},
 {id:'crossbowman',name:'Crossbowman',thai:'นักหน้าไม้',family:'Bowman',source:'crossbowman',guide:'crossbowman',art:'crossbowman',summary:'ชอบเล็งจังหวะยิงแรง ๆ และหามุมให้มอนเรียงเป็นแนวเดียวกัน',strength:'Iron Arrow ยิงทะลุมอนที่เรียงเป็นแนวตรง เหมาะกับแมพแนวนอน มี Soul Arrow ลดภาระลูกธนู',tradeoff:'ต้องเลือกแมพและรักษาระยะ มอนชิดตัวทำให้ฟาดด้วยอาวุธ และไม่มีสกิลเคลื่อนที่แบบ Teleport / Haste ในขั้นสอง'},
 {id:'assassin',name:'Assassin',thai:'โจรปาดาว',family:'Thief',source:'assassin',guide:'assassin',art:'assassin',summary:'ชอบกระโดด ปาดาว แล้วขยับหาตำแหน่งโจมตีใหม่อยู่เรื่อย ๆ',strength:'ตีระยะไกล กระโดดปาดาวได้ มีการหลบและ Haste ช่วยความคล่องตัวของปาร์ตี้ การรักษาระยะช่วยลดการโดนตี',tradeoff:'ดาวและอุปกรณ์อาจใช้งบมาก โดยเฉพาะช่วงเริ่มต้น มอนชิดตัวทำให้ตีด้วยกรงเล็บ และยังไม่มีท่ากวาดมอนเป็นกลุ่มในขั้นสอง'},
 {id:'bandit',name:'Bandit',thai:'โจรมีด',family:'Thief',source:'bandit',guide:'bandit',art:'bandit',summary:'ชอบเข้าประชิดแล้วแทงต่อเนื่องหลายฮิต มากกว่ายืนยิงจากระยะไกล',strength:'Savage Blow โจมตีหลายฮิตใส่เป้าหมายเดียว มีโล่ การหลบ และ Haste; Nimble Recovery ช่วยฟื้น HP/MP เมื่อหลบสำเร็จตามเงื่อนไข',tradeoff:'ยังต้องเข้าใกล้มอนจึงมีภาระค่ายา Savage Blow ต้องสะสม SP; แผนหลักในไกด์ได้ 6 ฮิตที่ Lv.41 หากเต็ม Mastery ก่อนจะได้ช้าลง'}
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
  {text:'เลือกมอนแพ้ธาตุ แล้วใช้เวทตีเป้าหมายทีละตัว',reason:'คุณชอบเลือกธาตุให้เข้ากับมอนและตีเป้าเดี่ยว',weights:{fp:4,il:1}}
 ]},
 {title:'ถ้าเลือกจุดเด่นเพิ่มได้หนึ่งอย่าง จะเลือกอะไร?',options:[
  {text:'บัฟเพิ่มพลังโจมตีด้วย Rage',reason:'คุณอยากได้บัฟเพิ่มพลังโจมตี',weights:{fighter:5}},
  {text:'ลดความสามารถของมอนด้วย Threaten',reason:'คุณอยากใช้ดีบัฟกดดันศัตรู',weights:{page:5}},
  {text:'แช่แข็งหรือสตันมอนให้สู้สบายขึ้น',reason:'คุณชอบคุมมอนด้วยการแช่แข็งหรือสตัน',weights:{il:4,hunter:4}},
  {text:'ยิงทะลุมอนที่เรียงเป็นแนวตรง',reason:'คุณชอบโจมตีทะลุมอนเป็นแนวตรง',weights:{crossbowman:5}},
  {text:'ฮีลและช่วยลดดาเมจให้ปาร์ตี้',reason:'คุณอยากฮีลและปกป้องปาร์ตี้',weights:{cleric:5}},
  {text:'เพิ่มความคล่องตัวให้ปาร์ตี้ด้วย Haste',reason:'คุณอยากช่วยให้ปาร์ตี้วิ่งและกระโดดคล่องขึ้น',weights:{assassin:3,bandit:3}},
  {text:'ช่วยเพื่อนสายเวทด้วย Meditation',reason:'คุณอยากช่วยปาร์ตี้ที่เล่นสายเวท',weights:{il:3,fp:3}},
  {text:'มีระยะเอื้อมและบัฟป้องกันให้ตัวเอง',reason:'คุณชอบอาวุธด้ามยาวและการลดความเสียหายระหว่างฟาร์ม',weights:{spearman:4}},
  {text:'ไม่ต้องเพิ่ม ขอแนวที่เลือกมาก่อนหน้านี้',weights:{}}
 ]},
 {title:'อยากใช้งบ meso กับอุปกรณ์แค่ไหน?',hint:'แยกจากค่ายาระหว่างฟาร์ม ราคาของขึ้นกับตลาดและของที่เลือก ไม่ใช่การเติมเงินจริง',options:[
  {text:'อยากเริ่มประหยัด ค่อย ๆ หาและอัปเกรดของ',reason:'คุณอยากคุมงบอุปกรณ์ช่วงเริ่มต้น',weights:{fighter:3,page:3,spearman:3,bandit:2,hunter:1,crossbowman:1,assassin:-3,il:-2,fp:-2,cleric:-2},caution:'อุปกรณ์หรือดาวที่อยากใช้มีแนวโน้มใช้งบมาก ควรวางแผนของเริ่มต้นก่อน'},
  {text:'งบกลาง ๆ ยอมอัปเกรดเมื่อเห็นผล',reason:'คุณรับได้กับงบอุปกรณ์ระดับกลาง',weights:{hunter:2,crossbowman:2,bandit:2,fighter:1,page:1,spearman:1}},
  {text:'ยอมเก็บ meso ลงของและดาว เพื่อเล่นสายที่ชอบ',reason:'คุณรับได้กับการลงทุนในอุปกรณ์หรือดาว',weights:{assassin:2,il:1,fp:1,cleric:1}},
  {text:'ยังไม่แน่ใจ ให้แนวเล่นมาก่อน',weights:{}}
 ]},
 {title:'เรื่องค่ายาระหว่างฟาร์ม คุณให้ความสำคัญกับอะไร?',hint:'งบซื้ออุปกรณ์กับค่ายาประจำเป็นคนละเรื่อง ใช้ยามากแค่ไหนขึ้นกับแมพ ของ และวิธีเล่น',options:[
  {text:'อยากฮีลตัวเอง ลดการซื้อยา HP',reason:'คุณอยากลดการใช้ยา HP ด้วย Heal',weights:{cleric:4}},
  {text:'อยากตีไกลและหลบ เลี่ยงการโดนชน',reason:'คุณอยากรักษาระยะเพื่อลดการโดนมอนตี',weights:{assassin:3,hunter:2,crossbowman:2}},
  {text:'ยังอยากตีใกล้ แต่มีโล่ หลบ หรือบัฟป้องกันช่วย',reason:'คุณอยากมีเครื่องมือช่วยลดความเสียหายตอนเข้าประชิด',weights:{bandit:3,spearman:3,fighter:1,page:1}},
  {text:'ยอมใช้ MP มากขึ้น ถ้ากวาดมอนได้คุ้ม',reason:'คุณรับได้กับค่ายา MP เพื่อโจมตีเป็นกลุ่ม',weights:{il:3,hunter:2,crossbowman:1,fp:1}},
  {text:'ยังไม่ซีเรียส ขอเลือกแนวที่สนุกก่อน',weights:{}}
 ]},
 {title:'แมพแบบไหนที่อยากฟาร์มเป็นหลัก?',options:[
  {text:'พื้นที่เปิด มีจุดให้ยืนยิงและรักษาระยะ',reason:'คุณชอบแมพที่รักษาระยะยิงได้',weights:{hunter:3,assassin:2,crossbowman:1}},
  {text:'ทางยาวแนวนอน มอนเรียงกันเป็นแถว',reason:'คุณชอบแมพที่ยิงทะลุมอนเป็นแนวตรงได้',weights:{crossbowman:4,hunter:1}},
  {text:'มอนเป็นกลุ่ม อยากวาร์ปแล้วกวาดด้วยเวท',reason:'คุณชอบฟาร์มกลุ่มมอนด้วยเวทและ Teleport',weights:{il:4}},
  {text:'เลือกมอนแพ้ธาตุหรือ undead เพื่อใช้สกิลให้คุ้ม',reason:'คุณยอมเลือกมอนให้เข้าทางธาตุหรือเวทศักดิ์สิทธิ์',weights:{fp:3,cleric:3,il:1}},
  {text:'ปรับตามเควสและเพื่อน ยังไม่มีแมพที่ชอบ',weights:{}}
 ]}
];
export function rankClasses(answers){
 if(!Array.isArray(answers)||answers.length!==QUESTIONS.length||Array.from(answers).some((answer,i)=>!Number.isInteger(answer)||!QUESTIONS[i].options[answer]))throw new Error('กรุณาตอบให้ครบทุกข้อ');
 return CLASSES.map(job=>{
  let score=0;const reasons=[],cautions=[];
  answers.forEach((answer,i)=>{const option=QUESTIONS[i].options[answer],weight=option.weights[job.id]||0;score+=weight;if(weight>0&&option.reason)reasons.push({text:option.reason,weight,index:i});if(weight<0&&option.caution)cautions.push(option.caution);});
  reasons.sort((a,b)=>b.weight-a.weight||a.index-b.index);
  return {...job,score,reasons:reasons.slice(0,3).map(r=>r.text),cautions:[...new Set(cautions)]};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
