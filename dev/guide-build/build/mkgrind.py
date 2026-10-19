import json, sys, os, shutil
sys.path.insert(0, '/home/claude/tools')
from navgen import walk, npc, minimap

EXP = {int(k): v for k, v in json.load(open('/home/claude/dl/exp.json')).items()}
MOBS = {o['name']: o for o in json.load(open('/home/claude/dl/mobs.json'))}
EL = {"Green Mushroom": "ไม่ติดพิษ", "Horny Mushroom": "ไม่มีธาตุ", "Zombie Mushroom": "แพ้ศักดิ์สิทธิ์ (Holy)",
      "Fire Boar": "แพ้น้ำแข็ง ต้านไฟ", "Lorang": "แพ้สายฟ้า", "Clang": "แพ้สายฟ้า"}
TOUCH = {"Green Mushroom": "59–80", "Horny Mushroom": "120–164", "Zombie Mushroom": "136–185",
         "Fire Boar": "197–269", "Lorang": "227–310", "Clang": "282–385"}
def mob(n):
    o = MOBS[n]
    return {"lv": o['level'], "hp": o['hp'], "exp": o['exp'], "pdef": o['pdef'], "mdef": o['mdef'], "touch": TOUCH[n], "el": EL[n],
            "u": f"https://meowdb.com/msclassic/monsters/{o['id']}"}

# ---- navigation (same for every guide)
NAVS = {
    "g0": [{"k": "cab", "t": "นั่ง <b>Regular Cab</b> จากเมืองไหนก็ได้ → เลือก <b>Ellinia</b>"}] + walk(['010002000', '010002050', '010002060', '010002070', '010002075']),
    "g1": [{"k": "txt", "t": "ไป <b>Sleepywood</b> ก่อน (Taxi ไปไม่ถึง ต้องเดินจาก Kerning City หรือ Perion ดูทางเดินในขั้นที่ไป Sleepywood ของ route)"}] + walk(['010005000', '010005060', '010005061', '010005062']),
    "g2": [{"k": "cab", "t": "นั่ง <b>Regular Cab</b> → เลือก <b>Perion</b>"}] + walk(['010004000', '010004100', '010004110', '010004111', '010004112', '010004113']),
    "g3": [{"k": "cab", "t": "นั่ง <b>Regular Cab</b> → เลือก <b>Lith Harbor</b> แล้วซื้อยาให้พอก่อนออกเดินทาง"},
           npc('010000000', 'Pason', " คุยเพื่อเดินทางไป <b>Florina Beach</b>")] + walk(['010007000', '010007010', '010007020']),
    "g4": [{"k": "txt", "t": "จาก <b>Lith Harbor</b> คุย <b>Pason</b> ไป <b>Florina Beach</b> แล้วเดินตามจุดแวะที่ 4 จนถึง <b>Lorang Lorang</b>"}] + walk(['010007020', '010007030']),
}
NAVMAPS = sorted({e['m'] for v in NAVS.values() for e in v if e.get('m')})

STAGE_MAPS = {
    0: [{"n": "Tree Dungeon, Forest Up North IV", "id": "010002075", "mob": [["Green Mushroom", 31]], "total": 44, "best": True,
         "note": "ใกล้ Ellinia มี Slime ปนนิดหน่อย พื้นแคบตีง่าย"},
        {"n": "West Rocky Mountain III", "id": "010004022", "mob": [["Green Mushroom", 32]], "total": 67,
         "note": "ใกล้ Perion มอนปนหลายชนิด ใช้แทนตอนแมพแรกคนเต็ม"},
        {"n": "The Forest of Wisdom", "id": "010002020", "mob": [["Green Mushroom", 30]], "total": 58, "note": "ทางใต้ของ Ellinia"}],
    1: [{"n": "Ant Tunnel III", "id": "010005062", "mob": [["Zombie Mushroom", 61], ["Horny Mushroom", 38]], "total": 99, "best": True,
         "note": "มีแค่เห็ดสองชนิด จุดเกิดเยอะที่สุดในช่วงนี้ ร้านยาที่ Ant Tunnel Park"},
        {"n": "Ant Tunnel IV", "id": "010005063", "mob": [["Horny Mushroom", 41], ["Zombie Mushroom", 23]], "total": 64,
         "note": "Horny Mushroom เยอะกว่า เหมาะกับช่วงเลเวล 20–23"},
        {"n": "Ant Tunnel II", "id": "010005061", "mob": [["Zombie Mushroom", 32], ["Horny Mushroom", 15]], "total": 47,
         "note": "เล็กกว่า ใช้ตอนแมพหลักคนเต็ม"}],
    2: [{"n": "The Burnt Land III", "id": "010004113", "mob": [["Fire Boar", 24]], "total": 37, "best": True,
         "note": "Fire Boar เกือบทั้งแมพ ใกล้ Perion กว่า Burnt Land V"},
        {"n": "The Burnt Land II", "id": "010004112", "mob": [["Fire Boar", 19]], "total": 31, "note": "แมพสำรอง อยู่ก่อนถึง III"},
        {"n": "The Burnt Land V", "id": "010004115", "mob": [["Fire Boar", 26]], "total": 48,
         "note": "จุดเกิดมากที่สุด แต่เดินไกลจากร้านยาที่สุด"}],
    3: [{"n": "Lorang Lorang", "id": "010007020", "mob": [["Lorang", 35]], "total": 40, "best": True,
         "note": "เกือบทั้งแมพเป็น Lorang ตีได้ต่อเนื่อง"},
        {"n": "A Look-Out Shed Around the Beach", "id": "010007010", "mob": [["Lorang", 36]], "total": 63,
         "note": "มี Lupin ปน ได้ Lupin's Banana สำหรับเควสของ Riel ไปด้วย"}],
    4: [{"n": "Lorang and Clang", "id": "010007030", "mob": [["Clang", 29], ["Lorang", 18]], "total": 47, "best": True,
         "note": "Clang ให้ EXP ราว 70% ของแมพ เลเวลยังน้อยให้เก็บ Lorang ก่อน"},
        {"n": "Clang and Lorang", "id": "010007031", "mob": [["Clang", 17], ["Lorang", 8]], "total": 31,
         "note": "ทางเข้าเป็นประตูในแมพ Lorang and Clang คนน้อยกว่า"}],
}

COMMON = [
    {"short": "Green Mushroom", "title": "เห็ดเขียว Green Mushroom", "lv": [13, 20], "mobs": ["Green Mushroom"], "nav": "g0",
     "why": "มอน Lv.14 ที่ตายง่ายที่สุดในช่วงนี้ HP ต่อ EXP ต่ำเป็นอันดับต้นๆ ของเกม และดรอป Pan Lid กับม้วน Claw ราคาดี",
     "tips": ["เริ่มได้ตั้งแต่เลเวล 13 ตอนที่ route ทำเควสเลเวล 10–13 เสร็จแล้ว",
              "ซื้อชุด Lv.15 ให้ครบตอนเลเวล 15 ก่อนตีมอนยาว เพราะช่วยลดค่ายาได้มาก",
              "ถ้าคนเต็ม เปลี่ยน Channel ก่อนเปลี่ยนแมพ แมพนี้คนเยอะช่วงเปิดเกม"],
     "pots": ["ร้าน Department Store ใน <b>Ellinia</b> (Red Potion 50 meso, Orange 50 meso)",
              "ถ้าตีที่ West Rocky Mountain III ใช้ร้าน Department Store ใน <b>Perion</b>"],
     "quests": ["<b>How to Enjoy Mushrooms</b> ของ Shane ใน Ellinia (Lv.14) ฆ่า Green Mushroom 30 ตัว ส่ง Green Mushroom Cap 15 ชิ้น ได้ 535 EXP และ Bronze Ore 5 ชิ้น",
                "ต่อด้วย <b>How to Enjoy Mushrooms Even More</b> ได้อีก 535 EXP และ Iron Ore 5 ชิ้น"]},
    {"short": "Horny + Zombie", "title": "เห็ดหนามและเห็ดซอมบี้ Horny Mushroom + Zombie Mushroom", "lv": [20, 30],
     "mobs": ["Horny Mushroom", "Zombie Mushroom"], "nav": "g1",
     "why": "Ant Tunnel III มีแค่เห็ดสองชนิดนี้ จุดเกิดเยอะที่สุดในช่วงเลเวล 20–30 และ EXP ต่อ HP ดีพอๆ กับ Green Mushroom",
     "tips": ["ช่วงเลเวล 20–22 เริ่มที่ Ant Tunnel IV ที่มี Horny Mushroom เยอะกว่า แล้วค่อยย้ายมา Ant Tunnel III",
              "มอนชนแรงขึ้นเกือบเท่าตัวจาก Green Mushroom ควรมี HP อย่างน้อย 400 ก่อนมา",
              "<b>เลเวล 30 ต้องกลับไปเปลี่ยนอาชีพขั้น 2</b> ตีมอนอย่างเดียวเปลี่ยนอาชีพไม่ได้"],
     "pots": ["<b>24 Hr Mobile Store</b> ที่ Ant Tunnel Park (ขาย Fried Chicken 60 meso) อยู่ลึกเข้าไปในถ้ำ",
              "<b>Mr. Sweatbottom</b> ใน Regular Sauna ที่ Sleepywood (Hotel)"],
     "quests": ["<b>Jane and the Mushroom</b> ของ Jane ที่ Lith Harbor (Lv.20) ใช้ Horny Mushroom Cap 15 ชิ้นกับ Blue Mushroom Cap ได้ 1,610 EXP",
                "<b>Arcon's Blood?</b> ของ Manji ที่ Perion (Lv.21) ฆ่า Zombie Mushroom 75 ตัว ส่ง Charm of the Undead 40 ชิ้น ได้ 1,870 EXP",
                "<b>Stranger's Identity</b> ของ Jane Doe ที่ Kerning (Lv.23) ฆ่า Zombie Mushroom 50 ตัว ได้ 2,430 EXP และผ้าคลุม Old Raggedy Cape (ต้องทำ Stranger's Request ก่อน)"]},
    {"short": "Fire Boar", "title": "หมูไฟ Fire Boar", "lv": [30, 38], "mobs": ["Fire Boar"], "nav": "g2",
     "why": "แมพ The Burnt Land มี Fire Boar เกือบทั้งแมพ อยู่ใกล้ Perion และเป็นแมพตีมอนที่ดีที่สุดในช่วงนี้นอกจากรถไฟใต้ดิน",
     "tips": ["Fire Boar Lv.32 กระโดดข้ามชั้นได้และชนแรงเกือบ 270 ถ้าเพิ่งเปลี่ยนอาชีพที่เลเวล 30 แล้วยังโดนแรงเกินไป ให้ตีเห็ดต่ออีก 1–2 เลเวล",
              "แมพ II และ III อยู่ใกล้ Perion กว่า แมพ V จุดเกิดเยอะสุดแต่เดินกลับไปซื้อยาไกล",
              "เก็บ Fire Boar's Tooth ไว้ เควส Third Material Delivery ของ Ronnie (Lv.41) ใช้ 30 ชิ้น"],
     "pots": ["ร้าน Department Store ใน <b>Perion</b> (Red Potion 50 meso, Meat 80 meso)"],
     "quests": ["<b>Third Material Delivery for Building a New House</b> ของ Ronnie (Lv.41) ฆ่า Fire Boar 50 ตัวและ Copper Drake 50 ตัว ได้ 8,670 EXP ถ้าย้อนกลับมาตอนเลเวล 41"]},
    {"short": "Lorang", "title": "ปู Lorang ที่ Florina Beach", "lv": [38, 45], "mobs": ["Lorang"], "nav": "g3",
     "why": "Lorang Lv.38 แพ้สายฟ้า และเป็นแมพที่ให้ EXP ต่อชั่วโมงสูงที่สุดแมพหนึ่งในช่วงเลเวลนี้ มีเควสของ Riel ที่ Florina Beach ให้ EXP เพิ่มอีก 4 ครั้ง",
     "tips": ["<b>Return Scroll ใช้ไม่ได้ในแมพแถบ Florina</b> ต้องกลับทาง Pison ที่ Florina Beach ซื้อยาให้พอตั้งแต่ Lith Harbor",
              "เก็บ Lorang Claw, Coconut (เก็บจากต้นมะพร้าวทางขวาของ Florina Beach) และ Lupin's Banana ไว้ส่งเควสของ Riel",
              "Lorang ชนแรงราว 230–310 ควรมี HP อย่างน้อย 1,000"],
     "pots": ["ซื้อยาให้พอที่ร้าน Department Store ใน <b>Lith Harbor</b> ก่อนนั่ง Pason ข้อมูลร้านยาใน Florina Beach ยังไม่ชัด",
              "ยาที่ได้จากเควสของ Riel (Blue Potion 15–30 ขวดต่อเควส) เอามาใช้ต่อได้"],
     "quests": ["<b>Special Taste of Florina Beach I–IV</b> ของ Riel ที่ Florina Beach (Lv.37) ได้ครั้งละ 7,310 EXP รวม 4 ครั้ง ใช้ Coconut, Lupin's Banana และ Lorang Claw"]},
    {"short": "Lorang + Clang", "title": "ปูใหญ่ Clang (ปนกับ Lorang)", "lv": [45, 50], "mobs": ["Clang", "Lorang"], "nav": "g4",
     "why": "Clang Lv.49 ให้ EXP 127 ต่อตัว แมพ Lorang and Clang อยู่ติดกับแมพของจุดแวะที่ 4 จึงไม่ต้องเดินทางไกล",
     "tips": ["เลเวล 45–47 ฆ่า Lorang ในแมพนี้เป็นหลักก่อน แล้วค่อยเน้น Clang เมื่อฆ่าได้ใน 2 ครั้ง",
              "Clang ชนแรงถึง 385 และมี PDEF 15 ถ้าขึ้น MISS บ่อยให้กลับไปตี Lorang Lorang ต่อ",
              "ถึงเลเวล 50 แล้ว แมพนี้ยังใช้ต่อได้ถึงราวเลเวล 55"],
     "pots": ["ใช้ร้านเดิมของจุดแวะที่ 4 ซื้อยาที่ Lith Harbor ก่อนเดินทาง"],
     "quests": ["ถ้ายังไม่ได้ทำ ส่งเควสของ Riel ที่ Florina Beach ให้ครบ 4 ครั้ง"]},
]

MUST_THIEF = [
    ["Lv.21–25", "Stranger's Request และ Stranger's Identity ได้ผ้าคลุม <b>Old Raggedy Cape</b> ใช้ Zombie Mushroom ที่ตีอยู่แล้ว", [27, 32]],
    ["Lv.21–25", "สายเควสของ Maya ได้หมวก <b>Brown Bamboo Hat</b>", [24, 32]],
    ["Lv.22+", "สายเควสของ Nella ได้รองเท้า <b>Blue Lappy Boots</b>", ["nella22"]],
    ["Lv.30", "<b>เปลี่ยนอาชีพขั้น 2</b> ต้องทำ ไม่อย่างนั้นจะไม่ได้สกิลใหม่", [35]],
    ["Lv.37", "สายเควส Sauna Robe ได้ Overall ทุกสเตตัส +1 (ไม่บังคับ)", [37, 39]],
    ["Lv.40", "Collecting Cursed Dolls ได้หมวก <b>Dark Pilfer</b> (LUK +4) และ EXP เยอะ", [40]],
    ["Lv.45", "jump quest ของ John ได้ถุงมือ <b>Dark Cleave</b> (LUK +4)", ["john"]],
    ["Lv.46", "Icarus Cape ได้ผ้าคลุมฟรี", [41]],
]
MUST_MAGE = [
    ["Lv.21+", "<b>Kerning PQ</b> ได้หมวก Blue Bamboo Hat (INT +2) และ Squishy Shoes", [26]],
    ["Lv.21–25", "Stranger's Request และ Stranger's Identity ได้ผ้าคลุม <b>Old Raggedy Cape</b> ใช้ Zombie Mushroom ที่ตีอยู่แล้ว", [29, 33]],
    ["Lv.30", "<b>เปลี่ยนอาชีพขั้น 2</b> เป็น Ice/Lightning Wizard ต้องทำ", [36]],
    ["Lv.32–40", "เควสของ Arwen ได้ <b>Fairy Wing</b> และ <b>Piece of Ice</b> วัตถุดิบของ Fairy Wand และ Cromi ใช้ Arwen's Glass Shoe ที่ดรอปจาก Fire Boar", [39]],
    ["Lv.40", "Collecting Cursed Dolls ได้ EXP เยอะ (หมวก Dark Guiltian ไม่มี INT)", [42]],
    ["Lv.45", "jump quest ของ John ได้ถุงมือ <b>Dark Arten</b> และต่างหู <b>Pansy Earrings</b>", [43]],
    ["Lv.46", "Icarus Cape ได้ผ้าคลุมฟรี", [44]],
]

RULES = [
    "<b>ตีมอนล้วนได้ EXP ช้ากว่าทำเควส</b> โดยเฉพาะช่วงเลเวล 10–30 ที่เควสให้ EXP ดีมาก ถ้าไม่ต้องรีบ ใช้ route หลักแล้วแวะตีตามกล่อง “ทางเลือก” จะได้เลเวลเร็วที่สุด",
    "<b>สลับได้ทุกเมื่อ</b> จะทำ route ไปถึงขั้นไหนแล้วมาตีมอนต่อก็ได้ หรือตีมอนแล้วกลับไปทำเควสที่เลเวลถึงก็ได้ เควสส่วนใหญ่ไม่มีวันหมดอายุ",
    "<b>จำนวนตัวและเวลาเป็นค่าประมาณ</b> คิดจาก EXP ของมอนตามเลเวลที่เขียนไว้ ไม่รวม EXP จากเควส ปาร์ตี้ และบัฟ ถ้าตีเป็นปาร์ตี้จะได้ EXP ต่อคนมากขึ้นและมอนเกิดเร็วขึ้น",
    "<b>ถ้าขึ้น MISS บ่อยหรือยาหมดเร็ว</b> ให้ถอยไปจุดแวะก่อนหน้าแล้วกลับมาเมื่อเลเวลหรืออาวุธดีขึ้น",
    "<b>อย่าขายของห้ามขาย</b> ของ ETC จากมอนพวกนี้หลายชิ้นใช้ในเควสข้างหน้า เช็กปุ่ม “ของห้ามขาย” ก่อนขายทุกครั้ง",
    "Forgotten Hollow (แมพมอนเลเวล 39–60 แถว Ellinia) จะเปิดวันที่ 18 พฤศจิกายน 2026 จึงยังไม่อยู่ในเส้นทางนี้",
]

CLASS = {
    "bandit": {
        "cls": "Pure Bandit",
        "lead": "สำหรับคนที่ไม่อยากวิ่งรับส่งเควส เส้นทางนี้พาตีมอนยาวทีละจุด จาก Green Mushroom ไป Horny Mushroom และ Zombie Mushroom แล้วต่อด้วย Fire Boar และปูที่ Florina Beach จนถึงเลเวล 50 ทุกจุดบอกแมพ จำนวนตัวที่ต้องฆ่า ร้านยา และทางเดิน",
        "summary": [["เหมาะกับใคร", "คนที่ชอบยืนตีมอนยาวๆ ไม่อยากเดินทางรับส่งเควส หรืออยากเปิดเครื่องตีมอนพร้อมทำอย่างอื่น"],
                    ["ได้อะไร เสียอะไร", "เดินทางน้อย ใช้เวลาวางแผนน้อย แต่ใช้เวลาเก็บเลเวลนานกว่าทำเควส และไม่ได้ของรางวัลจากเควส"],
                    ["ยังต้องทำเควสไหม", "ต้องเปลี่ยนอาชีพที่เลเวล 30 และควรทำเควสที่ให้ของดี ดูหัวข้อท้ายหน้า"]],
        "route": [[19, 22], [30, 33], [], [42], []],
        "must": MUST_THIEF,
        "cls_tips": [
            ["Double Stab ฆ่า Green Mushroom ได้ใน 2 ครั้ง ยืนบนพื้นเดียวกับมอนแล้วแทงต่อเนื่อง",
             "Green Mushroom ดรอป <b>Pan Lid</b> โล่หลักของ Bandit (ยืนยัน 30 คน) ถ้ายังไม่มีให้เก็บ"],
            ["ใส่โล่และเปิด Dark Sight ตอนเลือดน้อย เห็ดสองชนิดนี้ชนแรงกว่าเดิมเกือบเท่าตัว",
             "Horny Mushroom ดรอป <b>Iron Dagger</b> (ยืนยัน 6 คน) ใส่ได้ตอนเลเวล 25 และ Zombie Mushroom ดรอป Weighted Earrings"],
            ["Fire Boar กระโดดเข้าหาตัวและชนแรง ตีจากขอบพื้นแล้วถอยออก Savage Blow เริ่มลงที่เลเวล 35 ช่วงแรกยังใช้ Double Stab เป็นหลัก จึงต้องใช้ยาเยอะ",
             "ถ้า Double Stab ต้องตีเกิน 3 ครั้ง ให้รอ Reef Claw หรือ Halfmoon Zamadar ก่อน"],
            ["Lorang ดรอป <b>Korean Fan</b> มีดเลเวล 40 ที่ต้องการแค่ LUK 70 (ยืนยัน 18 คน) เป็นมีดที่หาง่ายที่สุดของช่วงนี้",
             "Savage Blow ได้ครบ 6 ฮิตเมื่อลงถึง 21 แต้มตอนเลเวล 41 ตามแผนในแท็บ Builds"],
            ["Clang มี PDEF 15 ใช้ Savage Blow ตลอด และเปิด Haste ไว้เพื่อเดินเก็บมอนเร็วขึ้น"],
        ],
    },
    "assassin": {
        "cls": "Assassin",
        "lead": "สำหรับคนที่ไม่อยากวิ่งรับส่งเควส เส้นทางนี้พาตีมอนยาวทีละจุด จาก Green Mushroom ไป Horny Mushroom และ Zombie Mushroom แล้วต่อด้วย Fire Boar และปูที่ Florina Beach จนถึงเลเวล 50 ทุกจุดบอกแมพ จำนวนตัวที่ต้องฆ่า ร้านยา และทางเดิน",
        "summary": [["เหมาะกับใคร", "คนที่ชอบยืนปาดาวยาวๆ ไม่อยากเดินทางรับส่งเควส หรืออยากเปิดเครื่องตีมอนพร้อมทำอย่างอื่น"],
                    ["ได้อะไร เสียอะไร", "เดินทางน้อย ใช้เวลาวางแผนน้อย แต่ใช้เวลาเก็บเลเวลนานกว่าทำเควส ไม่ได้ของรางวัลจากเควส และใช้ดาวมากขึ้น"],
                    ["ยังต้องทำเควสไหม", "ต้องเปลี่ยนอาชีพที่เลเวล 30 และควรทำเควสที่ให้ของดี ดูหัวข้อท้ายหน้า"]],
        "route": [[19, 22], [30, 33], [], [42], []],
        "must": MUST_THIEF,
        "cls_tips": [
            ["Lucky Seven ฆ่า Green Mushroom ได้ใน 2 ครั้ง ยืนปาจากชั้นบนหรือปลายพื้นได้เลย",
             "Green Mushroom และ Zombie Mushroom ดรอป <b>Claw Attack Scroll: Intermediate</b> ม้วน claw ที่เราใช้เองได้"],
            ["ถอยปาเมื่อเห็ดเดินเข้าใกล้ ถ้าใกล้เกินไปจะต่อยด้วย claw แทนการปาดาว",
             "พกดาวอย่างน้อย 3 แพ็ก ร้านใน Ant Tunnel Park ขาย Subi และเติมดาวได้"],
            ["Fire Boar กระโดดข้ามชั้นได้ ให้ยืนบนชั้นที่สูงกว่าแล้วปาลงไป",
             "Fire Boar มีโอกาสดรอป <b>Kumbi Throwing Stars</b> (ATK +21) ใช้เองหรือขายได้ราคาดี"],
            ["Lorang เดินเร็ว ให้ปาตั้งแต่ระยะไกลสุดของ Keen Eyes",
             "Lorang ดรอป Korean Fan ซึ่ง Bandit ต้องการ ขายใน Free Market ได้ราคาดี"],
            ["Clang ใช้ Lucky Seven 2–3 ครั้งตอนเลเวล 45 ถ้าดาวเปลืองเกินไปให้กลับไปตี Lorang ก่อน"],
        ],
    },
    "mage": {
        "cls": "Ice / Lightning Mage",
        "lead": "สำหรับคนที่ไม่อยากวิ่งรับส่งเควส เส้นทางนี้พาตีมอนยาวทีละจุด จาก Green Mushroom ไป Horny Mushroom และ Zombie Mushroom แล้วต่อด้วย Fire Boar ที่แพ้น้ำแข็ง และปูที่ Florina Beach ซึ่งแพ้สายฟ้า จนถึงเลเวล 50 ทุกจุดบอกแมพ จำนวนตัวที่ต้องฆ่า ร้านยา และทางเดิน",
        "summary": [["เหมาะกับใคร", "คนที่ชอบยืนยิงเวทยาวๆ ไม่อยากเดินทางรับส่งเควส หรืออยากเปิดเครื่องตีมอนพร้อมทำอย่างอื่น"],
                    ["ได้อะไร เสียอะไร", "เดินทางน้อย ใช้เวลาวางแผนน้อย แต่ใช้เวลาเก็บเลเวลนานกว่าทำเควส ไม่ได้ของรางวัลจากเควส และใช้ยา MP มากขึ้น"],
                    ["ยังต้องทำเควสไหม", "ต้องเปลี่ยนอาชีพที่เลเวล 30 และควรทำเควส Arwen เพื่อเอาวัตถุดิบไม้เท้า ดูหัวข้อท้ายหน้า"]],
        "route": [[17], [31], [39], [42], [45]],
        "must": MUST_MAGE,
        "cls_tips": [
            ["Energy Bolt ฆ่า Green Mushroom ได้ใน 2 ครั้ง ยืนบนพื้นเรียบเพราะลูกเวทจะหายถ้าชนกำแพง",
             "route หลักของเมจใช้ Bubbling ที่ Line 1 &lt;Area 1&gt; ซึ่งเป็นมอนเดียวต่อแมพและแพ้สายฟ้า ถ้าแมพนั้นคนเต็มให้มาตี Green Mushroom แทน"],
            ["Horny Mushroom มี MDEF 0 เวทจึงเข้าเต็มทุกครั้ง เมจเป็นอาชีพที่ตีเห็ดสองชนิดนี้ได้คุ้มที่สุด",
             "Zombie Mushroom ดรอป <b>Blue Chaos Robe</b> (INT +6, ยืนยัน 12 คน) ใส่ได้ตอนเลเวล 35"],
            ["<b>Fire Boar แพ้น้ำแข็ง</b> Cold Beam แรงขึ้น 25% และทำให้หมูเดินช้าลง ลง Cold Beam ให้เต็มก่อน Thunder Bolt",
             "เก็บ <b>Arwen's Glass Shoe</b> ที่ดรอปจาก Fire Boar ไว้ทำเควสของ Arwen ได้ Fairy Wing และ Piece of Ice"],
            ["<b>Lorang แพ้สายฟ้า</b> เริ่มใช้ Thunder Bolt ได้ตั้งแต่เลเวล 41 ตอนที่ลงไว้หลายแต้มแล้ว ก่อนหน้านั้นใช้ Cold Beam ตีทีละตัว",
             "Lorang มีโอกาสดรอป Blue Starlight (Overall INT +8)"],
            ["<b>Clang แพ้สายฟ้า</b> รวมมอนเป็นกลุ่มแล้วใช้ Thunder Bolt จะคุ้ม MP ที่สุด"],
        ],
    },
}

IMGDIR = '/home/claude/build/img'

def make(guide):
    C = CLASS[guide]
    stages = []
    for k, st in enumerate(COMMON):
        s = dict(st)
        s['maps'] = STAGE_MAPS[k]
        s['cls'] = C['cls_tips'][k]
        s['route'] = C['route'][k]
        stages.append(s)
    mobs = {n: mob(n) for n in ["Green Mushroom", "Horny Mushroom", "Zombie Mushroom", "Fire Boar", "Lorang", "Clang"]}
    G = {"cls": C['cls'], "from": 13, "exp": {str(k): v for k, v in EXP.items() if k <= 50}, "mobs": mobs,
         "lead": C['lead'], "summary": C['summary'], "stages": stages, "must": C['must'], "rules": RULES}
    return G

if __name__ == '__main__':
    os.makedirs(IMGDIR, exist_ok=True)
    allmaps = sorted(set(NAVMAPS) | {m['id'] for v in STAGE_MAPS.values() for m in v})
    mini = {}
    for mid in allmaps:
        f, w, h = minimap(mid, IMGDIR)
        mini[mid] = {"f": f, "w": w, "h": h}
    out = {"navs": NAVS, "mini": mini, "guides": {g: make(g) for g in CLASS}}
    json.dump(out, open('/home/claude/build/grind_data.json', 'w'), ensure_ascii=False)
    print('maps', len(mini), [ (k, v['w'], v['h']) for k, v in mini.items()])
    for k, v in NAVS.items():
        print(k)
        for e in v: print('   ', e['t'])
