import json, re, sys
sys.path.insert(0, '/home/claude/tools')
import itemfetch as F

bsrc = open('/home/claude/g/bandit_builds_code.js').read()
BB = json.JSONDecoder().raw_decode(bsrc[len('const BUILD = '):])[0]
BI = BB['items']

def item(name, k=None, src=None, note=None, shop='auto'):
    d = F.fetch(name)
    assert d, name
    b = BI.get(name, {})
    it = {
        'shop': d['shop'] if shop == 'auto' else shop,
        'nshop': d['nshop'] if shop == 'auto' else (1 if shop else 0),
        'id': d['id'], 'sub': d['sub'], 'lv': d['lv'], 'st': d['st'], 'spd': d['spd'],
        'ic': d['ic'],
        'k': k if k is not None else b.get('k', ['buy'] if d['shop'] else ['drop']),
        'src': src if src is not None else b.get('src', ''),
        'note': note if note is not None else b.get('note', ''),
    }
    return it

def S(i, alt=None, opt=False, note=None):
    return {'i': i, 'alt': alt or [], 'opt': opt, 'note': note}

# ---------------------------------------------------------------- Assassin
A_ITEMS = {}
def ai(name, **kw): A_ITEMS[name] = item(name, **kw)

ai("Wooden Club"); ai("Razor"); ai("Fruit Knife")
ai("Beginner's Garnier", k=['start'], src="เกมให้ตอนเปลี่ยนอาชีพเป็น Thief (เทรดไม่ได้)",
   note="ATK 10 เท่ากับ Garnier ในร้าน ใช้ถึงเลเวล 24 ตามแผน AP ของไกด์นี้")
ai("Garnier", k=['buy'], src="", note="ATK เท่ากับ Beginner's Garnier ซื้อเฉพาะถ้าไม่มีตัวที่เกมให้")
ai("Steel Titans", k=['buy', 'craft'], src="",
   note="ATK 13 ต้องมี DEX 15 ใช้ได้ถ้าเลือกแผนลง DEX เร็วด้านบน")
ai("Steel Igor", k=['buy', 'craft'], src="",
   note="ATK 17 แรงกว่า Garnier มาก แต่ต้องมี DEX 20 ตอนเลเวล 20 ดูแผนลง DEX เร็วด้านบน")
ai("Meba", k=['buy', 'craft'], src="คราฟต์ด้วย Weaponcrafting Lv.5 ได้ด้วย",
   note="ตีเร็วที่สุด (Faster) และเป็น claw ร้านตัวสุดท้าย ใช้ยาวได้ถึงเลเวล 35 ขึ้นไป")
ai("Steel Guards", k=['craft'], src="คราฟต์ด้วย Weaponcrafting ร้านที่ขายอยู่ Orbis ซึ่งยังไม่เปิด",
   note="ATK 22 ตีช้ากว่า Meba")
ai("Adamantium Guards", k=['craft'], src="คราฟต์ด้วย Weaponcrafting Lv.6 หรือซื้อจากผู้เล่น ร้าน NPC ไม่มีขายตอนเปิดเกม",
   note="ATK 23 มากกว่า Meba 4 แต่ตีช้ากว่า ดาเมจต่อวินาทีต่างกันน้อย ไม่ต้องรีบเปลี่ยน")
ai("Bronze Guardian", k=['craft'], src="คราฟต์ด้วย Weaponcrafting Lv.7", note="วัตถุดิบหลักของ Dark Guardian")
ai("Dark Guardian", k=['craft'], src="คราฟต์ด้วย Weaponcrafting Lv.7 (Bronze Guardian และ Black Crystal) หรือซื้อจากผู้เล่น",
   note="ATK 26 claw หลักช่วงเลเวล 35–50 ไม่มีขายในร้าน")
ai("Steel Avarice", k=['craft'], src="คราฟต์ด้วย Weaponcrafting", note="claw Lv.40 ไกด์นี้ใช้ Dark Guardian ต่อจนถึง Dark Slain")
ai("Steel Slain", k=['craft'], src="คราฟต์ด้วย Weaponcrafting", note="วัตถุดิบหลักของ Dark Slain")
ai("Dark Slain", k=['craft'], src="คราฟต์ด้วย Weaponcrafting Lv.10 (Steel Slain และ Black Crystal ×6) หรือซื้อจากผู้เล่น",
   note="ATK 34 ใส่ได้ตอนเลเวล 50")
ai("Subi Throwing Stars", k=['buy'], src="ขายที่ Dr. Faymus (Kerning City Pharmacy) และร้าน Department Store ทุกเมือง",
   note="ดาวเริ่มต้น 1 แพ็กมี 500 ดาว พกติดตัว 2–3 แพ็ก เติมดาวที่ร้านถูกกว่าซื้อใหม่")
ai("Wolbi Throwing Stars", k=['buy'], shop=None,
   src="ร้าน Max ใน Kerning City Civic Center ต้องมี Citizenship ของ Kerning ขั้น Helpful Stranger ราคาช่วงทดสอบคือ 1,000 meso ต่อ 500 ดาว",
   note="ATK +17 แรงกว่า Subi 2")
ai("Mokbi Throwing Stars", k=['drop'], src="มีโอกาสดรอปจาก Jr. Wraith และ Dark Axe Stump", note="ATK +19 ร้านไม่มีขาย")
ai("Kumbi Throwing Stars", k=['drop'], src="มีโอกาสดรอปจาก Lupin และ Fire Boar (ราว 1/20,000)", note="ATK +21 ราคาสูงใน Free Market")
ai("Tobi Throwing Stars", k=['drop'], src="มีโอกาสดรอปจาก Stone Golem", note="ATK +23 ราคาสูงมาก ช่วงนี้ยังไม่ต้องหา")
for n in ["White Bandana", "Black Thief Hood", "Red Thief Hood", "Green Loosecap", "Brown Bamboo Hat", "Red Tiberian",
          "Dark Guise", "Blue Guise", "Dark Pilfer", "Green Pilfer", "Dark Nightshift", "Black Pao", "Blue Pao",
          "Black Knucklevest", "Dark Nightshift Pants", "Sandblasted Jeans", "Black Sneak Pants", "Black Knucklevest Pants",
          "Blue Knucklevest Pants", "White Ninja Sandals", "Blue Lappy Boots", "Bronze Chain Boots", "Work Gloves", "Black Duo",
          "Dark Wolfskin", "Steel Sylvia", "Gold Arbion", "Dark Cleave", "Weighted Earrings", "Yellow Square", "Star Earrings",
          "Old Raggedy Cape", "Black Justice Cape", "Green Icarus Cape", "Black Napoleon"]:
    ai(n)
A_ITEMS["White Bandana"]["note"] = "ใส่ได้ทุกอาชีพ ใช้ถึงเลเวล 14"
ai("Squishy Shoes", k=['drop'], src="มีโอกาสดรอปจาก King Slime ใน Kerning PQ (ยืนยัน 7 คน)", note="ทุกสเตตัส +1 ใส่ได้ตอนเลเวล 28")
ai("Blue Sauna Robe", k=['quest'], src="รางวัลเควส Returned Secret Book (ตัวละครชาย) ใน route ตอนเลเวล 37",
   note="Overall ทุกสเตตัส +1 มี 10 ช่องม้วน ใส่แทนเสื้อและกางเกงพร้อมกัน")
ai("Red Sauna Robe", k=['quest'], src="รางวัลเควส Returned Secret Book (ตัวละครหญิง) ใน route ตอนเลเวล 37",
   note="Overall ทุกสเตตัส +1 มี 10 ช่องม้วน ใส่แทนเสื้อและกางเกงพร้อมกัน")
ai("Dark Avenger", k=['none'], src="ยังไม่มีผู้เล่นยืนยันแหล่งดรอปใน Classic",
   note="Overall ของโจรหญิง LUK +6 และ 10 ช่องม้วน ถ้าเจอใน Free Market คุ้มมาก")
ai("Pansy Earrings", k=['quest'], src="รางวัลเควส John's Last Present ของ John ที่ Lith Harbor ตอนเลเวล 45",
   note="Crit DMG +3 ไม่มี LUK ใส่แทนต่างหูเดิมได้")
A_ITEMS["Green Icarus Cape"]["note"] = "สุ่มสี ได้สีเขียวจะได้ DEX +2 สีอื่นให้ INT หรือ Speed"

ASSASSIN = {
    "cls": "Assassin", "job": "Thief", "main": ["dex", "luk"], "tot": ["watk", "luk", "dex", "wdef"],
    "wlabel": "claw", "ammoLabel": "ดาว",
    "stat": {"base": {"str": 4, "dex": 5, "int": 4, "luk": 12},
             "phases": [[2, 19, {"luk": 5}], [20, 24, {"dex": 4, "luk": 1}], [25, 99, {"dex": 1, "luk": 4}]]},
    "jobLines": [{"lv": 30, "t": "Assassin"}],
    "br": [
        {"lv": [1, 9], "job": "Beginner", "head": "ทำเควสบนเกาะ ยังไม่ต้องซื้ออะไร",
         "tip": "ช่องอื่นใช้เสื้อผ้าที่ได้ตอนสร้างตัวละคร ตอนนี้ยังไม่มีชุดที่ช่วยอะไร",
         "s": {"weapon": S("Razor", ["Fruit Knife"], note="เลเวล 1–4 ใช้ Wooden Club ไปก่อน แล้วเปลี่ยนเป็น Razor หรือ Fruit Knife ที่ได้จากเควส Biggs")}},
        {"lv": [10, 14], "job": "Thief", "head": "เปลี่ยนอาชีพแล้วได้ claw ฟรี ซื้อดาว Subi ติดตัว 2–3 แพ็ก",
         "tip": "claw ต้องมีดาวอยู่ในช่อง Use ถึงจะปาได้ ของอื่นช่วงนี้ได้ฟรีจากมอนที่ route ผ่าน",
         "ammo": S("Subi Throwing Stars"),
         "s": {"weapon": S("Beginner's Garnier", ["Garnier"], note="ถ้าไม่ได้ Beginner's Garnier ซื้อ Garnier ได้ ATK เท่ากัน"),
               "hat": S("White Bandana", opt=True, note="ถ้าดรอปจาก Slime"),
               "gloves": S("Work Gloves", opt=True, note="ถ้าทำเควส Andre's Request ของ Nella")}},
        {"lv": [15, 19], "job": "Thief", "head": "ซื้อชุด Lv.15 ครบ 4 ชิ้น รวม 9,100 meso",
         "tip": "ชุดนี้เพิ่ม WDEF และ HP มาก ช่วยประหยัดค่ายา และได้ LUK +3 ถ้าซื้อจากผู้เล่นไม่ควรจ่ายเกิน 7,000–8,000 meso",
         "ammo": S("Subi Throwing Stars"),
         "s": {"weapon": S("Beginner's Garnier", ["Steel Titans"]),
               "hat": S("Black Thief Hood"), "top": S("Dark Nightshift"), "bottom": S("Dark Nightshift Pants"),
               "shoes": S("White Ninja Sandals"), "gloves": S("Work Gloves", opt=True)}},
        {"lv": [20, 24], "job": "Thief", "head": "ลง DEX ให้ถึง 25 เตรียมใส่ Meba และได้ต่างหูฟรี",
         "tip": "แผน AP ช่วงนี้ลง DEX 4 แต้มต่อเลเวล ถ้าเงินพอและอยากฆ่าเร็วขึ้น ดูแผนลง DEX เร็วที่ใช้ Steel Igor ในหัวข้อลง AP",
         "ammo": S("Subi Throwing Stars", ["Wolbi Throwing Stars"], note="Wolbi ซื้อได้เมื่อ Citizenship ของ Kerning ถึงขั้น Helpful Stranger (เลเวล 22 ขึ้นไป)"),
         "s": {"weapon": S("Beginner's Garnier", ["Steel Igor"]),
               "hat": S("Black Thief Hood", ["Green Loosecap"]), "top": S("Dark Nightshift", ["Black Pao"]),
               "bottom": S("Dark Nightshift Pants"), "shoes": S("White Ninja Sandals"),
               "gloves": S("Work Gloves", ["Black Duo"], opt=True),
               "ear": S("Weighted Earrings", ["Yellow Square"], note="ได้ตอนเลเวล 23")}},
        {"lv": [25, 29], "job": "Thief", "head": "ซื้อ Meba ตอนเลเวล 25 พร้อมหมวก ผ้าคลุม และรองเท้าฟรีจากเควส",
         "tip": "Meba 16,500 meso ที่ Cutthroat Manny ตีเร็วที่สุดในกลุ่ม claw ช่วงนี้ ใช้ได้ยาวจนถึงเลเวล 35 ขึ้นไป",
         "ammo": S("Wolbi Throwing Stars", ["Subi Throwing Stars"]),
         "s": {"weapon": S("Meba"), "hat": S("Brown Bamboo Hat"), "top": S("Dark Nightshift", ["Black Pao"]),
               "bottom": S("Dark Nightshift Pants", ["Black Sneak Pants"]), "shoes": S("Blue Lappy Boots", ["Squishy Shoes"]),
               "gloves": S("Work Gloves", ["Dark Wolfskin"], opt=True), "ear": S("Weighted Earrings", ["Yellow Square"]),
               "cape": S("Old Raggedy Cape")}},
        {"lv": [30, 34], "job": "Assassin", "head": "เปลี่ยนอาชีพเป็น Assassin แล้วใช้ Meba ต่อ",
         "tip": "ตอนเปิดเกม ร้าน NPC ไม่มี claw เลเวล 30 ขายแล้ว Adamantium Guards ต้องคราฟต์หรือซื้อจากผู้เล่น ถ้าไม่มีก็ใช้ Meba ต่อได้ ดาเมจต่อวินาทีต่างกันน้อย",
         "ammo": S("Wolbi Throwing Stars", ["Mokbi Throwing Stars"]),
         "s": {"weapon": S("Meba", ["Adamantium Guards"]), "hat": S("Brown Bamboo Hat", ["Dark Guise"]),
               "top": S("Dark Nightshift", ["Black Pao"]), "bottom": S("Dark Nightshift Pants", ["Black Sneak Pants"]),
               "shoes": S("Blue Lappy Boots", ["Bronze Chain Boots"]), "gloves": S("Work Gloves", ["Steel Sylvia"], opt=True),
               "ear": S("Weighted Earrings", ["Star Earrings"]), "cape": S("Old Raggedy Cape")}},
        {"lv": [35, 39], "job": "Assassin", "head": "คราฟต์ Dark Guardian ถ้ามี Weaponcrafting Lv.7",
         "tip": "ชุด Knucklevest ให้ LUK +3 ต่อชิ้นแต่ได้จากการดรอปเท่านั้น ส่วน Sauna Robe ได้จากเควสตอนเลเวล 37 และใส่แทนเสื้อกับกางเกงได้",
         "ammo": S("Wolbi Throwing Stars", ["Mokbi Throwing Stars"]),
         "s": {"weapon": S("Dark Guardian", ["Meba"]), "hat": S("Brown Bamboo Hat", ["Dark Guise"]),
               "top": S("Dark Nightshift", ["Black Knucklevest", "Blue Sauna Robe", "Red Sauna Robe"]),
               "bottom": S("Dark Nightshift Pants", ["Black Knucklevest Pants"]),
               "shoes": S("Blue Lappy Boots", ["Bronze Chain Boots"]), "gloves": S("Work Gloves", ["Gold Arbion"], opt=True),
               "ear": S("Weighted Earrings", ["Star Earrings"]), "cape": S("Old Raggedy Cape")}},
        {"lv": [40, 44], "job": "Assassin", "head": "หมวก Dark Pilfer จากเควส Cursed Dolls",
         "tip": "claw เลเวล 40 ไม่คุ้มทำ เพราะ ATK มากกว่า Dark Guardian แค่ 2–3 ให้เก็บเงินไว้ทำ Dark Slain ตอนเลเวล 50",
         "ammo": S("Wolbi Throwing Stars", ["Mokbi Throwing Stars"]),
         "s": {"weapon": S("Dark Guardian", ["Meba"]), "hat": S("Dark Pilfer", ["Green Pilfer"], note="ได้ตอนจบ Collecting 200 Cursed Dolls"),
               "top": S("Dark Nightshift", ["Black Knucklevest", "Blue Sauna Robe", "Red Sauna Robe"]),
               "bottom": S("Dark Nightshift Pants", ["Black Knucklevest Pants"]),
               "shoes": S("Blue Lappy Boots", ["Bronze Chain Boots"]), "gloves": S("Work Gloves", ["Gold Arbion"], opt=True),
               "ear": S("Weighted Earrings", ["Star Earrings"]), "cape": S("Old Raggedy Cape")}},
        {"lv": [45, 50], "job": "Assassin", "head": "ถุงมือ Dark Cleave และผ้าคลุม Icarus ฟรีจากเควส",
         "tip": "ถึงเลเวล 50 เปลี่ยนเป็น Dark Slain ถ้าคราฟต์หรือซื้อได้ และถ้าได้ Black Napoleon (LUK +3) ให้ใส่แทน Icarus Cape",
         "ammo": S("Wolbi Throwing Stars", ["Mokbi Throwing Stars"]),
         "s": {"weapon": S("Dark Guardian", ["Dark Slain"]), "hat": S("Dark Pilfer"),
               "top": S("Dark Nightshift", ["Black Knucklevest", "Blue Sauna Robe", "Red Sauna Robe"]),
               "bottom": S("Dark Nightshift Pants", ["Black Knucklevest Pants"]),
               "shoes": S("Blue Lappy Boots", ["Bronze Chain Boots"]), "gloves": S("Dark Cleave", note="ได้ตอนเลเวล 45"),
               "ear": S("Weighted Earrings", ["Star Earrings", "Pansy Earrings"]),
               "cape": S("Green Icarus Cape", ["Black Napoleon"], note="ได้ตอนเลเวล 46")}},
    ],
    "tables": [
        {"k": "weapon", "t": "claw", "items": ["Wooden Club", "Razor", "Fruit Knife", "Beginner's Garnier", "Garnier", "Steel Titans", "Steel Igor",
                                              "Meba", "Steel Guards", "Adamantium Guards", "Bronze Guardian", "Dark Guardian", "Steel Avarice",
                                              "Steel Slain", "Dark Slain"]},
        {"k": "ammo", "t": "ดาว", "items": ["Subi Throwing Stars", "Wolbi Throwing Stars", "Mokbi Throwing Stars", "Kumbi Throwing Stars", "Tobi Throwing Stars"]},
        {"k": "hat", "t": "หมวก", "items": ["White Bandana", "Black Thief Hood", "Red Thief Hood", "Green Loosecap", "Brown Bamboo Hat", "Red Tiberian",
                                           "Dark Guise", "Blue Guise", "Dark Pilfer", "Green Pilfer"]},
        {"k": "top", "t": "เสื้อและ Overall", "items": ["Dark Nightshift", "Black Pao", "Blue Pao", "Black Knucklevest", "Blue Sauna Robe", "Red Sauna Robe", "Dark Avenger"]},
        {"k": "bottom", "t": "กางเกง", "items": ["Dark Nightshift Pants", "Sandblasted Jeans", "Black Sneak Pants", "Black Knucklevest Pants", "Blue Knucklevest Pants"]},
        {"k": "shoes", "t": "รองเท้า", "items": ["White Ninja Sandals", "Blue Lappy Boots", "Squishy Shoes", "Bronze Chain Boots"]},
        {"k": "gloves", "t": "ถุงมือ", "items": ["Work Gloves", "Black Duo", "Dark Wolfskin", "Steel Sylvia", "Gold Arbion", "Dark Cleave"]},
        {"k": "acc", "t": "ต่างหูและผ้าคลุม", "items": ["Weighted Earrings", "Yellow Square", "Star Earrings", "Pansy Earrings", "Old Raggedy Cape",
                                                        "Black Justice Cape", "Green Icarus Cape", "Black Napoleon"]},
    ],
    "apRows": [[10, "Beginner's Garnier"], [15, "Steel Titans", 1], [20, "Steel Igor", 1], [25, "Meba"], [30, "Adamantium Guards", 1],
               [35, "Dark Guardian"], [50, "Dark Slain"]],
    "sp": [
        {"n": "Lucky Seven", "d": "ท่าปาดาวหลักตลอดเลเวล 10–50", "seg": [[10, 18, 20]]},
        {"n": "Nimble Body", "d": "ACC และ Avoid ลด MISS", "seg": [[11, 11, 3], [23, 27, 15]]},
        {"n": "Keen Eyes", "d": "ปาได้ไกลขึ้นถึง 400", "seg": [[12, 12, 1], [18, 23, 15]]},
        {"n": "Disorder", "d": "ต้องมี 3 แต้มก่อนลง Dark Sight", "seg": [[27, 28, 3]]},
        {"n": "Dark Sight", "d": "หายตัวหนีตอนเลือดน้อย", "seg": [[28, 30, 8]]},
        {"n": "Haste", "d": "วิ่งเร็ว กระโดดสูง", "seg": [[30, 30, 1], [48, 50, 10]]},
        {"n": "Claw Mastery", "d": "ATK +20 และได้ดาวคืน", "seg": [[31, 37, 20]]},
        {"n": "Claw Booster", "d": "ปาเร็วขึ้น 1 แต้มพอ", "seg": [[32, 32, 1]]},
        {"n": "Critical Throw", "d": "คริ 15% ดาเมจคริ +35%", "seg": [[38, 47, 30]]},
    ],
    "text": {
        "title": "ลงสเตตัส สกิล และชุดตามเลเวล",
        "lead": "แท็บนี้รวมทุกอย่างที่ต้องตัดสินใจตอนเลเวลอัป ได้แก่ ลง AP ยังไง ลง SP ยังไง แต่ละช่วงเลเวลควรใช้ claw ดาว และชุดอะไร ทุกอย่างอ้างอิงตาม route ของไกด์นี้",
        "summary": [["AP", "LUK เป็นหลัก ลง DEX แค่พอใส่ claw ไม่ลง STR และ INT"],
                    ["SP", "Lucky Seven ให้เต็มก่อน ตามด้วย Keen Eyes และ Nimble Body แล้วลง Claw Mastery หลังเปลี่ยนอาชีพ"],
                    ["ของ", "claw กับดาวสำคัญที่สุด รองลงมาคือชุด Lv.15 และชุดที่เพิ่ม LUK"]],
        "apFlow": [["Lv.1", "สร้างตัวละครแบบโจร STR 4, DEX 5, INT 4, LUK 12"], ["Lv.2–19", "ลง LUK ทั้งหมด เลเวลละ 5 แต้ม"],
                   ["Lv.20–24", "ลง DEX 4 และ LUK 1 ทุกเลเวล ให้ DEX ถึง 25 ทันใส่ Meba"], ["Lv.25–50", "ลง DEX 1 และ LUK 4 ทุกเลเวล"]],
        "apRules": [
            "<b>LUK</b> คือสเตตัสที่เพิ่มดาเมจของ Lucky Seven โดยตรง ส่วน DEX แทบไม่เพิ่มดาเมจของท่านี้ ให้ลง LUK มากที่สุดเท่าที่ทำได้",
            "<b>DEX</b> ลงแค่ให้พอใส่ claw ที่จะใช้ ถ้าลงตามสูตรนี้ DEX จะพอใส่ claw ทุกอันในตารางตรงเลเวลพอดี",
            "<b>STR และ INT ไม่ต้องลงเลย</b>",
            "<b>ถ้าขึ้น MISS บ่อย</b> ให้เก็บเลเวลก่อน อย่าลง DEX เพิ่ม เพราะเลเวลของตัวละครช่วยเรื่องความแม่นได้มากกว่า",
        ],
        "apNote": "ถ้าลงสเตตัสผิด แก้ได้ด้วยม้วน AP Reset ราคา 7,000 NX (ใช้ได้ตั้งแต่เลเวล 10) เกมจะไม่รีเซ็ตสเตตัสให้เองตอนเปลี่ยนอาชีพ",
        "apAlt": {"t": "แผนลง DEX เร็ว (ไม่บังคับ ใช้เงินเพิ่ม)",
                  "p": ["Beginner's Garnier ที่เกมให้มี ATK 10 เท่ากับ Garnier ในร้าน ช่วงเลเวล 15–24 จึงอ่อนกว่า Steel Titans (ATK 13) และ Steel Igor (ATK 17) ที่ขายอยู่ที่ Cutthroat Manny แผนหลักของไกด์นี้ข้ามสอง claw นี้เพื่อประหยัดเงิน 21,100 meso และลง LUK ได้เต็มที่ก่อน",
                        "ถ้าเงินพอและอยากฆ่าเร็วขึ้นช่วงเลเวล 20–24 ให้ลง LUK อย่างเดียวถึงเลเวล 15 จากนั้นเลเวล 16–20 ลง DEX 3 และ LUK 2 ทุกเลเวล จะได้ DEX 20 ตอนเลเวล 20 พอดีสำหรับ Steel Igor แล้วเลเวล 21–25 ลง DEX 1 และ LUK 4 ทุกเลเวล",
                        "ดาเมจของ Lucky Seven ขึ้นกับ LUK คูณด้วย ATK รวมของ claw และดาว เมื่อคิดกับดาว Subi แผนนี้ทำดาเมจได้มากกว่าแผนหลักราว 14% ตอนเลเวล 20 และราว 29% ตอนเลเวล 24 ส่วนตั้งแต่เลเวล 25 ทั้งสองแผนมี LUK และ DEX เกือบเท่ากัน และใช้ Meba เหมือนกัน",
                        "ถ้าเลือกแผนนี้ ช่อง AP ในขั้นเลเวล 15–25 ของ route จะไม่ตรง ให้ยึดตัวเลขในกล่องนี้แทน"]},
        "create": [
            "<b>เลือกสเตตัสแบบโจร (Thief):</b> STR 4, DEX 5, INT 4 และ <b>LUK 12</b> เกมให้แต้มมาทั้งหมด 25 แต้ม สเตตัสหลักได้ 12 สเตตัสรองได้ 5 ที่เหลือได้ 4",
            "<b>เพศของตัวละคร:</b> โจรหญิงใส่ Dark Avenger (Overall เลเวล 35, LUK +6, 10 ช่องม้วน) ได้ ส่วนตัวละครชายไม่มีชุดที่ดีเทียบเท่า แต่ตอนนี้ยังไม่มีผู้เล่นยืนยันแหล่งดรอปของชุดนี้ใน Classic จึงไม่ต้องยึดเรื่องเพศมาก",
            "<b>อาวุธเริ่มต้นให้เลือก Wooden Club</b> เพราะมีพลังโจมตี 19 สูงกว่า Sword และ Hand Axe ที่มี 17 ช่วงเลเวล 1 ถึง 4 จึงฆ่ามอนได้เร็วกว่า",
            "<b>เลเวล 5 ให้เปลี่ยนเป็น Razor</b> ที่ได้จากเควส Biggs ถ้าได้ Fruit Knife มาแทนก็ใช้ได้เหมือนกัน เพราะพลังโจมตีเท่ากัน",
            "<b>พอถึงเลเวล 10</b> ให้นั่งเรือไป Victoria Island แล้วไปหา Dark Lord ที่ Kerning City เพื่อเปลี่ยนเป็นโจร ซึ่งไม่ต้องมีสเตตัสขั้นต่ำ",
        ],
        "spRules": [
            "<b>ตอนเป็น Beginner</b> ถึงเลเวล 10 จะได้ 9 แต้ม ให้ลง Three Snails, Recovery และ Nimble Feet สกิลละ 3 แต้ม จะลงอันไหนก่อนก็ได้",
            "<b>ลงท่าโจมตีหลักให้เต็มก่อน</b> Lucky Seven คือท่าที่ใช้ตลอดเลเวล 10 ถึง 50 ยิ่งเต็มเร็ว ยิ่งเก็บเลเวลได้เร็ว",
            "<b>ต่อด้วย Keen Eyes และ Nimble Body</b> Keen Eyes ทำให้ยืนห่างมอนได้ไกลขึ้น Nimble Body ลด MISS ซึ่งสำคัญมาก เพราะ MISS ทุกครั้งคือเสียดาวฟรี",
            "<b>สกิลขั้นแรกต้องลงให้จบภายในเลเวล 30</b> เพราะแต้มที่ได้หลังเปลี่ยนอาชีพขั้นที่สองเอามาลงสกิลขั้นแรกไม่ได้ และต้องลง Disorder 3 แต้มก่อนถึงจะลง Dark Sight ได้",
            "<b>เป็น Assassin แล้ว</b> ลง Claw Mastery ให้เต็มและ Claw Booster 1 แต้มก่อน แล้วค่อยลง Critical Throw",
            "<b>Double Stab ไม่ต้องลง</b> เพราะเป็นสกิลของสายมีด",
        ],
        "gearNotes": [
            "<b>ดาเมจของ Lucky Seven</b> คิดจาก LUK คูณกับ ATK รวมของ claw และดาว การเปลี่ยนดาวจาก Subi (+15) เป็น Wolbi (+17) จึงเพิ่มดาเมจได้พอๆ กับการอัปเกรด claw หนึ่งขั้น",
            "<b>claw ที่ขายในร้าน NPC ตอนเปิดเกมมีแค่ 4 อัน</b> คือ Garnier, Steel Titans, Steel Igor และ Meba ที่ Cutthroat Manny ใน Kerning ตั้งแต่เลเวล 30 ขึ้นไปต้องคราฟต์หรือซื้อจากผู้เล่น",
            "<b>claw ใส่คู่กับโล่ไม่ได้</b> ช่องโล่ในหน้าต่างจึงว่างตลอด Pan Lid หรือ Wristguard ที่ดรอปมาให้ขาย",
            "<b>เติมดาว (Recharge)</b> ที่ร้านขายดาวถูกกว่าซื้อแพ็กใหม่ และ Claw Mastery ตอนลงเต็มมีโอกาสคืนดาวที่ปาไปบางส่วน",
        ],
    },
    "items": A_ITEMS,
}

# ---------------------------------------------------------------- Mage
M_ITEMS = {}
def mi(name, **kw): M_ITEMS[name] = item(name, **kw)
mi("Razor", note="ATK เท่ากับ Fruit Knife ใช้ถึงเลเวล 9 แล้วขาย NPC")
mi("Fruit Knife", note="ATK เท่ากับ Razor ใช้แทนกันได้")
mi("Beginner's Wooden Wand", k=['start'], src="เกมให้ตอนเปลี่ยนอาชีพเป็น Magician (เทรดไม่ได้)",
   note="M.ATK 26 ใช้ถึงเลเวล 14 ไม่ต้องซื้ออาวุธช่วงนี้")
mi("Wooden Wand", k=['buy'], src="", note="แรงกว่าตัวที่เกมให้แค่ 1 ไม่ต้องซื้อ")
mi("Hardwood Wand", k=['buy'], src="", note="เปลี่ยนตอนเลเวล 15")
mi("Metal Wand", k=['buy'], src="", note="เปลี่ยนตอนเลเวล 20 ต้องมี LUK 10 ซึ่งพอดีกับการลงสเตตัสตามไกด์")
mi("Ice Wand", k=['buy'], src="", note="wand ร้านตัวสุดท้าย ใช้ยาวจนถึงเลเวล 39 ถ้าไม่มี wand ที่ดีกว่า")
mi("Mithril Wand", k=['craft'], src="คราฟต์ หรือซื้อจากผู้เล่น ร้านที่ขายอยู่ Orbis ซึ่งยังไม่เปิด",
   note="M.ATK 55 มากกว่า Ice Wand 7 ถ้าหาไม่ได้ใช้ Ice Wand ต่อไปจนถึง Fairy Wand")
mi("Wizard Wand", k=['craft', 'drop'], src="คราฟต์ หรือมีโอกาสดรอปจากมอนเลเวลสูง", note="M.ATK 62 ทางเลือกช่วงเลเวล 35–39")
mi("Fairy Wand", k=['craft'], src="คราฟต์ด้วย Arc Forge Lv.8 ใช้ Fairy Wing จากเควส Arwen",
   note="M.ATK 69 อาวุธหลักช่วงเลเวล 40–49 ไม่มีขายในร้าน")
mi("Arc Staff", k=['drop'], src="มีชื่อในตารางดรอปอ้างอิงของ Clang ยังไม่มีผู้เล่นยืนยันใน Classic",
   note="staff ต้องใช้ LUK มากกว่าและตีไม่เร็วขึ้น ไกด์นี้ใช้ wand ต่อ")
mi("Wizard Staff", k=['buy'], src="", note="staff แรงน้อยกว่า wand ระดับเดียวกัน และต้องใช้ LUK มากกว่า ไกด์นี้ไม่ใช้")
mi("Cromi", k=['craft'], src="คราฟต์ด้วย Arc Forge Lv.10 ใช้ Piece of Ice จากเควส Arwen (ต้องมี Smithing Lv.2 และ Weaponcrafting Lv.1)",
   note="M.ATK 83 ใส่ได้ตอนเลเวล 50 ต้องมี LUK 40 ซึ่งพอดีกับการลงสเตตัสตามไกด์")
mi("Stolen Fence", k=['buy'], src="", note="โล่ราคาถูก ใส่ได้ตั้งแต่เลเวล 5 ใช้จนกว่าจะได้ Pan Lid")
mi("Pan Lid", k=['drop'], src="มีโอกาสดรอปจาก Green Mushroom (ยืนยัน 18 คน) ร้านไม่มีขาย", note="โล่หลักของเมจ ใช้ได้ยาวถึงเลเวล 50")
mi("Mystic Shield", k=['drop'], src="มีโอกาสดรอปจากมอนเลเวลสูง", note="MDEF สูงแต่ WDEF ต่ำกว่า Pan Lid มาก ใช้ Pan Lid ดีกว่า")
mi("White Bandana", note="ใส่ได้ทุกอาชีพ INT +1 ใช้ถึงเลเวล 14")
mi("Brown Moon Conehat", k=['buy'], src="", note="ส่วนหนึ่งของชุด Lv.15 INT +1")
mi("Blue Wizardry Hat", k=['buy'], src="", note="INT +1 เท่ากับหมวก Lv.15 จึงไม่ต้องซื้อ")
mi("Blue Bamboo Hat", k=['quest'], src="ได้จาก Kerning PQ (ขั้น KPQ ใน route)", note="INT +2 และ WDEF สูง หมวกที่ดีที่สุดช่วงเลเวล 25–39")
mi("Brown Jester", k=['drop'], src="มีโอกาสดรอปจากมอนช่วงเลเวล 30", note="INT +3 ถ้าดรอปใส่แทน Blue Bamboo Hat")
mi("Brown Guiltian", k=['none'], src="ยังไม่มีแหล่งได้ที่ยืนยันใน Classic", note="INT +4 หมวก Lv.40 ที่ดีที่สุด")
mi("Dark Guiltian", k=['quest'], src="รางวัลเควส Collecting 200 Cursed Dolls ของ Rowen the Fairy",
   note="ไม่มี INT ให้ใส่ Blue Bamboo Hat ต่อ")
mi("Blue Plain Robe", k=['buy'], src="", note="Overall ของตัวละครชาย INT +3 ส่วนหนึ่งของชุด Lv.15")
mi("Yellow Arianne", k=['buy'], src="", note="เสื้อของตัวละครหญิง INT +1 ใส่คู่กับ Yellow Arianne Skirt")
mi("Yellow Arianne Skirt", k=['buy'], src="", note="กระโปรงของตัวละครหญิง INT +1")
mi("Purple Split", k=['buy'], src="", note="เสื้อของตัวละครหญิง Lv.20 INT +2")
mi("White Split Skirt", k=['buy'], src="", note="กระโปรงของตัวละครหญิง Lv.20 INT +2")
mi("Blue Doros Robe", k=['buy'], src="", note="Overall ของตัวละครชาย INT +5 ใช้ยาวถึงเลเวล 39 เพราะร้านไม่มีชุด Lv.30 ขาย")
mi("Brown Doroness Robe", k=['buy', 'drop'], src="", note="Overall ของตัวละครหญิง INT +5")
mi("Blue Wizard Robe", k=['none'], src="ร้าน NPC ไม่มีขายตอนเปิดเกม และยังไม่มีแหล่งดรอปที่ยืนยัน", note="INT +6 ถ้าเจอใน Free Market ใส่แทน Doros Robe ได้")
mi("Blue Sauna Robe", k=['quest'], src="รางวัลเควส Returned Secret Book (ตัวละครชาย) ใน route ตอนเลเวล 37",
   note="ทุกสเตตัส +1 แต่ INT น้อยกว่า Doros Robe มี 10 ช่องม้วนไว้ตีม้วน INT")
mi("Blue Chaos Robe", k=['drop'], src="มีโอกาสดรอปจาก Zombie Mushroom และมอนช่วงเลเวล 30", note="INT +6 ถ้าดรอปใส่แทน Doros Robe ตอนเลเวล 35")
mi("Blue Starlight", k=['drop'], src="มีโอกาสดรอปจาก Lorang (ราว 1/12,500)", note="INT +8 ถ้าดรอปใส่ตอนเลเวล 40")
mi("Blue Basic Boots", k=['buy'], src="", note="ไม่บังคับ เพิ่มความเร็วเดินเล็กน้อย")
mi("Black Nitty", k=['buy'], src="", note="ส่วนหนึ่งของชุด Lv.15")
mi("Yellow Wind Shoes", k=['buy'], src="", note="รองเท้า Lv.25 LUK +1")
mi("Squishy Shoes", k=['drop'], src="มีโอกาสดรอปจาก King Slime ใน Kerning PQ (ยืนยัน 7 คน)", note="ทุกสเตตัส +1 ใส่ได้ตอนเลเวล 28")
mi("Blue Magic Shoes", k=['craft'], src="คราฟต์ด้วย Tailoring หรือซื้อจากผู้เล่น", note="LUK +3 ช่วยให้ลง LUK น้อยลง")
mi("Gold Moon Shoes", k=['craft'], src="คราฟต์ด้วย Tailoring หรือซื้อจากผู้เล่น", note="LUK +4")
mi("Lemona", k=['craft', 'drop'], src="คราฟต์ด้วย Tailoring Lv.3 หรือซื้อจากผู้เล่น", note="INT +1 ใช้ได้ยาวถึงเลเวล 30")
mi("Blue Morrican", k=['craft'], src="คราฟต์ด้วย Tailoring หรือซื้อจากผู้เล่น", note="INT +2")
mi("Ocean Mesana", k=['craft'], src="คราฟต์ด้วย Tailoring หรือซื้อจากผู้เล่น", note="INT +2 MP +5")
mi("Blue Lutia", k=['craft'], src="คราฟต์ด้วย Tailoring Lv.6 หรือซื้อจากผู้เล่น", note="INT +3")
mi("Dark Arten", k=['quest'], src="รางวัลเควส John's Present หลังทำ jump quest Deep Forest of Patience ตอนเลเวล 45", note="INT +2 LUK +2 ได้ฟรี")
mi("Blue Arten", k=['craft'], src="คราฟต์ด้วย Tailoring หรือซื้อจากผู้เล่น", note="INT +4")
mi("Weighted Earrings", note="ต่างหูฟรีตอนเลเวล 23")
mi("Yellow Square", note="ใช้แทน Weighted Earrings ได้เหมือนกัน")
mi("Red Cross Earrings", k=['quest'], src="ได้จาก Kerning PQ", note="MP +5")
mi("Pansy Earrings", k=['quest'], src="รางวัลเควส John's Last Present ของ John ที่ Lith Harbor ตอนเลเวล 45", note="MDEF สูง ได้ฟรี")
mi("Old Raggedy Cape", note="ผ้าคลุมฟรีชิ้นแรก")
mi("Blue Justice Cape", k=['craft'], src="คราฟต์ด้วย Tailoring หรือซื้อจากผู้เล่น", note="INT +1")
mi("Blue Icarus Cape", k=['quest'], src="รางวัลเควส In Search of Wing the Fairy ของ Icarus ตอนเลเวล 46 (สุ่มสี)", note="ได้สีน้ำเงินจะได้ INT +2")
mi("Black Napoleon", note="LUK +3 ใส่ได้ตอนเลเวล 50 ช่วยลดแต้มที่ต้องลงใน LUK")

MAGE = {
    "cls": "Ice / Lightning Mage", "job": "Mage", "main": ["int", "luk"], "tot": ["matk", "int", "luk", "mdef"],
    "wlabel": "ไม้เท้า",
    "stat": {"base": {"str": 4, "dex": 4, "int": 12, "luk": 5},
             "phases": [[2, 15, {"int": 5}], [16, 99, {"int": 4, "luk": 1}]]},
    "jobLines": [{"lv": 30, "t": "I/L Wizard"}],
    "br": [
        {"lv": [1, 9], "job": "Beginner", "head": "ทำเควสบนเกาะ แล้วซื้อโล่ราคาถูกที่ Lith Harbor ถ้ามีเงิน",
         "tip": "ช่องอื่นใช้เสื้อผ้าที่ได้ตอนสร้างตัวละคร ช่วงนี้ยังตีด้วยอาวุธธรรมดา",
         "s": {"weapon": S("Fruit Knife", ["Razor"], note="ได้จากเควส Biggs ATK เท่ากันทั้งสองแบบ"),
               "shield": S("Stolen Fence", opt=True, note="2,000 meso ที่ร้านอาวุธ Lith Harbor ตอนเลเวล 8")}},
        {"lv": [10, 14], "job": "Magician", "head": "เปลี่ยนอาชีพแล้วได้ wand ฟรี และหา Pan Lid จาก Green Mushroom",
         "tip": "ช่วงนี้ไม่ต้องซื้ออาวุธ ของอื่นเป็นของถูกจาก Lith Harbor และของฟรีจากมอนใน route",
         "s": {"weapon": S("Beginner's Wooden Wand"), "shield": S("Pan Lid", ["Stolen Fence"], note="ดรอปจาก Green Mushroom ที่ route พาไปตีตอนเลเวล 13"),
               "hat": S("White Bandana", opt=True), "shoes": S("Blue Basic Boots", opt=True)}},
        {"lv": [15, 19], "job": "Magician", "head": "ซื้อ Hardwood Wand และชุด Lv.15 รวมราว 14,000 meso",
         "tip": "ชุด Lv.15 ของเมจขายที่ร้าน Serabi the Fairy ใน Ellinia รวม 9,000 meso ตัวละครชายใช้ Overall ส่วนตัวละครหญิงใช้เสื้อกับกระโปรงแยกกัน",
         "s": {"weapon": S("Hardwood Wand"), "shield": S("Pan Lid"), "hat": S("Brown Moon Conehat", ["White Bandana"]),
               "top": S("Blue Plain Robe", ["Yellow Arianne", "Yellow Arianne Skirt"], note="ตัวละครหญิงใช้ Yellow Arianne คู่กับ Yellow Arianne Skirt"),
               "shoes": S("Black Nitty"), "gloves": S("Lemona", opt=True, note="ถ้าหาคนคราฟต์ Tailoring ได้")}},
        {"lv": [20, 24], "job": "Magician", "head": "เปลี่ยนเป็น Metal Wand และได้ต่างหูฟรี",
         "tip": "Metal Wand ต้องมี LUK 10 ซึ่งพอดีกับการลงสเตตัสตามไกด์ ตัวละครชายใส่ Blue Plain Robe ต่อได้",
         "s": {"weapon": S("Metal Wand"), "shield": S("Pan Lid"), "hat": S("Brown Moon Conehat", ["Blue Wizardry Hat"]),
               "top": S("Blue Plain Robe", ["Purple Split", "White Split Skirt"], note="ตัวละครหญิงเปลี่ยนเป็น Purple Split คู่กับ White Split Skirt"),
               "shoes": S("Black Nitty"), "gloves": S("Lemona", ["Blue Morrican"], opt=True),
               "ear": S("Weighted Earrings", ["Yellow Square"], note="ได้ตอนเลเวล 23")}},
        {"lv": [25, 29], "job": "Magician", "head": "Ice Wand และ Doros Robe ตอนเลเวล 25 หมวกดีที่สุดได้จาก Kerning PQ",
         "tip": "ถ้าไม่เล่น Kerning PQ ให้ใช้หมวก Lv.15 ต่อ ส่วนผ้าคลุมได้ฟรีจากเควส Stranger's Identity",
         "s": {"weapon": S("Ice Wand"), "shield": S("Pan Lid"), "hat": S("Blue Bamboo Hat", ["Brown Moon Conehat"]),
               "top": S("Blue Doros Robe", ["Brown Doroness Robe"]), "shoes": S("Yellow Wind Shoes", ["Squishy Shoes"]),
               "gloves": S("Lemona", ["Ocean Mesana"], opt=True), "ear": S("Weighted Earrings", ["Red Cross Earrings"]),
               "cape": S("Old Raggedy Cape")}},
        {"lv": [30, 34], "job": "I/L Wizard", "head": "เปลี่ยนอาชีพเป็น I/L Wizard แล้วใช้ Ice Wand ต่อ",
         "tip": "ตอนเปิดเกม ร้าน NPC ไม่มี wand และชุดเลเวล 30 ขายแล้ว Mithril Wand ต้องคราฟต์หรือซื้อจากผู้เล่น ถ้าหาไม่ได้ก็ใช้ Ice Wand และ Doros Robe ต่อ",
         "s": {"weapon": S("Ice Wand", ["Mithril Wand"]), "shield": S("Pan Lid"), "hat": S("Blue Bamboo Hat", ["Brown Jester"]),
               "top": S("Blue Doros Robe", ["Blue Wizard Robe"]), "shoes": S("Yellow Wind Shoes", ["Blue Magic Shoes"]),
               "gloves": S("Lemona", ["Blue Lutia"], opt=True), "ear": S("Weighted Earrings", ["Red Cross Earrings"]),
               "cape": S("Old Raggedy Cape")}},
        {"lv": [35, 39], "job": "I/L Wizard", "head": "เก็บ Fairy Wing จากเควส Arwen ระหว่างตี Fire Boar",
         "tip": "Sauna Robe ได้จากเควสตอนเลเวล 37 ให้ทุกสเตตัส +1 แต่ INT น้อยกว่า Doros Robe เก็บไว้ตีม้วนทีหลังได้",
         "s": {"weapon": S("Ice Wand", ["Mithril Wand", "Wizard Wand"]), "shield": S("Pan Lid"), "hat": S("Blue Bamboo Hat", ["Brown Jester"]),
               "top": S("Blue Doros Robe", ["Blue Chaos Robe", "Blue Sauna Robe"]), "shoes": S("Yellow Wind Shoes", ["Blue Magic Shoes"]),
               "gloves": S("Lemona", ["Blue Lutia"], opt=True), "ear": S("Weighted Earrings", ["Red Cross Earrings"]),
               "cape": S("Old Raggedy Cape", ["Blue Justice Cape"])}},
        {"lv": [40, 44], "job": "I/L Wizard", "head": "คราฟต์ Fairy Wand ตอนเลเวล 40",
         "tip": "Fairy Wand ใช้ Arc Forge Lv.8 และ Fairy Wing จากเควส Arwen ถ้าคราฟต์ไม่ได้ให้ซื้อจากผู้เล่น หรือใช้ Ice Wand ต่อ",
         "s": {"weapon": S("Fairy Wand", ["Ice Wand"]), "shield": S("Pan Lid"), "hat": S("Blue Bamboo Hat", ["Brown Guiltian"]),
               "top": S("Blue Doros Robe", ["Blue Starlight", "Blue Sauna Robe"]), "shoes": S("Yellow Wind Shoes", ["Gold Moon Shoes"]),
               "gloves": S("Lemona", ["Blue Arten"], opt=True), "ear": S("Weighted Earrings", ["Red Cross Earrings"]),
               "cape": S("Old Raggedy Cape", ["Blue Justice Cape"])}},
        {"lv": [45, 50], "job": "I/L Wizard", "head": "ถุงมือ ต่างหู และผ้าคลุมฟรีจากเควส แล้วคราฟต์ Cromi ตอนเลเวล 50",
         "tip": "Cromi ใช้ Piece of Ice จากเควส Arwen และต้องมี LUK 40 ถ้าได้ Black Napoleon (LUK +3) ให้ใส่แทน Icarus Cape",
         "s": {"weapon": S("Fairy Wand", ["Cromi"]), "shield": S("Pan Lid"), "hat": S("Blue Bamboo Hat", ["Brown Guiltian"]),
               "top": S("Blue Doros Robe", ["Blue Starlight", "Blue Sauna Robe"]), "shoes": S("Yellow Wind Shoes", ["Gold Moon Shoes"]),
               "gloves": S("Dark Arten", ["Blue Arten"], note="ได้ตอนเลเวล 45"), "ear": S("Pansy Earrings", ["Weighted Earrings"], note="ได้ตอนเลเวล 45"),
               "cape": S("Blue Icarus Cape", ["Black Napoleon"], note="ได้ตอนเลเวล 46")}},
    ],
    "tables": [
        {"k": "weapon", "t": "ไม้เท้า", "items": ["Razor", "Fruit Knife", "Beginner's Wooden Wand", "Wooden Wand", "Hardwood Wand", "Metal Wand",
                                               "Ice Wand", "Wizard Staff", "Mithril Wand", "Wizard Wand", "Fairy Wand", "Arc Staff", "Cromi"]},
        {"k": "shield", "t": "โล่", "items": ["Stolen Fence", "Pan Lid", "Mystic Shield"]},
        {"k": "hat", "t": "หมวก", "items": ["White Bandana", "Brown Moon Conehat", "Blue Wizardry Hat", "Blue Bamboo Hat", "Brown Jester", "Brown Guiltian", "Dark Guiltian"]},
        {"k": "top", "t": "ชุด", "items": ["Blue Plain Robe", "Yellow Arianne", "Yellow Arianne Skirt", "Purple Split", "White Split Skirt", "Blue Doros Robe",
                                          "Brown Doroness Robe", "Blue Wizard Robe", "Blue Sauna Robe", "Blue Chaos Robe", "Blue Starlight"]},
        {"k": "shoes", "t": "รองเท้า", "items": ["Blue Basic Boots", "Black Nitty", "Yellow Wind Shoes", "Squishy Shoes", "Blue Magic Shoes", "Gold Moon Shoes"]},
        {"k": "gloves", "t": "ถุงมือ", "items": ["Lemona", "Blue Morrican", "Ocean Mesana", "Blue Lutia", "Dark Arten", "Blue Arten"]},
        {"k": "acc", "t": "ต่างหูและผ้าคลุม", "items": ["Weighted Earrings", "Yellow Square", "Red Cross Earrings", "Pansy Earrings", "Old Raggedy Cape",
                                                        "Blue Justice Cape", "Blue Icarus Cape", "Black Napoleon"]},
    ],
    "apRows": [[10, "Beginner's Wooden Wand"], [15, "Hardwood Wand"], [20, "Metal Wand"], [25, "Ice Wand"], [30, "Mithril Wand", 1],
               [35, "Wizard Wand", 1], [40, "Fairy Wand"], [50, "Cromi"]],
    "sp": [
        {"n": "Energy Bolt", "d": "ท่าโจมตีหลักถึงเลเวล 30", "seg": [[10, 10, 1], [13, 15, 9], [18, 20, 15], [23, 23, 20]]},
        {"n": "Improved MP Recovery", "d": "ฟื้น MP เอง ประหยัดค่ายา", "seg": [[11, 11, 1], [14, 18, 15]]},
        {"n": "Magic Guard", "d": "ย้ายดาเมจไปหัก MP", "seg": [[20, 21, 3], [30, 30, 5]]},
        {"n": "Magic Armor", "d": "เพิ่ม WDEF และ MDEF", "seg": [[21, 21, 1], [23, 29, 20]]},
        {"n": "Max MP Increase", "d": "MP สูงสุดเพิ่มขึ้น", "seg": [[30, 30, 1]]},
        {"n": "Teleport", "d": "วาร์ปสั้นๆ ไว้หนี", "seg": [[30, 30, 1]]},
        {"n": "MP Eater", "d": "ดูด MP จากมอน", "seg": [[31, 31, 1]]},
        {"n": "Cold Beam", "d": "ท่าหลักหลังเลเวล 30 ธาตุน้ำแข็ง", "seg": [[31, 41, 30]]},
        {"n": "Thunder Bolt", "d": "ตีหลายตัว ธาตุสายฟ้า", "seg": [[41, 50, 29]]},
    ],
    "text": {
        "title": "ลงสเตตัส สกิล และชุดตามเลเวล",
        "lead": "แท็บนี้รวมทุกอย่างที่ต้องตัดสินใจตอนเลเวลอัป ได้แก่ ลง AP ยังไง ลง SP ยังไง และแต่ละช่วงเลเวลควรใช้ไม้เท้า โล่ และชุดอะไร ทุกอย่างอ้างอิงตาม route ของไกด์นี้",
        "summary": [["AP", "INT เป็นหลัก ลง LUK แค่พอใส่ไม้เท้า ไม่ลง STR และ DEX"],
                    ["SP", "Energy Bolt กับ Improved MP Recovery ก่อน แล้วลง Cold Beam ให้เต็มหลังเปลี่ยนอาชีพ ตามด้วย Thunder Bolt"],
                    ["ของ", "ไม้เท้าสำคัญที่สุด ใส่โล่ Pan Lid เสมอ และเลือกชุดที่เพิ่ม INT"]],
        "apFlow": [["Lv.1", "สร้างตัวละครแบบเมจ STR 4, DEX 4, INT 12, LUK 5"], ["Lv.2–15", "ลง INT ทั้งหมด เลเวลละ 5 แต้ม"],
                   ["Lv.16–50", "ลง INT 4 และ LUK 1 ทุกเลเวล"]],
        "apRules": [
            "<b>INT</b> เพิ่มดาเมจของเวทและ MP สูงสุด ให้ลงมากที่สุดเท่าที่ทำได้",
            "<b>LUK</b> ลงแค่ให้พอใส่ไม้เท้าด้ามถัดไป wand ต้องการ LUK ประมาณเลเวลลบ 10 ถ้าลงตามสูตรนี้ LUK จะพอใส่ wand ทุกด้ามในตารางพอดี",
            "<b>STR และ DEX ไม่ต้องลงเลย</b> ใน Classic การตีด้วยอาวุธช่วงแรกแรงพออยู่แล้ว",
            "<b>หลังเลเวล 50</b> ถ้ามีของที่เพิ่ม LUK เช่น Black Napoleon หรือรองเท้า LUK ใช้ของพวกนี้แทนการลง LUK แล้วเอาแต้มไปลง INT ได้",
        ],
        "apNote": "ถ้าลงสเตตัสผิด แก้ได้ด้วยม้วน AP Reset ราคา 7,000 NX (ใช้ได้ตั้งแต่เลเวล 10) ใน Classic ม้วนนี้ล้างทั้งหมดในครั้งเดียว",
        "create": [
            "<b>เลือกสเตตัสแบบเมจ:</b> STR 4, DEX 4, <b>INT 12</b> และ LUK 5",
            "<b>เลเวล 2 ถึง 10</b> ลง INT ทั้งหมด 45 แต้ม พอถึงเลเวล 10 จะมี INT 57",
            "<b>ช่วงก่อนเปลี่ยนอาชีพ</b> ใช้ Fruit Knife หรือ Razor ที่ได้จากเควส Biggs ตีมอนไปจนถึงเลเวล 10",
            "<b>พอถึงเลเวล 10</b> ไปหา Grendel the Really Old ใน Magic Library ที่ Ellinia เพื่อเปลี่ยนเป็น Magician ซึ่งไม่ต้องมีสเตตัสขั้นต่ำ แต่ route จะพานั่ง Taxi ทัวร์รอบเกาะก่อน เพราะตอนเป็น Beginner ได้ส่วนลดค่า Taxi 90%",
        ],
        "spRules": [
            "<b>ตอนเป็น Beginner</b> ลง Three Snails, Recovery และ Nimble Feet สกิลละ 3 แต้ม",
            "<b>ช่วงแรกลง Improved MP Recovery คู่กับ Energy Bolt</b> เพราะช่วงเปิดเกมยาแพง สกิลนี้ช่วยประหยัด MP ได้มาก และ Energy Bolt 15 แต้มก็ยิง Stirge 2 ครั้งตายอยู่แล้ว",
            "<b>Magic Claw ไม่ต้องลง</b> แรงพอๆ กับ Energy Bolt แต่ใช้ MP มากกว่าและยิงได้ใกล้กว่า",
            "<b>สกิลขั้นแรกต้องลงให้จบภายในเลเวล 30</b> เพราะแต้มที่ได้หลังเปลี่ยนอาชีพขั้นที่สองเอามาลงสกิลขั้นแรกไม่ได้",
            "<b>เป็น I/L แล้ว</b> ลง Teleport และ MP Eater อย่างละ 1 แต้ม แล้วลง Cold Beam ให้เต็มก่อน ตามด้วย Thunder Bolt ส่วนแบบลำดับอื่นอยู่ในหน้าเริ่มต้นหัวข้อสกิล I/L",
        ],
        "gearNotes": [
            "<b>ไม้เท้าที่ขายในร้าน NPC ตอนเปิดเกม</b> มีถึงแค่ Ice Wand (Lv.25) ที่ร้าน Flora the Fairy ใน Ellinia ส่วน Mithril Wand ขายที่ Orbis ซึ่งยังไม่เปิด wand เลเวล 30 ขึ้นไปจึงต้องคราฟต์หรือซื้อจากผู้เล่น",
            "<b>ชุดเมจในร้าน Serabi the Fairy</b> มีถึงแค่ชุด Lv.25 (Doros Robe และ Doroness Robe) ชุด Lv.30 ยังไม่มีขาย",
            "<b>ใส่โล่เสมอ</b> wand ถือมือเดียว Pan Lid มี WDEF และโอกาส Guard ดีกว่า Mystic Shield สำหรับเมจช่วงนี้",
            "<b>เก็บ Fairy Wing และ Piece of Ice</b> จากเควส Arwen ไว้ เพราะเป็นวัตถุดิบของ Fairy Wand และ Cromi",
        ],
    },
    "items": M_ITEMS,
}

def check(B):
    names = set(B['items'])
    for b in B['br']:
        for k, s in list(b['s'].items()) + ([('ammo', b['ammo'])] if b.get('ammo') else []):
            for n in [s['i']] + s['alt']:
                assert n in names, (B['cls'], n)
    for t in B['tables']:
        for n in t['items']: assert n in names, (B['cls'], n)
    for r in B['apRows']: assert r[1] in names, r
check(ASSASSIN); check(MAGE)
json.dump(ASSASSIN, open('/home/claude/build/build_assassin.json', 'w'), ensure_ascii=False)
json.dump(MAGE, open('/home/claude/build/build_mage.json', 'w'), ensure_ascii=False)
print('ok', len(A_ITEMS), len(M_ITEMS))
