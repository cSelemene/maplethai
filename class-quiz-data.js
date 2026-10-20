// Editorial matching weights, not a DPS ranking. Guide availability never affects scoring.
// Scope: Classic World first and second jobs. Owner-supplied class pros/cons
// transcript (0:00–14:38) supplements mechanics; cost weights are qualitative,
// not live market prices. Bandit timing follows the owner's detailed skill guide.
// 2026-10-21: aligned with the free article articles/class-pros-cons.html (low mob density
// favours single-target skills, warrior scroll costs, class rarity, element-favoured rare-drop mobs).
export const CLASSES = [
 {id:'fighter',name:'Fighter',thai:'นักรบสายดาบ / ขวาน',family:'Warrior',source:'fighter',guide:'fighter',summary:'ชอบเข้าประชิด ใช้ท่าโจมตีตรงไปตรงมา แล้วเสริมแรงด้วย Rage',strength:'ตีเป้าเดี่ยวแรงสุดในสายนักรบ Rage เพิ่มพลังโจมตีให้ทั้งปาร์ตี้ และถ้าใช้อาวุธมือเดียว สกรอล 60% ถูก ตีบวกอาวุธได้เร็ว',tradeoff:'ยังใช้ Power Strike / Slash Blast เป็นหลัก เดินค่อนข้างช้า และการเข้าประชิดกับใช้ Rush เพิ่มภาระค่ายาได้ อุปกรณ์มีแนวโน้มใช้งบน้อยกว่าสายที่นิยมสูง'},
 {id:'page',name:'Page',thai:'นักรบสายดาบ / กระบอง',family:'Warrior',source:'page',guide:'page',summary:'เข้าประชิดเหมือนนักรบ แต่ชอบมีเครื่องมือกดดันมอนด้วย Threaten',strength:'เป็นอาชีพที่เห็นน้อยในเซิร์ฟ สายกระบองสกรอลถูกมากจนตีบวกครบได้แม้ไม่เติมเงิน และ Threaten ช่วยลดความสามารถของศัตรู',tradeoff:'เดินค่อนข้างช้า ต้องรับการชนและค่ายา Threaten ไม่ได้ช่วยทุกจุดฟาร์มเท่ากัน และยังไม่มีเวทธาตุของ White Knight ในขั้นสอง'},
 {id:'spearman',name:'Spearman',thai:'นักรบสายหอก / ทวน',family:'Warrior',source:'spearman',guide:'spearman',summary:'ชอบอาวุธด้ามยาว เข้าประชิดแต่มีระยะตีมากกว่านักรบสายอื่น',strength:'หอกและทวนมีระยะเอื้อมยาวที่สุดในกลุ่ม Warrior, Final Attack ช่วยฟื้น HP ระหว่างฟาร์ม และขั้นสามได้ชุดสกิล Dragon Knight',tradeoff:'สกรอลหอก/ทวนแพงที่สุดในสายนักรบ ยังใช้ท่าโจมตีขั้นแรกเป็นหลัก และต้องคุมค่ายาเมื่อเข้าประชิด'},
 {id:'il',name:'I/L Wizard',thai:'เมจน้ำแข็ง / สายฟ้า',family:'Magician',source:'i-l-wizard',guide:'mage',art:'mage',summary:'ชอบวาร์ปไปตามแมพ แช่แข็งมอน และใช้สายฟ้าโจมตีเป็นกลุ่ม',strength:'Teleport คล่องตัว ตีแรงขึ้นกับ Fire Boar และ Red Drake ที่ดรอปของดี มี Cold Beam แช่แข็ง และ Meditation ช่วยปาร์ตี้สายเวท',tradeoff:'มอนในแมพตอนนี้บาง คนส่วนใหญ่จึงอัป Cold Beam ก่อน Thunder Bolt ต้องดูแล MP และอุปกรณ์ INT ใช้งบมากเพราะเมจคนเล่นเยอะ'},
 {id:'fp',name:'F/P Wizard',thai:'เมจไฟ / พิษ',family:'Magician',source:'f-p-wizard',guide:'fp',art:'mage',summary:'ชอบใช้ Fire Arrow ตีเป้าเดี่ยว และเลือกมอนที่แพ้ธาตุให้คุ้ม',strength:'Fire Arrow เป็นท่าหลักสำหรับเป้าเดี่ยว ฟาร์ม Cold Eye ที่ดรอปของแรร์ได้ดี ดาเมจต่อเนื่องฆ่ามอนได้เอง มี Teleport และ Meditation',tradeoff:'Poison Breath มีภาระ MP จึงไม่ควรสมมติว่าคุ้มสำหรับกวาดมอนทุกช่วง ต้องเลือกมอนตามธาตุและวางงบอุปกรณ์'},
 {id:'cleric',name:'Cleric',thai:'เมจสายฮีล',family:'Magician',source:'cleric',guide:'cleric',art:'cleric',summary:'สนุกกับการช่วยให้ปาร์ตี้เล่นสบายขึ้น และฟาร์มมอนที่เข้าทางเวทศักดิ์สิทธิ์',strength:'Heal ช่วยลดการซื้อยา HP ให้ตัวเองและคนใกล้ตัว โจมตี undead ได้ มี Bless ช่วยปาร์ตี้และ Teleport สำหรับเดินแมพ',tradeoff:'DPS ต่ำที่สุดในเกม Heal ทำดาเมจกับ undead จึงต้องเลือกจุดฟาร์ม ยังมีค่ายา MP และอุปกรณ์ INT ไม่ได้ถูกเพียงเพราะประหยัดยา HP'},
 {id:'hunter',name:'Hunter',thai:'นักธนู',family:'Bowman',source:'hunter',guide:'hunter',art:'hunter',summary:'ชอบยิงจากระยะไกล แล้วคุมกลุ่มมอนด้วย Arrow Bomb',strength:'ตีเป้าเดี่ยวแรงที่สุดในสายธนู ระยะยิงไกลที่สุดในเกม เป็นอาชีพที่เห็นน้อย และ Arrow Bomb กวาดกลุ่มมอนพร้อมโอกาสสตัน',tradeoff:'แมพตอนนี้มอนบาง Arrow Bomb จึงยังใช้ไม่เต็มที่ ต้องรักษาระยะ มอนชิดตัวอาจกลายเป็นการฟาดด้วยธนู ไม่มีสกิลเคลื่อนที่แบบ Teleport / Haste และ Arrow Bomb ต้องคุมค่ายา MP'},
 {id:'crossbowman',name:'Crossbowman',thai:'นักหน้าไม้',family:'Bowman',source:'crossbowman',guide:'crossbowman',art:'crossbowman',summary:'ชอบเล็งจังหวะยิงแรง ๆ และหามุมให้มอนเรียงเป็นแนวเดียวกัน',strength:'ระยะยิงไกลที่สุดในเกม คริแรงตั้งแต่ต้นขั้นสอง Iron Arrow ยิงทะลุมอนที่เรียงเป็นแนวตรง มี Soul Arrow ลดภาระลูกธนู',tradeoff:'ต้องเลือกแมพให้ดีและรักษาระยะ ยิงกลางอากาศไม่ได้ มอนชิดตัวทำให้ฟาดด้วยอาวุธ และไม่มีสกิลเคลื่อนที่แบบ Teleport / Haste ในขั้นสอง'},
 {id:'assassin',name:'Assassin',thai:'โจรปาดาว',family:'Thief',source:'assassin',guide:'assassin',art:'assassin',summary:'ชอบกระโดด ปาดาว แล้วขยับหาตำแหน่งโจมตีใหม่อยู่เรื่อย ๆ',strength:'อาชีพเดียวที่กระโดดโจมตีกลางอากาศได้ตลอด DPS เป้าเดี่ยวอันดับ 2 ทั้งที่ตีระยะไกล มี Haste และการหลบช่วยลดการโดนตี',tradeoff:'เลี้ยงแพงที่สุดในเกม ทั้งสกรอลกรงเล็บและค่าดาว ถ้าไม่เติมเงินต้องใช้เวลาฟาร์ม meso นาน มอนชิดตัวทำให้ตีด้วยกรงเล็บ และยังไม่มีท่ากวาดมอนเป็นกลุ่มในขั้นสอง'},
 {id:'bandit',name:'Bandit',thai:'โจรมีด',family:'Thief',source:'bandit',guide:'bandit',art:'bandit',summary:'ชอบเข้าประชิดแล้วแทงต่อเนื่องหลายฮิต มากกว่ายืนยิงจากระยะไกล',strength:'DPS เป้าเดี่ยวอันดับ 1 จาก Savage Blow เริ่มแบบปาดาว (Sindit) แล้วรีเซ็ตมาใช้มีดได้ มีโล่ การหลบ และ Haste; Nimble Recovery ช่วยฟื้น HP/MP เมื่อหลบสำเร็จตามเงื่อนไข',tradeoff:'โจรคนเล่นเยอะ สกรอลและมีดจึงยังแพง ต้องเข้าใกล้มอนจึงมีภาระค่ายา Savage Blow ต้องสะสม SP; แผนหลักในไกด์ได้ 6 ฮิตที่ Lv.41 หากเต็ม Mastery ก่อนจะได้ช้าลง'}
];
// Beginner-friendly preferences; no class or skill names in questions or choices.
export const QUESTIONS = [
  {
    "title": "เวลาเจอศัตรู คุณอยากต่อสู้แบบไหน?",
    "hint": "ลองนึกถึงเกมที่เคยเล่น หรือเลือกแบบที่รู้สึกว่าอยากลอง",
    "options": [
      {
        "text": "เข้าไปสู้ใกล้ ๆ และคอยรับมือกับการโจมตี",
        "reason": "คุณชอบการต่อสู้ระยะใกล้",
        "weights": {
          "fighter": 4,
          "page": 4,
          "spearman": 4,
          "bandit": 4
        }
      },
      {
        "text": "อยู่ห่างไว้ แล้วโจมตีก่อนที่ศัตรูจะเข้าถึงตัว",
        "reason": "คุณชอบโจมตีจากระยะไกล",
        "weights": {
          "hunter": 4,
          "crossbowman": 4,
          "assassin": 4,
          "il": 3,
          "fp": 3,
          "cleric": 1
        }
      },
      {
        "text": "ระยะไหนก็ได้ ขอให้ช่วยเพื่อนระหว่างต่อสู้ได้",
        "reason": "คุณให้ความสำคัญกับการช่วยเพื่อน",
        "weights": {
          "cleric": 4,
          "fighter": 2,
          "il": 1,
          "fp": 1
        }
      },
      {
        "text": "ยังไม่แน่ใจ อยากลองเล่นก่อน",
        "reason": "",
        "weights": {}
      }
    ]
  },
  {
    "title": "ระหว่างต่อสู้ คุณชอบจังหวะการเล่นแบบไหน?",
    "options": [
      {
        "text": "เคลื่อนที่และโจมตีสลับกันตลอด",
        "reason": "คุณชอบเคลื่อนที่ระหว่างโจมตี",
        "weights": {
          "assassin": 4,
          "bandit": 3,
          "il": 2,
          "fp": 2,
          "cleric": 2
        }
      },
      {
        "text": "หาตำแหน่งที่เหมาะ แล้วโจมตีจากจุดนั้นต่อเนื่อง",
        "reason": "คุณชอบเลือกจุดยืนแล้วโจมตีต่อเนื่อง",
        "weights": {
          "crossbowman": 4,
          "hunter": 4,
          "fp": 1
        }
      },
      {
        "text": "ค่อย ๆ เข้าหาศัตรู ใช้จังหวะที่ไม่เร่งรีบ",
        "reason": "คุณชอบจังหวะต่อสู้ที่ไม่เร่งรีบ",
        "weights": {
          "fighter": 3,
          "page": 3,
          "spearman": 3
        }
      },
      {
        "text": "ปรับตามสถานการณ์ได้ ไม่ได้ชอบแบบใดเป็นพิเศษ",
        "reason": "",
        "weights": {}
      }
    ]
  },
  {
    "title": "ถ้าเล่นกับเพื่อน คุณอยากมีส่วนช่วยทีมอย่างไร?",
    "hint": "ทุกอาชีพเล่นกับเพื่อนได้ ข้อนี้ถามถึงบทบาทที่คุณชอบ",
    "options": [
      {
        "text": "เน้นโจมตีให้ศัตรูแพ้เร็วขึ้น",
        "reason": "คุณชอบรับหน้าที่โจมตี",
        "weights": {
          "bandit": 3,
          "assassin": 3,
          "hunter": 3,
          "crossbowman": 3,
          "fp": 2,
          "fighter": 2,
          "spearman": 2
        }
      },
      {
        "text": "คอยดูแลเพื่อนเมื่อบาดเจ็บ",
        "reason": "คุณชอบดูแลเพื่อนระหว่างต่อสู้",
        "weights": {
          "cleric": 5
        }
      },
      {
        "text": "ช่วยให้เพื่อนทั้งทีมโจมตีได้ดีขึ้น",
        "reason": "คุณชอบเพิ่มความสามารถในการโจมตีให้ทีม",
        "weights": {
          "fighter": 4,
          "il": 2,
          "fp": 2
        }
      },
      {
        "text": "ทำให้ศัตรูรับมือได้ง่ายขึ้น",
        "reason": "คุณชอบช่วยควบคุมศัตรู",
        "weights": {
          "page": 4,
          "il": 3,
          "hunter": 3
        }
      }
    ]
  },
  {
    "title": "คุณชอบเห็นผลจากการโจมตีแบบไหน?",
    "options": [
      {
        "text": "โจมตีถี่ ๆ เห็นความเสียหายหลายครั้งต่อเนื่อง",
        "reason": "คุณชอบการโจมตีต่อเนื่องหลายครั้ง",
        "weights": {
          "bandit": 4,
          "assassin": 3,
          "hunter": 2
        }
      },
      {
        "text": "โจมตีแต่ละครั้งได้แรง แม้จังหวะจะช้าลงบ้าง",
        "reason": "คุณชอบดาเมจต่อครั้งสูง",
        "weights": {
          "crossbowman": 4,
          "fighter": 3,
          "page": 3,
          "spearman": 3
        }
      },
      {
        "text": "ทำให้ศัตรูเสียพลังชีวิตต่อเนื่องหลังโจมตีไปแล้ว",
        "reason": "คุณชอบสร้างความเสียหายต่อเนื่อง",
        "weights": {
          "fp": 4
        }
      },
      {
        "text": "ไม่ได้สนใจตัวเลขมาก ขอให้เล่นถนัด",
        "reason": "",
        "weights": {}
      }
    ]
  },
  {
    "title": "ข้อจำกัดแบบไหนที่คุณรับได้มากที่สุด?",
    "hint": "เลือกสิ่งที่คิดว่าจะรบกวนความสนุกของคุณน้อยที่สุด",
    "options": [
      {
        "text": "ต้องอยู่ใกล้ศัตรูและโดนโจมตีบ่อยขึ้น",
        "reason": "คุณรับได้กับความเสี่ยงจากการต่อสู้ระยะใกล้",
        "weights": {
          "fighter": 3,
          "page": 3,
          "spearman": 3,
          "bandit": 3
        }
      },
      {
        "text": "ต้องคอยถอยเมื่อศัตรูเข้ามาใกล้",
        "reason": "คุณรับได้กับการคอยรักษาระยะ",
        "weights": {
          "hunter": 3,
          "crossbowman": 3,
          "assassin": 3
        }
      },
      {
        "text": "ต้องเลือกชนิดศัตรูให้เหมาะกับความสามารถของตัวเอง",
        "reason": "คุณรับได้กับการเลือกศัตรูให้เหมาะกับตัวละคร",
        "weights": {
          "il": 3,
          "fp": 3,
          "cleric": 3
        }
      },
      {
        "text": "ใช้ท่าโจมตีเดิมได้นาน ๆ โดยไม่เบื่อง่าย",
        "reason": "คุณรับได้กับท่าโจมตีหลักที่ไม่เปลี่ยนบ่อย",
        "weights": {
          "fighter": 3,
          "page": 3,
          "spearman": 3,
          "fp": 2,
          "il": 2
        }
      }
    ]
  },
  {
    "title": "คุณอยากใช้เวลาเก็บเงินในเกมเพื่อซื้ออุปกรณ์มากแค่ไหน?",
    "hint": "หมายถึงเงินที่หาได้ในเกม ไม่ใช่การใช้เงินจริง ราคาขึ้นอยู่กับตลาดและอุปกรณ์ที่เลือก",
    "options": [
      {
        "text": "อยากใช้งบน้อย จะได้พัฒนาตัวละครได้เรื่อย ๆ",
        "reason": "คุณอยากประหยัดงบอุปกรณ์",
        "weights": {
          "fighter": 4,
          "page": 4,
          "spearman": 1,
          "hunter": 1,
          "crossbowman": 1,
          "bandit": -1,
          "assassin": -3,
          "il": -2,
          "fp": -2,
          "cleric": -2
        },
        "caution": "อาชีพนี้มีแนวโน้มใช้เงินซื้ออุปกรณ์ค่อนข้างมาก อาจต้องเก็บเงินนานกว่าที่คุณต้องการ"
      },
      {
        "text": "ใช้เวลาเก็บเงินได้บ้าง ถ้าอุปกรณ์ใหม่ช่วยให้เล่นดีขึ้น",
        "reason": "คุณยอมเก็บเงินเพื่ออัปเกรดอุปกรณ์เป็นระยะ",
        "weights": {
          "hunter": 2,
          "crossbowman": 2,
          "bandit": 2,
          "spearman": 2,
          "fighter": 1,
          "page": 1
        }
      },
      {
        "text": "เก็บเงินนานได้ ถ้าเป็นตัวละครที่ชอบ",
        "reason": "คุณรับได้กับการเก็บเงินซื้ออุปกรณ์เป็นเวลานาน",
        "weights": {
          "assassin": 2,
          "bandit": 1,
          "il": 1,
          "fp": 1,
          "cleric": 1
        }
      },
      {
        "text": "ยังไม่แน่ใจ อยากดูวิธีเล่นก่อน",
        "reason": "",
        "weights": {}
      }
    ]
  },
  {
    "title": "ระหว่างเก็บเลเวล คุณให้ความสำคัญกับเรื่องไหนมากที่สุด?",
    "hint": "การเก็บเลเวลคือการต่อสู้เพื่อให้ตัวละครแข็งแกร่งขึ้น ยาฟื้นพลังเป็นค่าใช้จ่ายระหว่างเล่น",
    "options": [
      {
        "text": "ฟื้นพลังชีวิตเองได้ จะได้ซื้อยาน้อยลง",
        "reason": "คุณให้ความสำคัญกับการฟื้นพลังชีวิตและประหยัดยา",
        "weights": {
          "cleric": 4,
          "spearman": 2
        }
      },
      {
        "text": "หลีกเลี่ยงการโดนโจมตี ด้วยการเว้นระยะหรือหยุดศัตรู",
        "reason": "คุณชอบลดการโดนโจมตีด้วยระยะห่างหรือการควบคุมศัตรู",
        "weights": {
          "assassin": 3,
          "hunter": 2,
          "crossbowman": 2,
          "il": 3
        }
      },
      {
        "text": "อยู่สู้ใกล้ ๆ ได้นาน แม้ต้องใช้ยาช่วยบ้าง",
        "reason": "คุณชอบตัวละครที่รับมือการต่อสู้ระยะใกล้ได้",
        "weights": {
          "fighter": 3,
          "page": 3,
          "spearman": 3,
          "bandit": 1
        }
      },
      {
        "text": "จัดการศัตรูได้หลายตัว แม้ใช้ยาฟื้นพลังมากขึ้น",
        "reason": "คุณยอมเพิ่มค่ายาเพื่อโจมตีศัตรูเป็นกลุ่ม",
        "weights": {
          "il": 3,
          "hunter": 3,
          "crossbowman": 2,
          "fp": 2,
          "fighter": 2,
          "page": 2,
          "spearman": 2
        }
      }
    ]
  },
  {
    "title": "ถ้าเลือกพื้นที่เก็บเลเวลได้ คุณอยากเล่นในพื้นที่แบบไหน?",
    "options": [
      {
        "text": "พื้นที่แคบ ศัตรูอยู่ใกล้กัน ไม่ต้องวิ่งตามมาก",
        "reason": "คุณชอบพื้นที่แคบที่เข้าถึงศัตรูได้ง่าย",
        "weights": {
          "bandit": 4,
          "fighter": 3,
          "page": 3,
          "spearman": 2
        }
      },
      {
        "text": "พื้นที่เปิด มองเห็นศัตรูและเว้นระยะได้สะดวก",
        "reason": "คุณชอบพื้นที่เปิดที่รักษาระยะได้",
        "weights": {
          "hunter": 3,
          "crossbowman": 3,
          "assassin": 3
        }
      },
      {
        "text": "ที่ไหนก็ได้ ถ้ามีศัตรูที่ตัวละครของเราสู้ได้ดี",
        "reason": "คุณพร้อมเลือกพื้นที่ตามความถนัดของตัวละคร",
        "weights": {
          "il": 3,
          "fp": 3,
          "cleric": 3
        }
      },
      {
        "text": "ตามเพื่อนหรือภารกิจ ยังไม่มีพื้นที่ที่ชอบ",
        "reason": "",
        "weights": {}
      }
    ]
  },
  {
    "title": "อะไรทำให้คุณอยากเล่นตัวละครเดิมต่อไปนาน ๆ?",
    "options": [
      {
        "text": "ควบคุมได้คล่อง และฝึกจังหวะการเล่นให้ดีขึ้นได้",
        "reason": "คุณชอบพัฒนาทักษะการควบคุมตัวละคร",
        "weights": {
          "assassin": 3,
          "bandit": 3,
          "il": 2
        }
      },
      {
        "text": "ค่อย ๆ แข็งแกร่งขึ้น และมีความสามารถใหม่ให้รอ",
        "reason": "คุณชอบพัฒนาตัวละครในระยะยาว",
        "weights": {
          "spearman": 3,
          "fighter": 2,
          "page": 2
        }
      },
      {
        "text": "ได้ลองอาชีพที่คนเล่นไม่มาก แม้ต้องหาวิธีเล่นเองบ้าง",
        "reason": "คุณสนใจอาชีพที่มีผู้เล่นน้อย",
        "weights": {
          "page": 3,
          "hunter": 3
        }
      },
      {
        "text": "ได้เล่นกับเพื่อน หรือชอบตัวละครนั้นเป็นการส่วนตัว",
        "reason": "",
        "weights": {}
      }
    ]
  }
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
