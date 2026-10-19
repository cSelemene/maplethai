import json, re, os, sys, struct

G = '/home/claude/g'
B = '/home/claude/build'
OUT = '/home/claude/out'
os.makedirs(OUT, exist_ok=True)

MOBS = {o['name']: o for o in json.load(open('/home/claude/dl/mobs.json'))}
GD = json.load(open(f'{B}/grind_data.json'))
BUILDS_JS = open(f'{B}/builds.js').read()
GRIND_JS = open(f'{B}/grind.js').read()
GRIND_CSS = open(f'{B}/grind.css').read()

def once(s, a, b):
    n = s.count(a)
    assert n == 1, (n, a[:120])
    return s.replace(a, b)

def get_json(s, var):
    key = f'const {var} = '
    i = s.find(key); assert i >= 0, var
    i += len(key)
    o, e = json.JSONDecoder().raw_decode(s[i:])
    return o, i, i + e

def put_json(s, var, o, compact=False):
    _, i, j = get_json(s, var)
    txt = json.dumps(o, ensure_ascii=False, separators=(',', ':') if compact else (', ', ': '))
    return s[:i] + txt + s[j:]

def walk_str(o, fn):
    if isinstance(o, str): return fn(o)
    if isinstance(o, list): return [walk_str(x, fn) for x in o]
    if isinstance(o, dict): return {k: walk_str(v, fn) for k, v in o.items()}
    return o

# ------------------------------------------------------------------ wording rules (Assassin / Mage)
WORD_RULES = [
    ('ก่อนออกไป grind ยาว ๆ', 'ก่อนออกไปตีมอนยาว'), ('ก่อนออกไป grind ยาว', 'ก่อนออกไปตีมอนยาว'), ('ก่อนออกไป grind', 'ก่อนออกไปตีมอนยาว'),
    ('ก่อน grind ยาว', 'ก่อนออกไปตีมอนยาว'),
    ('ที่ grind อยู่แล้ว', 'ที่ตีอยู่แล้ว'),
    ('ระหว่าง grind Fire Boar', 'ระหว่างตี Fire Boar'), ('ระหว่าง grind', 'ระหว่างตีมอน'),
    ('ซ้อนกับการ grind นี้', 'ซ้อนกับการตีมอนในขั้นนี้'), ('ซ้อนไปกับการ grind ในขั้นนี้', 'ซ้อนไปกับการตีมอนในขั้นนี้'),
    ('ไม่ต้อง grind ที่นั่น', 'ไม่ต้องตีมอนยาวที่นั่น'),
    ('เป็นที่ grind หลัก', 'เป็นที่ตีมอนหลัก'), ('แมพ grind', 'แมพตีมอน'),
    ('อยู่ grind ต่อ', 'อยู่ตีมอนต่อ'), ('กลับไป grind', 'กลับไปตีมอน'), ('ตอน grind', 'ตอนตีมอน'),
    ('grind ให้ถึง', 'ตีมอนให้ถึง'), ('grind ถึง', 'ตีมอนให้ถึง'), ('— grind หลัก', '— ที่ตีมอนหลัก'), ('grind หลัก', 'ที่ตีมอนหลัก'),
    ('grind หมู', 'ตีหมู'),
    ('Maya chain', 'สายเควสของ Maya'), ('Nella chain', 'สายเควสของ Nella'), ('Sauna Robe chain', 'สายเควส Sauna Robe'),
    ('Free Market chain', 'สายเควส Free Market'), ('เควสแรกของ chain', 'เควสแรกของสายเควส'), ('ของ chain', 'ของสายเควส'),
    ('หยุด chain', 'หยุดสายเควส'), ('ทำ chain ต่อ', 'ทำสายเควสต่อ'), ('เดิน chain ต่อ', 'ทำสายเควสต่อ'), ('จบ chain', 'จบสายเควส'),
    ('ปิด chain', 'ปิดสายเควส'),
    ('(Shane 15 + 15 และ Alex 15)', '(Shane สองเควส เควสละ 15 และ Alex 15)'),
    ('ให้เก็บเพิ่มอีก 20 + 20 ชิ้น', 'ให้เก็บเพิ่มอีกอย่างละ 20 ชิ้น'),
]
def word_fix(t):
    for a, b in WORD_RULES: t = t.replace(a, b)
    t = re.sub(r'grind (?=[A-Z])', 'ตี ', t)
    t = t.replace('grind', 'ตีมอน')
    t = re.sub(r'(?<=[A-Za-z]) chain\b', ' สายเควส', t)
    return t

MAGE_TITLES = {
    4: "รับ 3 เควสและซื้อโล่ที่ Lith Harbor",
    10: "Ellinia — รับเควส Tailoring และเปลี่ยนอาชีพเป็น Magician",
    11: "เควสเห็ดของ Bruce และตี Pig ให้ JM",
    12: "ไป Perion รับเควสของ Ayan และ Blackbull",
    13: "ตี Stump และ Dark Stump รอบเดียว นับให้ 5 เควส",
    14: "Kerning City — เควสของ Icarus และส่งเควส JM",
    15: "ตีมอนให้ถึง Lv.13",
    16: "Free Market และ Citizenship ของ Kerning City",
    17: "Ellinia — ส่งเควส Francois ทำเควสเห็ดของ Shane และล่า Pan Lid",
    18: "⚠ อ่านก่อนออกไปตีมอนยาว: ระวังยาหมดและเงินหมด",
    19: "อัปเกรดของ Lv.15 ทำเควส Ming Ming และตีหมู",
    20: "ตี Stirge ที่ Transfer Area",
    21: "รับเควสของ Alex, Jane และ Stan",
    22: "ฟาร์ม Blue Mushroom (เควสของ Stan และ Jane)",
    23: "ฟาร์ม Green Mushroom และ Horny Mushroom",
    24: "ส่งเควสของ Stan และ Jane",
    25: "เริ่มสายเควสของ Maya แล้วหยุดไว้ก่อน",
    28: "ตี Bubbling ที่ Line 1 <Area 1>",
    30: "ตีมอนให้ถึง Lv.25 และอัปเกรดของ",
    31: "Ant Tunnel — ตี Zombie Mushroom ให้ Maya และ Stranger พร้อมกัน",
    32: "เก็บของที่เหลือให้ Maya และตี Dark Stump ให้ Chrishrama",
    33: "ปิดสายเควสของ Maya, Stranger's Identity และ Arc Forge",
    34: "ตีมอนให้ถึง Lv.30",
    35: "เตรียมของสำหรับ Icarus's Hang Glider ให้ครบ",
    37: "Icarus's Hang Glider และรับเควส Balloon",
    38: "เริ่มสายเควส Sauna Robe แล้วหยุดที่ Lupin",
    39: "ตี Fire Boar ด้วย Cold Beam และเก็บ Arwen's Glass Shoe",
    41: "ปิดสายเควส Sauna Robe",
    42: "Fairy Wand, Collecting Cursed Dolls และเริ่มใช้ Thunder Bolt",
    43: "Deep Forest of Patience — ถุงมือและต่างหูเมจฟรี",
    45: "ตีมอนให้ถึง Lv.50 และคราฟต์ Cromi",
}
MAGE_WHERE = {18: "ก่อนออกไปตีมอนยาว (ราว Lv.15)"}
SQ_TITLES = {
    "nella10": "สายเควสของ Nella: Shumi และ Andre (ต่อจาก Don Hwang)",
    "nella22": "สายเควสของ Nella ช่วงท้าย: Dr. Faymus → Chris → Cutthroat Manny",
}

# ------------------------------------------------------------------ factual fixes (exact substring → new), per guide, applied to S/SQ/OPTDATA strings
FACT = {
    'assassin': [
        ("ถ้าเกมให้ <b>Beginner's Garnier</b> (ATK 19, LUK 25) มาในกระเป๋า ให้ใส่ได้เลย",
         "ถ้าเกมให้ <b>Beginner's Garnier</b> (ATK 10, LUK 25) มาในกระเป๋า ให้ใส่ได้เลย"),
        ("ซึ่งอ่อนกว่า Beginner's Garnier (ATK 19) ถ้ามี Beginner's Garnier แล้วไม่ต้องซื้อหรือใช้", "ซึ่ง ATK เท่ากับ Beginner's Garnier ถ้ามี Beginner's Garnier แล้วไม่ต้องซื้อหรือใช้"),
        ("<b>ช่วงนี้ไม่ต้องซื้อ claw</b> ถ้ามี Beginner's Garnier (ATK 19) เพราะ Steel Titans (Lv.15, ATK 13) และ Steel Igor (Lv.20, ATK 17) อ่อนกว่า claw ที่ควรอัปเกรดจริงคือ <b>Meba</b> ตอนเลเวล 25",
         "<b>แผนหลักของไกด์นี้ยังไม่ซื้อ claw ช่วงนี้</b> ใช้ Beginner's Garnier (ATK 10) ไปก่อน แล้วอัปเกรดเป็น <b>Meba</b> ตอนเลเวล 25 เพื่อประหยัดเงินและลง LUK ได้เต็มที่"),
        ("ถ้าใช้ Garnier จากร้าน (ATK 10) ให้ซื้อ Steel Titans (ATK 13, ต้องมี DEX 15 และ LUK 35) ราคา 7,000 meso ตอนเลเวล 15 แล้วลง DEX ให้ถึง 15 ในเลเวล 15 แทนแผน AP ของ route",
         "ถ้าเงินพอและอยากฆ่าเร็วขึ้น Steel Titans (ATK 13, ต้องมี DEX 15) ราคา 7,000 meso และ Steel Igor (ATK 17, ต้องมี DEX 20) ราคา 14,100 meso ที่ Cutthroat Manny แรงกว่า Beginner's Garnier ชัดเจน แต่ต้องลง DEX เร็วกว่าแผน AP ของ route ดูแผนลง DEX เร็วในแท็บ Builds"),
        ("ตอนเลเวล 30 ซื้อ <b>Adamantium Guards</b> (ATK 23, Crit DMG +1%, ต้องมี DEX 30 และ LUK 65) ราคา 27,600 meso จาก <b>Cutthroat Manny</b> ที่ร้านอาวุธ Kerning City Self-Defence Item Store ในเมือง Kerning",
         "ตอนเลเวล 30 <b>ร้าน NPC ไม่มี claw ขายแล้ว</b> ให้ใช้ Meba ต่อ ถ้าอยากได้ <b>Adamantium Guards</b> (ATK 23, Crit DMG +1%, ต้องมี DEX 30 และ LUK 65) ให้คราฟต์ด้วย Weaponcrafting Lv.6 หรือซื้อจากผู้เล่นใน Free Market"),
        ('"Beginner\'s Garnier (Lv.10, ATK 19) + Subi Throwing Stars (+15)"', None),
    ],
    'mage': [
        ("แล้วเปลี่ยนเป็น Wooden Wand ที่เกมให้ตอนเปลี่ยนอาชีพเป็น Magician", "แล้วเปลี่ยนเป็น Beginner's Wooden Wand ที่เกมให้ตอนเปลี่ยนอาชีพเป็น Magician"),
        ("สวม <b>Wooden Wand</b> (M.ATK 27) ที่ได้ตอนเปลี่ยนอาชีพ", "สวม <b>Beginner's Wooden Wand</b> (M.ATK 26) ที่ได้ตอนเปลี่ยนอาชีพ"),
        ("ซึ่งทำให้ได้ Wooden Wand และ Energy Bolt", "ซึ่งทำให้ได้ Beginner's Wooden Wand และ Energy Bolt"),
        ("เมื่อถึงเลเวล 30 อัปเกรดอาวุธและชุด", "เมื่อถึงเลเวล 30 ยังไม่ต้องซื้ออาวุธและชุดใหม่ เพราะร้าน NPC ไม่มีของเลเวล 30 ขาย"),
        ("อาวุธ: <b>Mithril Wand</b> (M.ATK 55, INT 60 / LUK 20) ราคา 22,000 meso ที่ร้าน Flora the Fairy",
         "อาวุธ: ใช้ Ice Wand ต่อ เพราะ <b>Mithril Wand</b> (M.ATK 55, INT 60 / LUK 20) ขายที่ร้านใน Orbis ซึ่งยังไม่เปิด ถ้าอยากได้ให้ซื้อจากผู้เล่นใน Free Market หรือคราฟต์ด้วย Arc Forge"),
        ("ชุดตัวละครชาย: <b>Blue Wizard Robe</b> (INT+6)", "ชุดตัวละครชาย: ใช้ Blue Doros Robe ต่อ ถ้าเจอ <b>Blue Wizard Robe</b> (INT+6) ใน Free Market ค่อยเปลี่ยน"),
        ("ชุดตัวละครหญิง: ชุดสีฟ้าแบบแยกเสื้อและกระโปรง (รวม INT+6)", "ชุดตัวละครหญิง: ใช้ Brown Doroness Robe ต่อ ถ้าเจอ Blue Fairy Top กับ Blue Fairy Skirt (INT+3 ต่อชิ้น) ใน Free Market ค่อยเปลี่ยน"),
        ("ถ้าคราฟต์ไม่ได้ ให้ใช้ Mithril Wand ต่อ หรือซื้อใน Free Market", "ถ้าคราฟต์ไม่ได้ ให้ใช้ Ice Wand (หรือ Mithril Wand ถ้ามี) ต่อ หรือซื้อใน Free Market"),
    ],
}
# OPTDATA patches done structurally below

def opt_fix_assassin(O):
    def f(t):
        t = t.replace("Beginner's Garnier (Lv.10, ATK 19) + Subi Throwing Stars (+15)", "Beginner's Garnier (Lv.10, ATK 10) + Subi Throwing Stars (+15)")
        t = t.replace("Adamantium Guards (Lv.30, ATK 23) → Dark Guardian (Lv.35, ATK 26)", "Meba ใช้ต่อ → Dark Guardian (Lv.35, ATK 26)")
        t = t.replace("27,600 meso จาก <b>Cutthroat Manny</b> (Self-Defence Item Store, Kerning) → คราฟต์", "ร้าน NPC ไม่มี claw Lv.30 ขายตอนเปิดเกม → คราฟต์")
        t = t.replace("ข้ามได้: Steel Titans และ Steel Igor ถ้ามี Beginner's Garnier (ATK 19 สูงกว่า)", "ข้ามได้: Steel Titans และ Steel Igor แรงกว่า Beginner's Garnier (ATK 10) แต่ต้องลง DEX เร็วและใช้เงินเพิ่ม ดูแผนลง DEX เร็วในแท็บ Builds")
        t = t.replace("ซื้อแค่ 2 อัน (Meba, Adamantium Guards) รวมราว 44,000 meso", "ซื้อจากร้านแค่ Meba 16,500 meso (claw Lv.30 ขึ้นไปไม่มีขายในร้านตอนเปิดเกม)")
        t = t.replace("ซื้อ Meba / Adamantium Guards จากร้านใช้ถึง Lv.50 ได้", "ใช้ Meba จากร้านไปจนถึง Lv.50 ได้")
        t = t.replace("ใช้ Meba / Adamantium Guards จากร้านไปจนถึง Lv.50 ได้สบาย", "ใช้ Meba จากร้านไปจนถึง Lv.50 ได้")
        t = t.replace("ราคาเป็นราคาช่วงเทสต์ อาจเปลี่ยน", "ราคาร้านเป็นราคาหลังเปิดเกม")
        return t
    O = walk_str(O, f)
    for r in O['weapons']:
        if r[1] == "Beginner's Garnier": r[2] = "ATK 10 · LUK 25"; r[4] = "Garnier ในร้าน (ATK 10 เท่ากัน) 5,000 meso จาก Cutthroat Manny (Self-Defence Item Store, Kerning)"
        if r[1] == "Steel Titans (ข้ามได้)": r[4] = "7,000 meso จาก Cutthroat Manny แรงกว่า Beginner's Garnier แต่ต้องมี DEX 15"
        if r[1] == "Steel Igor (ข้ามได้)": r[4] = "14,100 meso จาก Cutthroat Manny แรงกว่า Beginner's Garnier แต่ต้องมี DEX 20"
        if r[1] == "Adamantium Guards": r[4] = "ไม่มีขาย NPC ตอนเปิดเกม — คราฟต์ / Free Market"; r[5] = "drop"
    return O

def opt_fix_mage(O):
    def f(t):
        t = t.replace("Wooden Wand (Lv.10) → Hardwood Wand (Lv.15) → Metal Wand (Lv.20)", "Beginner's Wooden Wand (Lv.10) → Hardwood Wand (Lv.15) → Metal Wand (Lv.20)")
        t = t.replace("Ice Wand (Lv.25) → Mithril Wand (Lv.30)", "Ice Wand (Lv.25) ใช้ต่อถึง Lv.39")
        t = t.replace("Blue Doros Robe (Lv.25, INT+5) → Blue Wizard Robe (Lv.30, INT+6)", "Blue Doros Robe (Lv.25, INT+5) ใช้ต่อถึง Lv.39")
        t = t.replace("Brown Doroness Robe (Lv.25, INT+5) → ชุดฟ้าแยกเสื้อ/กระโปรง (Lv.30, INT+6)", "Brown Doroness Robe (Lv.25, INT+5) ใช้ต่อถึง Lv.39")
        t = t.replace("Mithril Wand → Fairy Wand (Lv.40, M.ATK 69)", "Ice Wand → Fairy Wand (Lv.40, M.ATK 69)")
        t = t.replace("wand Lv.15–30 ซื้อร้านทั้งหมด 4 ด้าม", "wand Lv.15–25 ซื้อร้านได้ 3 ด้าม (Mithril Wand Lv.30 ขายที่ Orbis ซึ่งยังไม่เปิด)")
        t = t.replace("ราคาเป็นช่วงเทสต์ อาจเปลี่ยนตอนเปิดจริง", "ราคาร้านเป็นราคาหลังเปิดเกม")
        return t
    O = walk_str(O, f)
    for r in O['weapons']:
        if 'Wooden Wand' in r[1] and 'Beginner' not in r[1]:
            r[1] = r[1].replace('Wooden Wand', "Beginner's Wooden Wand").replace('/item-db/648', '/item-db/2523'); r[2] = "M.ATK 26"; r[4] = "ไม่ต้องซื้อ (Wooden Wand ในร้าน 3,000 meso แรงกว่าแค่ 1)"
        if 'Mithril Wand' in r[1]: r[3] = "ร้านใน Orbis (ยังไม่เปิด) / คราฟต์ Arc Forge"; r[4] = "ร้าน NPC ตอนเปิดเกมไม่มีขาย — Free Market"; r[5] = "craft"
    return O

def fix_route(guide, s):
    S, _, _ = get_json(s, 'S'); SQ, _, _ = get_json(s, 'SQ')
    if guide in ('assassin', 'mage'):
        if guide == 'assassin':
            SB = json.load(open(f'{B}/bandit_S.json'))
            for i, (a, b) in enumerate(zip(S, SB)):
                for k in ('title', 'next', 'where'):
                    if i == 28 and k == 'title': continue
                    if i == 35 and k == 'title': continue
                    a[k] = b[k]
            S[28]['title'] = "ตี Stirge ที่ Transfer Area (แมพตีมอนหลักของสายดาว)"
        else:
            for i, t in MAGE_TITLES.items(): S[i]['title'] = t
            for i, t in MAGE_WHERE.items(): S[i]['where'] = t
        for q in SQ:
            if q['id'] in SQ_TITLES: q['title'] = SQ_TITLES[q['id']]
        S = walk_str(S, word_fix); SQ = walk_str(SQ, word_fix)
        for a, b in FACT[guide]:
            if b is None: continue
            hit = [0]
            def f(t, a=a, b=b):
                if a in t: hit[0] += 1; return t.replace(a, b)
                return t
            S = walk_str(S, f); SQ = walk_str(SQ, f)
            assert hit[0] >= 1, (guide, a[:60])
    if guide == 'mage':
        cf = lambda n: f"<span class='cf' title='ผู้เล่นยืนยันดรอปใน Classic {n} คน'>ยืนยัน {n} คน</span>"
        ADD = {
            23: "Horny Mushroom ดรอป <b>Brown Jester</b> (หมวกเมจ Lv.30, INT+3) " + cf(8) + " ถ้าดรอปเก็บไว้ใส่ตอนเลเวล 30",
            31: "Zombie Mushroom ดรอป <b>Blue Chaos Robe</b> (Overall เมจ Lv.35, INT+6) " + cf(12) + " และ White Chaos Robe (LUK+6) " + cf(11) + " เก็บไว้ใส่ตอนเลเวล 35 เพราะร้านไม่มีชุดเลเวลนี้ขาย",
            35: "Dark Axe Stump ดรอป <b>Brown Matty</b> (หมวกเมจ Lv.35, INT+3) " + cf(4),
            39: "Fire Boar ดรอป <b>Red Amoria Skirt</b> (กระโปรงเมจ Lv.35, INT+3) " + cf(5) + " ใส่ได้ถ้าเป็นตัวละครหญิงที่ใส่เสื้อกับกระโปรงแยกกัน",
            42: "Zombie Lupin ดรอป <b>Blue Moonlight</b> (Overall เมจ Lv.40, INT+8) " + cf(4) + " ดีกว่า Doros Robe มาก ถ้าดรอปให้ใส่ทันที",
        }
        for i, x in ADD.items():
            S[i].setdefault('opt', []).insert(0, {"k": "drop", "x": x})
    s = put_json(s, 'S', S); s = put_json(s, 'SQ', SQ)
    if guide == 'assassin':
        O, _, _ = get_json(s, 'OPTDATA'); s = put_json(s, 'OPTDATA', opt_fix_assassin(walk_str(O, word_fix)))
    if guide == 'mage':
        O, _, _ = get_json(s, 'OPTDATA'); s = put_json(s, 'OPTDATA', opt_fix_mage(walk_str(O, word_fix)))
    return s

# ------------------------------------------------------------------ main patch
def patch(guide):
    s = open(f'{G}/{guide}.html').read()
    pre = s[:s.find('<script>')]

    # ---- CSS: unify (Bandit CSS is a superset) + mage .c2 rows + grind CSS
    def css_of(x):
        i = x.find('<style>', x.find('<head>', 200)); j = x.find('</style>', i)
        return i + 7, j
    bs = open(f'{G}/bandit.html').read()
    bi, bj = css_of(bs); bcss = bs[bi:bj]
    bcss = once(bcss, '.prow.c3{grid-template-columns:1.3fr 1.4fr .8fr}', '.prow.c3{grid-template-columns:1.3fr 1.4fr .8fr}.prow.c2{grid-template-columns:.8fr 2fr}')
    bcss = once(bcss, '  .prow,.prow.w,.prow.c5,.prow.c4,.prow.c3{grid-template-columns:1fr;gap:2px;padding:10px 14px}',
                '  .prow,.prow.w,.prow.c5,.prow.c4,.prow.c3,.prow.c2{grid-template-columns:1fr;gap:2px;padding:10px 14px}')
    bcss += '\n' + GRIND_CSS + '\n.tabs{overflow-x:auto;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}.tabs button{flex:0 0 auto;white-space:nowrap}\n'
    i, j = css_of(s); s = s[:i] + bcss + s[j:]

    # ---- header
    if guide != 'bandit':
        s = once(s, '\n    <button class="bar-btn" id="reset">เริ่มใหม่</button>', '')
        s = once(s, '    <button type="button" role="tab" data-tab="route" aria-selected="true">Route หลัก</button>',
                 '    <button type="button" role="tab" data-tab="builds" aria-selected="false">Builds</button>\n    <button type="button" role="tab" data-tab="route" aria-selected="true">Route หลัก</button>')
        s = once(s, '<div id="intro" aria-label="คู่มือเริ่มต้น"></div>\n', '<div id="intro" aria-label="คู่มือเริ่มต้น"></div>\n<div id="builds" aria-label="Builds"></div>\n')
        s = once(s, '$("reset").onclick = () => { if (confirm("ล้างเช็กลิสต์ทั้งหมดแล้วกลับไปขั้นที่ 1?")) { state = {i:0, done:{}, tab:state.tab}; save(); render(); } };\n', '')
        s = once(s, 'if (moneyRendered) renderMoney(); }', 'if (moneyRendered) renderMoney(); if (buildsRendered) renderBuilds(); }')
    s = once(s, '    <button type="button" role="tab" data-tab="route" aria-selected="true">Route หลัก</button>',
             '    <button type="button" role="tab" data-tab="route" aria-selected="true">Route หลัก</button>\n    <button type="button" role="tab" data-tab="grind" aria-selected="false">สายตีมอน</button>')
    s = once(s, '<div id="opt" aria-label="ล่าของและคราฟต์"></div>', '<div id="grind" aria-label="สายตีมอน"></div>\n<div id="opt" aria-label="ล่าของและคราฟต์"></div>')

    # ---- state restore: accept builds & grind tabs
    s = re.sub(r'tab:\["opt","route","intro","money"(?:,"builds")?\]\.includes\(s\.tab\)\?s\.tab:"route", w15:true\}',
               'tab:["opt","route","intro","money","builds","grind"].includes(s.tab)?s.tab:"route", w15:true, gpace:s.gpace}', s, count=1)
    assert '"builds","grind"].includes(s.tab)' in s

    # ---- route text fixes
    s = fix_route(guide, s)

    # ---- MOB stats to launch values + Clang
    MOB, _, _ = get_json(s, 'MOB')
    for n, v in MOB.items():
        o = MOBS.get(n)
        if o: v['lv'] = str(o['level']); v['hp'] = f"{o['hp']:,}"; v['exp'] = str(o['exp'])
    o = MOBS['Clang']
    MOB['Clang'] = {"i": "g/mob44.gif", "a": "g/mob44.webp", "lv": str(o['level']), "hp": f"{o['hp']:,}", "exp": str(o['exp']), "u": "https://meowdb.com/msclassic/monsters/44"}
    s = put_json(s, 'MOB', MOB, compact=True)
    try:
        MM, _, _ = get_json(s, 'MOB_MAPS')
        MM.setdefault('Fire Boar', ["The Burnt Land V", "The Burnt Land III", "Dangerous Valley", "The Burnt Land IV", "East Rocky Mountain VII", "The Burnt Land II"])
        MM.setdefault('Clang', ["Lorang and Clang", "Clang and Lorang", "Hot Sand"])
        s = put_json(s, 'MOB_MAPS', MM)
    except AssertionError:
        pass

    # ---- MINI + NAV for grind
    MINI, _, _ = get_json(s, 'MINI')
    for mid, m in GD['mini'].items():
        if mid not in MINI: MINI[mid] = {"u": f"g/{mid}.png", "w": m['w'], "h": m['h']}
    s = put_json(s, 'MINI', MINI, compact=True)
    NAV, _, _ = get_json(s, 'NAV')
    for k, v in GD['navs'].items(): NAV[k] = v
    s = put_json(s, 'NAV', NAV)

    # ---- introHTML
    _intro_new = open(f'{B}/{guide}_intro_new.js').read()
    i = s.find('function introHTML(){'); j = s.find('\n\n/* ---------- Navigation', i)
    if j < 0: j = s.find('\nconst NAV = ', i)
    assert i > 0 and j > i
    s = s[:i] + _intro_new.rstrip('\n') + '\n' + s[j:]

    # ---- Builds
    if guide == 'bandit':
        Bo, _, _ = get_json(s, 'BUILD')
        Bo['stat'] = {"base": {"str": 4, "dex": 5, "int": 4, "luk": 12}, "phases": [[2, 10, {"luk": 5}], [11, 99, {"dex": 1, "luk": 4}]]}
        Bo['main'] = ["dex", "luk"]; Bo['tot'] = ["watk", "luk", "dex", "wdef"]; Bo['wlabel'] = "มีด"
        s = put_json(s, 'BUILD', Bo, compact=True)
        s = once(s, '    ],\n  },\n});\n', '    ],\n    spTables: [' + open(f'{B}/bandit_sptable.json').read() + '],\n  },\n});\n')
        i = s.find('/* ---------- แท็บ Builds ---------- */'); j = s.find('function renderBuilds')
        s = s[:i] + BUILDS_JS + s[j:]
    else:
        BD = json.load(open(f'{B}/build_{guide}.json'))
        block = '/* ---------- Builds data (stats from NiaMeowDB item API, NPC shop prices read from the game at launch) ---------- */\nconst BUILD = ' + \
            json.dumps(BD, ensure_ascii=False, separators=(',', ':')) + ';\n' + BUILDS_JS + \
            'function renderBuilds(){ $("builds").innerHTML = buildsHTML(); renderGear(); renderBTable(); }\n\n'
        s = once(s, 'let optRendered = false, introRendered = false;\n', block + 'let optRendered = false, introRendered = false, buildsRendered = false;\n')

    # ---- Grind data + code
    GG = GD['guides'][guide]
    gblock = '/* ---------- สายตีมอน data (NiaMeowDB launch values) ---------- */\nconst GRIND = ' + json.dumps(GG, ensure_ascii=False, separators=(',', ':')) + ';\n' + GRIND_JS + '\n'
    s = once(s, 'let optRendered = false, introRendered = false, buildsRendered = false;\n', gblock + 'let optRendered = false, introRendered = false, buildsRendered = false;\n')

    # ---- setTab
    i = s.find('function setTab(t){'); j = s.find('\n}\n', i) + 3
    s = s[:i] + '''function setTab(t){
  state.tab = ["opt","intro","money","builds","grind"].includes(t) ? t : "route"; save();
  document.body.dataset.tab = state.tab;
  document.querySelectorAll(".tabs [data-tab]").forEach(b=>b.setAttribute("aria-selected", b.dataset.tab===state.tab ? "true":"false"));
  const sel = document.querySelector(`.tabs [data-tab="${state.tab}"]`); if (sel && sel.scrollIntoView) sel.scrollIntoView({block:"nearest", inline:"nearest"});
  if (state.tab === "opt" && !optRendered){ $("opt").innerHTML = optPageHTML(); optRendered = true; }
  if (state.tab === "intro" && !introRendered){ $("intro").innerHTML = introHTML(); introRendered = true; }
  if (state.tab === "money" && !moneyRendered){ renderMoney(); moneyRendered = true; }
  if (state.tab === "builds" && !buildsRendered){ renderBuilds(); buildsRendered = true; }
  if (state.tab === "grind" && !grindRendered){ renderGrind(); }
  closeAll();
  window.scrollTo({top:0});
}
''' + s[j:]

    # ---- route card hint
    s = once(s, '    ${sqBoxHTML(i)}\n    ${navHTML(i)}', '    ${sqBoxHTML(i)}\n    ${grindHint(i)}\n    ${navHTML(i)}')

    open(f'{OUT}/{guide}.html', 'w').write(s)
    return s

if __name__ == '__main__':
    # Bandit S for Assassin title copy
    bs = open(f'{G}/bandit.html').read()
    SB, _, _ = get_json(bs, 'S'); json.dump(SB, open(f'{B}/bandit_S.json', 'w'), ensure_ascii=False)
    for g in sys.argv[1:] or ['bandit', 'assassin', 'mage']:
        out = patch(g)
        print(g, len(out))
