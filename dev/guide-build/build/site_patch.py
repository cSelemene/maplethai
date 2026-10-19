"""Guide fixes from the 2026-10-19 review, applied on top of the website copies (after site_merge).

Bandit: LUK/DEX damage explainer, STR-dagger warning + how-to, Dexless / Korean Fan explainer with the
owner's verdict, owner's budget weapon path, Dagger Mastery-first SP order with the reason, NPC thief armor
(Pao Lv.20 / Sneak Lv.25) in the gear brackets, Dark Cleave as craft/buy.
All guides: John quests (Deep Forest of Patience) need Lv.65 in Classic, so remove them from Lv.45 plans.
Assassin: Dark Slain / Steel Slain cannot be crafted yet (Weaponcrafting Lv.10, crafting stops at Lv.8).
Mage: Cromi cannot be crafted yet (Arc Forge Lv.10), Dark Arten is craft-only, Pansy Earrings has no source,
Blue Bamboo Hat is not confirmed as a Kerning PQ reward.
"""
import json, sys

B = '/home/claude/build/'
NEW = json.load(open(B + 'newitems.json'))


def rep(t, old, new, count=1):
    n = t.count(old)
    if n != count:
        sys.exit(f'expected {count} of {old[:90]!r}, found {n}')
    return t.replace(old, new)


def J(t, var, fn):
    """Edit one `const VAR = <json>;` line in place, keeping its JSON spacing style."""
    key = f'const {var} = '
    lines = t.split('\n')
    idx = [i for i, l in enumerate(lines) if l.startswith(key)]
    assert len(idx) == 1, var
    s = lines[idx[0]][len(key):]
    assert s.endswith(';')
    s = s[:-1]
    o = json.loads(s)
    compact = json.dumps(o, ensure_ascii=False, separators=(',', ':')) == s
    assert compact or json.dumps(o, ensure_ascii=False) == s, var
    r = fn(o)
    o = o if r is None else r
    lines[idx[0]] = key + (json.dumps(o, ensure_ascii=False, separators=(',', ':')) if compact else json.dumps(o, ensure_ascii=False)) + ';'
    return '\n'.join(lines)


def ssub(s, old, new):
    assert s.count(old) == 1, (old, s[:200])
    return s.replace(old, new)


def assassin_items(names):
    """Item records that only the Assassin build lists (Sauna Robes, Squishy Shoes), reused for the Bandit."""
    for l in open('/home/claude/out/assassin.html').read().split('\n'):
        if l.startswith('const BUILD = '):
            it = json.loads(l[len('const BUILD = '):].rstrip(';'))['items']
            return {n: it[n] for n in names}
    raise SystemExit('assassin BUILD not found')


# ---------------------------------------------------------------- shared thief fixes
DARK_CLEAVE_SRC = 'คราฟต์ด้วย Leatherworking (ใช้ Drake Skull และ Black Crystal) หรือซื้อจากผู้เล่น · เควส John\'s Present ใน Classic ต้องเลเวล 65 และให้ Steel Pow แทน'
JOHN_NOTE = 'เควสของ John (Deep Forest of Patience) ใน Classic ต้องเลเวล 65 ไม่อยู่ในช่วงไกด์นี้'


def thief_common(B_, extra_items):
    it = B_['items']
    dc = it['Dark Cleave']
    dc['k'] = ['craft']
    dc['src'] = DARK_CLEAVE_SRC
    dc['note'] = 'LUK +4 ถุงมือโจรที่ดีที่สุดก่อนเลเวล 50 แต่ไม่มีเควสให้ฟรี ต้องคราฟต์หรือซื้อ'
    for n, rec in NEW.items():
        if n not in it:
            it[n] = rec
    for n, rec in extra_items.items():
        if n not in it:
            it[n] = rec
    # tables
    tb = {t['k']: t for t in B_['tables']}
    def add(k, names, after=None):
        items = tb[k]['items']
        for n in names:
            if n not in items:
                items.append(n)
    add('hat', ['Black Loosecap', 'Dark Tiberian', 'Yellow Baseball Cap'])
    add('top', ['Dark Sneak', 'Blue Sauna Robe', 'Red Sauna Robe'])
    add('bottom', ['Black Pao Bottoms', 'Dark Sneak Pants'])
    add('shoes', ['Squishy Shoes'])
    # brackets
    br = {tuple(b['lv']): b for b in B_['br']}
    def slot(b, k, i, alt=None, opt=False, note=None):
        b['s'][k] = {'i': i, 'alt': alt or [], 'opt': opt, 'note': note}
    b = br[(20, 24)]
    slot(b, 'hat', 'Black Thief Hood', ['Black Loosecap'])
    slot(b, 'top', 'Dark Nightshift', ['Black Pao'])
    slot(b, 'bottom', 'Dark Nightshift Pants', ['Black Pao Bottoms'])
    b['tip'] = b['tip'] + ' ถ้าเงินเหลือ ชุด Pao ที่ Don Hwang (Kerning) ให้ LUK +2 ต่อชิ้น แต่จะใส่ได้แค่ 5 เลเวลก่อนชุด Lv.25 จึงข้ามได้'
    b = br[(25, 29)]
    slot(b, 'hat', 'Brown Bamboo Hat', ['Dark Tiberian'], note='หมวกฟรีจากเควส ถ้าอยากได้ LUK ซื้อ Dark Tiberian (LUK +2) แทน')
    slot(b, 'top', 'Dark Sneak', ['Dark Nightshift'], note='ร้าน Don Hwang ที่ Kerning 7,500 meso')
    slot(b, 'bottom', 'Dark Sneak Pants', ['Dark Nightshift Pants'], note='ร้าน Don Hwang ที่ Kerning 6,000 meso')
    b['tip'] = 'ชุด Sneak Lv.25 เป็นชุดโจรชุดสุดท้ายที่ร้าน NPC มีขาย (ชุด Lv.30 ขึ้นไปต้องดรอปเท่านั้น) เสื้อกับกางเกงรวม 13,500 meso ได้ LUK +4 และ WDEF มากกว่าชุด Lv.15 ราว 14 ใช้ได้ยาวถึงเลเวล 40 ถ้าเงินไม่พอใช้ชุด Lv.15 ต่อได้'
    for lv in [(30, 34), (35, 39), (40, 44), (45, 50)]:
        b = br[lv]
        top_alt = ['Black Knucklevest'] if lv != (30, 34) else []
        slot(b, 'top', 'Dark Sneak', top_alt + ['Blue Sauna Robe', 'Red Sauna Robe'] if lv != (30, 34) else [])
        slot(b, 'bottom', 'Dark Sneak Pants', ['Black Knucklevest Pants'] if lv != (30, 34) else [])
        if b['s'].get('hat', {}).get('i') == 'Brown Bamboo Hat' and 'Dark Tiberian' not in b['s']['hat']['alt']:
            b['s']['hat']['alt'].insert(0, 'Dark Tiberian')
    b = br[(45, 50)]
    b['head'] = 'ผ้าคลุม Icarus ฟรีจากเควส ถุงมือ LUK ต้องคราฟต์หรือซื้อ'
    slot(b, 'gloves', 'Dark Cleave', ['Gold Arbion', 'Black Duo'], opt=True, note='คราฟต์หรือซื้อราว 80,000 meso ไม่มีเควสให้ฟรี ถ้าแพงไปใช้ Gold Arbion หรือ Black Duo')
    ear = b['s'].get('ear')
    if ear and 'Pansy Earrings' in ear['alt']:
        ear['alt'].remove('Pansy Earrings')
    br[(35, 39)]['tip'] = 'เสื้อและกางเกง Knucklevest ให้ LUK +3 ต่อชิ้นแต่ได้จากการดรอปเท่านั้น ส่วน Sauna Robe ได้ฟรีจากเควสตอนเลเวล 37 (overall ทุกสเตตัส +1, WDEF 75, 10 ช่องม้วน) ใส่แทนเสื้อกับกางเกงได้ ถ้ายังไม่ได้ทั้งสองอย่างใช้ชุด Sneak ต่อ'
    # Sauna robe / Squishy notes for thieves
    for n in ('Blue Sauna Robe', 'Red Sauna Robe'):
        if n in it:
            it[n]['note'] = 'Overall ทุกสเตตัส +1, WDEF 75 และ 10 ช่องม้วน ใส่แทนเสื้อและกางเกงพร้อมกัน LUK น้อยกว่าชุด Sneak (+4) หรือ Knucklevest (+6) ถ้ายังไม่ตีม้วน'
    # Pansy Earrings has no Classic source
    if 'Pansy Earrings' in it:
        it['Pansy Earrings']['k'] = ['none']
        it['Pansy Earrings']['src'] = 'ยังไม่มีแหล่งได้ใน Classic (เควส John\'s Last Present ใน Classic ต้องเลเวล 65 และให้ Pink-Flowered Earrings แทน)'
        it['Pansy Earrings']['note'] = 'หาไม่ได้ในตอนนี้'


def thief_john(t, guide):
    def S(o):
        o[42]['opt'] = [x for x in o[42]['opt'] if 'John' not in x['x']]
        o[42]['opt'].append({"k": "quest", "x": "ถุงมือ LUK ช่วงนี้ (Gold Arbion Lv.35, Dark Cleave Lv.40) ไม่มีเควสให้ฟรี ต้องคราฟต์ด้วย Leatherworking หรือซื้อจากผู้เล่น เควสของ John ที่ Lith Harbor ใน Classic ต้องเลเวล 65"})
    t = J(t, 'S', S)
    t = J(t, 'SQ', lambda o: [x for x in o if x.get('id') != 'john'])

    def O(o):
        g1 = [r for r in o['gear'][1][2] if r[0] == 'ถุงมือ'][0]
        g1[2] = 'ถุงมือโจรยังไม่มีดรอปที่ยืนยัน คราฟต์ Black Duo (Lv.15) หรือ Dark Wolfskin (Lv.25) ด้วย Leatherworking หรือซื้อจากผู้เล่น'
        rows = o['gear'][3][2]
        o['gear'][3][1] = 'หมวกและผ้าคลุมได้จากเควส ส่วนถุงมือต้องคราฟต์หรือซื้อ'
        for r in rows:
            if r[0] == 'ถุงมือ':
                r[1] = 'Gold Arbion (Lv.35, LUK+3) → Dark Cleave (Lv.40, LUK+4)'
                r[2] = 'คราฟต์ด้วย Leatherworking หรือซื้อจากผู้เล่น · Dark Cleave ราว 80,000 meso'
            if r[0] == 'ต่างหู':
                r[1] = 'Weighted Earrings / Star Earrings ใช้ต่อ'
                r[2] = 'ยังไม่มีต่างหูที่ให้สเตตัสโจรหาได้ง่ายในช่วงนี้ (Pansy Earrings ยังไม่มีแหล่งใน Classic)'
        o['side'] = [s for s in o['side'] if 'John' not in s[0]]
        o['mats'][0][3] = '—'
    t = J(t, 'OPTDATA', O)
    t = J(t, 'GRIND', lambda o: o['must'].__setitem__(slice(None), [m for m in o['must'] if 'John' not in m[1]]))
    return t


# ---------------------------------------------------------------- Bandit
BANDIT_JS = r'''
/* Guide review 2026-10-19: AP explainers, STR / Dexless / budget weapon notes, Mastery-first SP. */
BUILD.text.summary[0][1] = "LUK เป็นหลัก ลง DEX พอใส่มีดและชุด (DEX = เลเวล − 5) ไม่ลง STR และ INT ถ้าจะใช้มีด STR ต้องใช้แผนอื่น";
BUILD.text.summary[1][1] = "Double Stab ก่อน แล้ว Dark Sight ขั้นสองเต็ม Dagger Mastery ก่อน แล้วใช้ Savage Blow เป็นท่าหลักตั้งแต่ Lv.44";
BUILD.text.apRules = [
  "<b>LUK</b> คือสเตตัสหลักของโจร ดันดาเมจ<b>ขอบบน</b>มากที่สุด (ในขอบบน LUK 1 แต้มมีน้ำหนักเท่ากับ DEX 2 แต้ม) ให้ลง LUK เป็นหลัก",
  "<b>DEX ไม่ได้ลงทิ้งเปล่า</b> DEX บวกทั้งขอบบนและ<b>ขอบล่าง</b>เท่ากัน จึงดันดาเมจเฉลี่ยขึ้นด้วย และเพิ่มความแม่น (ACC) แผนนี้ลง DEX 1 แต้มต่อเลเวล (DEX = เลเวล − 5) พอใส่มีด DEX และชุดโจรทุกช่วงพอดี ดูตัวเลขในหัวข้อ “LUK กับ DEX ต่างกันยังไง” ด้านล่าง",
  "<b>แผนหลักไม่ลง STR และ INT</b> มีดสาย STR (Triple-Tipped Zamadar, Stinger, Cass, Bazlud, Sai) จึงใส่ไม่ได้ <b>ถ้าจะใช้มีด STR ต้องเปลี่ยนแผนลงสเตตัสตั้งแต่ต้น</b> ดูหัวข้อ “ถ้าจะใช้มีด STR” ด้านล่าง",
  "<b>ถ้าขึ้น MISS บ่อย</b> ให้เก็บเลเวลก่อน อย่าลง DEX เพิ่ม เพราะเลเวลของตัวละครช่วยเรื่องความแม่นได้มากกว่า",
];
BUILD.text.spRules[3] = "<b>ขั้นสองมี 121 SP</b> Mastery 5 → Booster 1 / Haste 1 แล้ว<b>เต็ม Dagger Mastery ก่อน</b>ที่ Lv.37 จากนั้นค่อยเร่ง Savage Blow เหตุผลอยู่ในหัวข้อ “ทำไมต้องเต็ม Dagger Mastery ก่อน”";
BUILD.text.spWhy = `<h3 class="sub-h">ทำไมต้องเต็ม Dagger Mastery ก่อน</h3>
  <div class="card band pad bwhy">
    <p>คำอธิบายในเกมบอกแค่ว่าเพิ่ม Mastery และ Critical Rate แต่ผลที่สำคัญกว่าคือ <b>Mastery บีบช่วงดาเมจให้แคบลง</b> ทุกครั้งที่ตี เกมจะสุ่มดาเมจระหว่างขอบล่างกับขอบบน Dagger Mastery ยกขอบล่างขึ้นมาใกล้ขอบบน ฮิตที่ออกต่ำ ๆ จึงลดลงมาก และดาเมจเฉลี่ยสูงขึ้นตาม</p>
    <div class="btbl"><table><thead><tr><th>Dagger Mastery</th><th>ขอบล่างเทียบขอบบน</th><th>ดาเมจเฉลี่ย</th></tr></thead><tbody>
      <tr><td>ยังไม่ลง</td><td class="num">32%</td><td class="num">100%</td></tr>
      <tr><td>5 แต้ม (ปลด Booster)</td><td class="num">46%</td><td class="num">111%</td></tr>
      <tr><td>20 แต้ม (เต็ม)</td><td class="num">79%</td><td class="num">136%</td></tr>
    </tbody></table></div>
    <p class="onote">ตัวอย่างโจรเลเวล 30 ตามบิลด์นี้ (LUK 137, DEX 25, STR 4) ไม่นับชุด คำนวณจากสูตรดาเมจของ MeowDB ตัวเลขเป็นสัดส่วน ใช้ได้กับทุกอาวุธและทุกสกิล</p>
    <ul class="olist">
      <li><b>ขอบล่างตัดสินว่าฆ่ามอนได้ในกี่ครั้งแน่นอน</b> ถ้าขอบล่างต่ำ บางครั้งต้องตีเพิ่มอีกครั้งทั้งที่เฉลี่ยควรตายแล้ว เสียทั้งเวลาและ MP</li>
      <li><b>ได้ Critical Rate +20%</b> และโอกาสไม่กระเด็นเมื่อโดนตี 20% เพิ่มอีก</li>
      <li><b>เทียบกับ Savage Blow ก่อน</b> MeowDB จำลองที่เลเวล 39 (Training Advisor) ได้ราว 4,740 EXP/นาทีเมื่อเต็ม Mastery ก่อน เทียบกับราว 3,600 EXP/นาทีเมื่อลง Savage Blow ก่อน</li>
      <li>ช่วงลง Mastery ยังใช้ Double Stab 20 เป็นท่าหลัก (Double Stab เต็มแล้วตั้งแต่ขั้นแรก) จึงได้ผลทันทีทุกเลเวลที่ลง</li>
    </ul>
  </div>`;
function bHow(it){
  if (!it || !it.howto) return "";
  const lab = it.howto === "b-str" ? "มีด STR: ต้องลงสเตตัสแบบอื่น ดูวิธี" : "อ่านเรื่องบิลด์ Dexless ก่อนซื้อ";
  return `<button type="button" class="bhow" data-jump="${it.howto}">${lab} →</button>`;
}
function banditApMore(){
  const p = n => bPrice(n) || "—";
  return `<style>
  #builds details.bmore{margin:14px 0;padding:0}
  #builds details.bmore>summary{cursor:pointer;padding:14px 18px;font-weight:700;font-size:17px;list-style-position:inside}
  #builds details.bmore>div{padding:0 18px 16px}
  #builds details.bmore.warn>summary{color:var(--maple)}
  #builds .bhow{display:inline-block;margin-top:6px;padding:4px 10px;border:1px solid var(--maple);border-radius:999px;background:transparent;color:var(--maple);font:inherit;font-size:13px;cursor:pointer}
  #builds .bhow:hover{background:var(--panel2)}
  </style>
  <details class="card band bmore" id="b-lukdex"><summary>LUK กับ DEX ต่างกันยังไง ทำไม DEX ก็ช่วยให้ตีแรงขึ้น</summary><div>
    <p>ดาเมจของมีดสุ่มอยู่ระหว่าง<b>ขอบล่าง</b>กับ<b>ขอบบน</b> สูตรของ MeowDB สำหรับ Bandit คือ</p>
    <ul class="olist">
      <li>ขอบบน = (1 + (2 × LUK + STR + DEX) / 100) × ATK อาวุธ × % สกิล</li>
      <li>ขอบล่าง = (0.8 + (2 × LUK × Mastery + STR + DEX) / 100) × ATK อาวุธ × % สกิล</li>
    </ul>
    <p>LUK ถูกคูณ 2 ในขอบบน แต่ในขอบล่างยังถูกคูณด้วยค่า Mastery อีกชั้น ซึ่งเริ่มที่ 0.07 และขึ้นเป็น 0.77 เมื่อ Dagger Mastery เต็ม ส่วน <b>DEX และ STR บวกเข้าทั้งสองขอบเท่ากันเสมอ</b> LUK จึงดันขอบบน DEX ดันขอบล่าง และทั้งคู่ทำให้ดาเมจเฉลี่ยเพิ่ม</p>
    <div class="btbl"><table><thead><tr><th>ตัวละคร Lv.30 (LUK 137, DEX 25)</th><th>LUK +10</th><th>DEX +10</th></tr></thead><tbody>
      <tr><td>ยังไม่ลง Dagger Mastery</td><td class="num">ดาเมจเฉลี่ย +4.0%</td><td class="num">ดาเมจเฉลี่ย +3.8%</td></tr>
      <tr><td>Dagger Mastery 5</td><td class="num">+4.3%</td><td class="num">+3.4%</td></tr>
      <tr><td>Dagger Mastery 20</td><td class="num">+4.9%</td><td class="num">+2.8%</td></tr>
    </tbody></table></div>
    <p>ก่อนมี Mastery, DEX 1 แต้มเพิ่มดาเมจเฉลี่ยเกือบเท่า LUK 1 แต้ม หลัง Mastery เต็ม LUK คุ้มกว่าราว 1.5–1.8 เท่า (MeowDB ทดสอบบิลด์ Lv.70: LUK +10 ดาเมจ +2.31% ส่วน DEX หรือ STR +10 ดาเมจ +1.30%)</p>
    <p>DEX ยังเพิ่มความแม่น ACC ของโจร ≈ (1.2 × DEX + 0.6 × LUK + 2 × เลเวล) / 4 + 15 ทำให้ MISS น้อยลงกับมอนเลเวลสูงกว่า หลักที่ดีที่สุดคือ<b>ลง DEX ให้พอใส่ของและพอแม่น แล้วที่เหลือลง LUK</b> ตามแผนของไกด์นี้</p>
  </div></details>
  <details class="card band bmore warn" id="b-str"><summary>⚠ ถ้าจะใช้มีด STR ต้องลงสเตตัสแบบไหน</summary><div>
    <p><b>แผน AP ในตารางด้านบนใส่มีด STR ไม่ได้</b> มีดกลุ่มนี้ต้องการ STR แทน DEX แต่แผนนี้มี STR 4 ตลอด ถ้าจะใช้ต้องตัดสินใจตั้งแต่ช่วงต้น เพราะแต้มที่ลงไปแล้วต้องใช้ AP Reset แก้ มีด STR ยังใช้ LUK เป็นสเตตัสหลักเหมือนเดิม STR แค่มาแทนที่ DEX</p>
    <div class="btbl"><table><thead><tr><th>Lv</th><th>มีด DEX</th><th>มีด STR / เร็วกว่า</th></tr></thead><tbody>
      <tr><td class="num">17–22</td><td>—</td><td>Triple-Tipped Zamadar (STR 11, ATK 34) · Stinger (STR 17, ATK 39)</td></tr>
      <tr><td class="num">30</td><td>Reef Claw (DEX 25, ATK 48, Fast 4)</td><td>Cass (STR 25, ATK 47, Faster 3)</td></tr>
      <tr><td class="num">35</td><td>Halfmoon Zamadar (DEX 30, ATK 53)</td><td>— ไม่มีมีด STR</td></tr>
      <tr><td class="num">40</td><td>Gephart (DEX 35, ATK 58, Fast 4)</td><td>Korean Fan (LUK 70 อย่างเดียว, ATK 55, Faster 3)</td></tr>
      <tr><td class="num">45</td><td>— ไม่มีมีด DEX</td><td>Bazlud (STR 40, ATK 62, Faster 3)</td></tr>
      <tr><td class="num">50</td><td>Shinkita (DEX 45, ATK 68, Fast 4)</td><td>Sai (STR 45, ATK 67, Faster 3)</td></tr>
    </tbody></table></div>
    <p><b>วิธีลงสเตตัสแบบที่นิยม</b> (จากไกด์ Strength Bandit บน MeowDB)</p>
    <ol class="steps">
      <li><b>Full STR</b> ลง STR = เลเวล − 5 และ DEX = เลเวล − 10 ที่เหลือลง LUK (ได้ LUK เลเวลละ 3 แทน 4) ใส่มีด STR และชุดโจรได้เองโดยไม่ต้องพึ่งของที่ให้ STR ตีม้วน LUK ได้เต็มที่ แต่ช่วงแรกจะเบากว่า ที่เลเวล 50 จะมี STR 45 / DEX 40 / LUK ราว 181 เทียบกับแผนหลัก DEX 45 / LUK 217</li>
      <li><b>Low STR</b> ลง STR ให้ถึง 11 แล้วหยุด DEX = เลเวล − 10 ที่เหลือลง LUK ใช้ชุดและต่างหูที่ให้ STR ช่วยใส่มีด ไกด์ต้นทางบอกว่าไม่ต้องตีม้วนจนถึงเลเวล 30 และใช้แค่ม้วน 100% ถึงเลเวล 50</li>
      <li><b>STR 4–5</b> แทบไม่ลง STR, DEX = เลเวล − 10 ที่เหลือลง LUK ได้ LUK มากที่สุด แต่ต้องมีต่างหู STR +6 ตั้งแต่เลเวล 22 และต้องตีม้วน STR แพงตลอดทางเพื่อใส่มีดเล่มถัดไป</li>
    </ol>
    <ul class="olist">
      <li><b>ข้อดี:</b> ตีเร็วกว่ามีด DEX หนึ่งขั้น (Faster 3 กับ Booster เหลือ speed 1) มอนที่ต้องตีจำนวนครั้งเท่ากันจะเคลียร์ได้ไวกว่า และ STR บวกดาเมจเท่ากับ DEX ทุกแต้มตามสูตรด้านบน</li>
      <li><b>ข้อเสีย:</b> ATK น้อยกว่ามีด DEX เลเวลเดียวกัน 1 DPS ตีเป้านิ่งต่ำกว่าราว 3–4% และ ACC ต่ำกว่า (Full STR ที่เลเวล 50 น้อยกว่าราว 7)</li>
      <li><b>ช่องว่างของอุปกรณ์:</b> เลเวล 35–44 ไม่มีมีด STR ใหม่ (Cass Lv.30 → Bazlud Lv.45) และ overall Lv.35 Dark Avenger ที่บิลด์นี้พึ่งพา ใส่ได้เฉพาะตัวละครหญิง</li>
    </ul>
    <p class="onote">MeowDB ไม่ฟันธงแล้วว่ามีด STR หรือมีด DEX ดีกว่า หลักเดียวกันทั้งสองสายคือ ลง STR หรือ DEX แค่พอใส่ของและพอแม่น ที่เหลือลง LUK ทั้งหมด ราคามีด STR ตอนนี้: Cass ${p("Cass")} · Bazlud ${p("Bazlud")}</p>
  </div></details>
  <details class="card band bmore" id="b-dexless"><summary>Korean Fan กับบิลด์ Dexless (LUK ล้วน) ทำไมไกด์นี้ไม่แนะนำ</summary><div>
    <p>Korean Fan (Lv.40, ATK 55, Faster 3) ต้องการแค่ LUK 70 ไม่ต้องมี DEX หรือ STR จึงมีบิลด์ที่เรียกว่า <b>Dexless</b> คือไม่ลง DEX ลง LUK ล้วน แล้วใส่ของที่ไม่ต้องใช้ DEX แทนชุดโจร เช่น Sauna Robe (overall Lv.30 ทุกสเตตัส +1 จากเควสเลเวล 37), Squishy Shoes (Lv.28 ดรอปจาก King Slime), ถุงมือ Duo (Lv.15 ต้องการแค่ LUK 20), Yellow Baseball Cap (Lv.22 LUK +2 ร้าน Sam ที่ Henesys) หรือ Yellow Starry Bandana (Lv.25 LUK +2 คราฟต์)</p>
    <p><b>ความเห็นจากการทดลองของเจ้าของไกด์: ไม่แนะนำสำหรับคนทั่วไป</b></p>
    <ul class="olist">
      <li><b>แพงมาก</b> Korean Fan ซื้อขายราว ${p("Korean Fan")} และดรอปยากมาก (อ้างอิง OSMLib ราว 1 ใน 10,000 จาก Lorang) ทั้งบิลด์ผูกกับอาวุธชิ้นเดียว</li>
      <li><b>ตัวบางตอนเก็บเลเวลจริง</b> ใส่ชุดโจรตามเลเวลไม่ได้ ต้องใช้ของเลเวลต่ำที่ไม่ต้องใช้ DEX ไปเรื่อย ๆ จึงโดนตีเจ็บและเปลืองยา</li>
      <li><b>ตีพลาดบ่อยกว่าและขอบล่างต่ำกว่า</b> ไม่มี DEX ช่วย ACC และไม่มี DEX ดันขอบล่างของดาเมจ</li>
    </ul>
    <p>บิลด์ DEX/LUK ตามไกด์นี้ใส่ Korean Fan ได้เหมือนกัน ถ้าดรอปหรือได้มาราคาดีก็ใช้ได้ทันทีโดยไม่ต้องเปลี่ยนสเตตัส แค่ไม่ควรเปลี่ยนทั้งบิลด์เพื่อมัน</p>
  </div></details>
  <details class="card band bmore" id="b-budget"><summary>เส้นทางมีดแบบประหยัด (ความเห็นเจ้าของไกด์)</summary><div>
    <p>ถ้าไม่อยากจ่ายแพงกับมีด Lv.40 ให้ใช้ <b>Reef Claw (Lv.30) หรือ Halfmoon Zamadar (Lv.35) ต่อยาว แล้วข้ามไปมีดเลเวล 45–50 เลย</b> โดยคงบิลด์ DEX/LUK เหมือนเดิม จะประหยัดเงินได้มาก ดาเมจขึ้นกับ ATK อาวุธโดยตรง จึงเทียบได้ง่าย</p>
    <div class="btbl"><table><thead><tr><th>มีด</th><th>ATK</th><th>ดาเมจเทียบ Gephart</th><th>ราคาตลาด</th></tr></thead><tbody>
      <tr><td>Reef Claw (Lv.30)</td><td class="num">48</td><td class="num">83%</td><td class="bprice">${p("Reef Claw")}</td></tr>
      <tr><td>Halfmoon Zamadar (Lv.35)</td><td class="num">53</td><td class="num">91%</td><td class="bprice">${p("Halfmoon Zamadar")}</td></tr>
      <tr><td>Gephart (Lv.40)</td><td class="num">58</td><td class="num">100%</td><td class="bprice">${p("Gephart")}</td></tr>
      <tr><td>Korean Fan (Lv.40)</td><td class="num">55</td><td class="num">95% แต่ตีเร็วกว่า 1 ขั้น</td><td class="bprice">${p("Korean Fan")}</td></tr>
    </tbody></table></div>
    <p class="onote">ตัวเลขเป็นมีดที่ยังไม่ตีม้วน ถ้าตีม้วน ATK แล้วต้องเทียบใหม่</p>
    <p><b>ข้อควรรู้ก่อนเลือกทางนี้:</b> ตอนนี้มีดเลเวล 45–50 สาย DEX ยังหายาก Shinkita (Lv.50) ไม่มีสูตรคราฟต์และยังไม่มีคนประกาศขายในตลาด MeowDB มีแค่ข้อมูลดรอปอ้างอิงจาก MSEA ส่วน Bazlud (Lv.45) และ Sai (Lv.50) เป็นมีด STR ต้องมี STR 40 / 45 ถ้าคงบิลด์ DEX/LUK จะใส่ไม่ได้ ดังนั้นให้เตรียมใช้ Halfmoon Zamadar ไปจนถึงเลเวล 50 หรือจนกว่าจะหา Shinkita ได้ ถ้าจะซื้อมีด Lv.40 จริง Gephart คุ้มกว่า Korean Fan มาก</p>
  </div></details>`;
}
'''


def bandit_patch(t):
    # --- owner's skill block: Dagger Mastery first, then Savage Blow (user request 2026-10-19)
    t = rep(t, "[35,41,'Savage Blow',3], [42,46,'Dagger Mastery',3], [47,49,'Savage Blow',3],",
            "[33,37,'Dagger Mastery',3], [38,44,'Savage Blow',3], [45,45,'Haste',3], [46,46,'Haste',1], [46,46,'Steal',1], [46,46,'Nimble Recovery',1], [47,49,'Savage Blow',3],")
    t = rep(t, "  [33,33,'Haste',3], [34,34,'Haste',1], [34,34,'Steal',1], [34,34,'Nimble Recovery',1],\n", '')
    t = rep(t, 'Pure Dagger · ลำดับเปิดเครื่องมือก่อนเร่ง Savage Blow', 'Pure Dagger · เต็ม Dagger Mastery ก่อน แล้วค่อยเร่ง Savage Blow')
    t = rep(t, '  <li>Lv.33: Haste 4 → Lv.34: Haste 5 / Steal 1 / Recovery 1 รวม 13 SP ขั้นสอง</li>\n  <li>Lv.35–41: Savage Blow +3 ต่อเลเวล จนถึง 21 ที่ Lv.41 ได้ครบ 6 ฮิต</li>\n  <li>Lv.42–46: Mastery +3 ต่อเลเวล จนเต็ม 20 → Lv.47–49: Savage Blow จนเต็ม 30</li>',
            '  <li>Lv.33–37: Mastery +3 ต่อเลเวล จนเต็ม 20 ที่ Lv.37 ระหว่างนี้ใช้ Double Stab 20 เป็นท่าหลัก</li>\n  <li>Lv.38–44: Savage Blow +3 ต่อเลเวล จนถึง 21 ที่ Lv.44 ได้ครบ 6 ฮิต</li>\n  <li>Lv.45: Haste 4 → Lv.46: Haste 5 / Steal 1 / Recovery 1 → Lv.47–49: Savage Blow จนเต็ม 30</li>')
    t = rep(t, '<p>อยากได้ดาเมจสม่ำเสมอก่อน สามารถเต็ม Mastery เร็วขึ้น หรือเพิ่ม Haste ก่อนเพื่อเดินไวขึ้น แต่ Savage Blow 6 ฮิตจะช้ากว่า Lv.41 เป็นทางเลือก ไม่ใช่ลำดับที่ถูกต้องเพียงแบบเดียว</p>',
            '<p>ถ้าอยากได้ Savage Blow 6 ฮิตเร็วขึ้น สลับไปลง Savage Blow ก่อนได้ (Mastery 5 ที่ Lv.32 → Savage Blow 21 ที่ Lv.41 → Mastery เต็ม Lv.42–46) แต่ระหว่างนั้นดาเมจขอบล่างจะต่ำกว่ามาก ดูเหตุผลในหัวข้อ “ทำไมต้องเต็ม Dagger Mastery ก่อน” ด้านบน ส่วน Haste / Steal / Recovery ย้ายไปลงหลัง Savage Blow ได้ 6 ฮิตเพื่อไม่ให้ช้า</p>')
    t = rep(t, "  {n:'Dagger Mastery',d:'เปิด Booster แล้วกลับมาเต็ม',seg:[[30,32,5],[42,46,20]]},",
            "  {n:'Dagger Mastery',d:'เต็มก่อน · ยกดาเมจขอบล่าง',seg:[[30,32,5],[33,37,20]]},")
    t = rep(t, "  {n:'Haste',d:'ปลด Steal แล้วเต็ม Lv.54',seg:[[32,34,5],[50,50,8]]},",
            "  {n:'Haste',d:'ปลด Steal แล้วเต็ม Lv.54',seg:[[32,32,1],[45,46,5],[50,50,8]]},")
    t = rep(t, "  {n:'Steal',d:'บัฟเมื่อขโมยสำเร็จ',seg:[[34,34,1]]},", "  {n:'Steal',d:'บัฟเมื่อขโมยสำเร็จ',seg:[[46,46,1]]},")
    t = rep(t, "  {n:'Nimble Recovery',d:'ต้องหลบสำเร็จ',seg:[[34,34,1]]},", "  {n:'Nimble Recovery',d:'ต้องหลบสำเร็จ',seg:[[46,46,1]]},")
    t = rep(t, "  {n:'Savage Blow',d:'6 ฮิต Lv.41 / MAX Lv.49',seg:[[35,41,21],[47,49,30]]},",
            "  {n:'Savage Blow',d:'6 ฮิต Lv.44 / MAX Lv.49',seg:[[38,44,21],[47,49,30]]},")
    old_sp = t[t.index("  38:'Lv.33 ลง Haste"):t.index("};\nfor (const [i,sp] of Object.entries(banditRouteSP))")]
    t = rep(t, old_sp,
            "  38:'Lv.33–35 ลง Mastery +3 ต่อเลเวลเป็น 8 / 11 / 14 ยังใช้ Double Stab 20 เป็นท่าหลัก',\n"
            "  39:'Lv.36 Mastery 17 และ Lv.37 Mastery เต็ม 20 ดาเมจขอบล่างของ Double Stab สูงขึ้นมาก (เหตุผลอยู่ในแท็บ Builds)',\n"
            "  40:'Lv.38–44 ลง Savage Blow +3 ต่อเลเวลเป็น 3 / 6 / 9 / 12 / 15 / 18 / 21 ได้ 6 ฮิตที่ Lv.44 ระหว่างนั้นใช้ Double Stab เป็นหลัก และใช้ต่อได้ถ้าฆ่ามอนครั้งเดียวเพื่อประหยัด MP',\n"
            "  41:'Lv.45 ลง Haste +3 รวม 4; Lv.46 ลง Haste 5 / Steal 1 / Nimble Recovery 1',\n"
            "  42:'Lv.47–49 ลง Savage Blow เป็น 24 / 27 / 30; Lv.50 ลง Haste ถึง 8 เลือกแผน A/B/C ใน Builds สำหรับ Lv.51–70',\n")
    # --- Builds template hooks
    t = rep(t, '    <p class="onote">${B.apNote}</p>\n', '    <p class="onote">${B.apNote}</p>\n    ${typeof banditApMore === "function" ? banditApMore() : ""}\n')
    t = rep(t, '    ${banditSkillOptionsHTML()}\n', '    ${B.spWhy || ""}\n    ${banditSkillOptionsHTML()}\n')
    t = rep(t, '<td>${st}<div class="bnote">${esc(it.note)}</div></td></tr>`;', '<td>${st}<div class="bnote">${esc(it.note)}</div>${bHow(it)}</td></tr>`;')
    t = rep(t, '<div class="bnote">${esc(it.note)}</div></td>\n    <td>${bReqText(it, L)}</td>', '<div class="bnote">${esc(it.note)}</div>${bHow(it)}</td>\n    <td>${bReqText(it, L)}</td>')
    t = rep(t, '          <div class="gr-note">${esc(ai.note)}</div>\n          <div class="gr-price">${bPrice(a)}</div>',
            '          <div class="gr-note">${esc(ai.note)}</div>${bHow(ai)}\n          <div class="gr-price">${bPrice(a)}</div>')
    t = rep(t, 'const t = $(j.dataset.jump); if (t) t.scrollIntoView({behavior:"smooth", block:"start"}); return; }',
            'const t = $(j.dataset.jump); if (t) { if (t.tagName === "DETAILS") t.open = true; t.scrollIntoView({behavior:"smooth", block:"start"}); } return; }')
    t = rep(t, 'ง่ายขึ้นมากเมื่อ Savage Blow แรงพอใช้เป็นท่าหลักตอนเลเวล 43', 'ง่ายขึ้นมากเมื่อ Dagger Mastery เต็มตอนเลเวล 37 และ Savage Blow ได้ 6 ฮิตตอนเลเวล 44')
    # Shinkita has no source yet: show it as an option, not the main Lv.50 weapon
    t = rep(t, '[40, "Korean Fan", 1], [50, "Shinkita"]]', '[40, "Korean Fan", 1], [50, "Shinkita", 1]]')
    # --- new JS block right after the owner's block (before the Builds tab code)
    t = rep(t, '\n/* ---------- แท็บ Builds ---------- */', BANDIT_JS.rstrip('\n') + '\n\n/* ---------- แท็บ Builds ---------- */')

    # --- BUILD data
    def build(o):
        it = o['items']
        thief_common(o, assassin_items(('Blue Sauna Robe', 'Red Sauna Robe', 'Squishy Shoes')))
        strn = {'Triple-Tipped Zamadar': 11, 'Stinger': 17, 'Cass': 25, 'Bazlud': 40, 'Sai': 45}
        for n, s in strn.items():
            it[n]['howto'] = 'b-str'
            it[n]['note'] = f'มีด STR ต้องมี STR {s} แผน AP ของไกด์นี้ไม่ลง STR ถ้าจะใช้ต้องเปลี่ยนแผนลงสเตตัสตั้งแต่ต้น ไม่อย่างนั้นให้ขาย'
        it['Korean Fan']['howto'] = 'b-dexless'
        it['Korean Fan']['note'] = 'ต้องการแค่ LUK 70 บิลด์นี้ใส่ได้ ATK น้อยกว่า Gephart 3 แต่ตีเร็วกว่า 1 ขั้น ราคาสูงมาก ถ้าไม่อยากจ่ายดูเส้นทางมีดแบบประหยัดในแท็บนี้'
        it['Shinkita']['src'] = 'ยังไม่มีแหล่งได้ใน Classic ไม่มีสูตรคราฟต์ และยังไม่มีคนประกาศขาย (MeowDB มีแค่ดรอปอ้างอิงจาก MSEA)'
        it['Gephart']['note'] = 'มีด Lv.40 ที่แรงที่สุดที่บิลด์นี้ใส่ได้ ไม่มีขายในร้าน ถ้าไม่อยากจ่าย ใช้ Halfmoon Zamadar ต่อได้ (ATK น้อยกว่า 5)'
        # Orbis / El Nath shops are not open at launch (MeowDB "Not open in this release")
        for n in ('Reef Claw', 'Cass', 'Halfmoon Zamadar', 'Blue Knucklevest Pants'):
            it[n]['shop'] = None
            it[n]['nshop'] = 0
            it[n]['k'] = [k for k in it[n]['k'] if k != 'buy'] or ['drop']
        it['Reef Claw']['src'] = 'มีโอกาสดรอปจาก Ligator หรือซื้อจากผู้เล่น ไม่มีขายจาก NPC (ร้านใน Orbis และ El Nath ยังไม่เปิด)'
        it['Reef Claw']['note'] = 'ใส่ตอนเลเวล 30 ใช้ได้ยาวถึงเลเวล 39 หรือยาวกว่านั้นถ้าเลือกเส้นทางมีดแบบประหยัด'
        it['Cass']['src'] = 'ซื้อจากผู้เล่น (ร้านใน Orbis ยังไม่เปิด)'
        it['Halfmoon Zamadar']['src'] = 'คราฟต์ด้วย Weaponcrafting Lv.7 หรือซื้อจากผู้เล่น (ร้านใน El Nath ยังไม่เปิด)'
        it['Halfmoon Zamadar']['note'] = 'ใช้ยาวถึงเลเวล 50 ได้ถ้าไม่ซื้อมีด Lv.40 ถ้าไม่คราฟต์ ใช้ Reef Claw ต่อได้'
        it['Blue Knucklevest Pants']['note'] = 'ให้ DEX แทน LUK ได้จากการดรอปเท่านั้น'
        br = {tuple(b['lv']): b for b in o['br']}
        br[(40, 44)]['tip'] = 'ถ้าไม่ได้คราฟต์ Gephart ใช้ Halfmoon Zamadar หรือ Reef Claw ต่อได้ (ดูเส้นทางมีดแบบประหยัดด้านบน) Korean Fan ใส่ได้แต่ราคาสูงมาก'
        br[(40, 44)]['s']['weapon'] = {'i': 'Gephart', 'alt': ['Halfmoon Zamadar', 'Korean Fan'], 'opt': False, 'note': None}
        br[(45, 50)]['s']['weapon'] = {'i': 'Gephart', 'alt': ['Halfmoon Zamadar', 'Korean Fan'], 'opt': False, 'note': None}
    t = J(t, 'BUILD', build)
    t = thief_john(t, 'bandit')
    return t


# ---------------------------------------------------------------- Assassin
def assassin_patch(t):
    def build(o):
        thief_common(o, {})
        it = o['items']
        it['Dark Slain']['k'] = ['none']
        it['Dark Slain']['src'] = 'ยังคราฟต์ไม่ได้ สูตรต้อง Weaponcrafting Lv.10 แต่ตอนนี้คราฟต์ได้ถึง Lv.8 และยังไม่มีแหล่งดรอปใน Classic'
        it['Dark Slain']['note'] = 'ATK 34 ใส่ได้ตอนเลเวล 50 เมื่อมีวิธีหา'
        it['Steel Slain']['k'] = ['none']
        it['Steel Slain']['src'] = 'ยังคราฟต์ไม่ได้ (ต้อง Weaponcrafting Lv.10)'
        it['Steel Avarice']['src'] = 'คราฟต์ด้วย Weaponcrafting (ไม่เกิน Lv.8 ทำได้ตอนนี้)'
        it['Steel Avarice']['note'] = 'claw Lv.40 ATK 28 มากกว่า Dark Guardian 2 เป็น claw ที่ดีที่สุดที่คราฟต์ได้ตอนนี้ ต้องมี DEX 40 ซึ่งแผน AP นี้มีพอดีที่เลเวล 40'
        o['apRows'] = [r for r in o['apRows'] if r[1] != 'Dark Slain'] + [[40, 'Steel Avarice', 1], [50, 'Dark Slain', 1]]
        o['apRows'].sort(key=lambda r: r[0])
        br = {tuple(b['lv']): b for b in o['br']}
        br[(40, 44)]['tip'] = 'claw Lv.50 (Slain) ยังคราฟต์ไม่ได้ จึงใช้ Dark Guardian ต่อ หรือคราฟต์ Steel Avarice (ATK 28) ถ้ามีวัตถุดิบ ตีม้วน ATK ให้ claw ที่ใช้อยู่คุ้มกว่ารอ Slain'
        br[(40, 44)]['s']['weapon']['alt'] = ['Steel Avarice']
        br[(45, 50)]['s']['weapon']['alt'] = ['Steel Avarice']
        br[(45, 50)]['tip'] = 'Dark Slain ยังคราฟต์ไม่ได้ (ต้อง Weaponcrafting Lv.10) ใช้ Dark Guardian หรือ Steel Avarice ต่อถึงเลเวล 50 และถ้าได้ Black Napoleon (LUK +3) ให้ใส่แทน Icarus Cape'
    t = J(t, 'BUILD', build)

    def S(o):
        o[8]['act'][2]['tip'] = ssub(o[8]['act'][2]['tip'], '(Dark Guardian Lv.35 และ Dark Slain Lv.50)', '(Dark Guardian Lv.35 และ Steel Avarice Lv.40 ส่วน Slain Lv.50 ยังคราฟต์ไม่ได้)')
        o[42]['act'][3] = {"t": "gear", "x": "claw เลเวล 50 (Steel / Blood / Dark Slain) <b>ยังคราฟต์ไม่ได้</b> เพราะสูตรต้อง Weaponcrafting Lv.10 แต่ตอนนี้คราฟต์ได้ถึง Lv.8 ให้ใช้ Dark Guardian หรือ Steel Avarice ต่อ",
                           "tip": "ถ้าเซิร์ฟเปิดเลเวลคราฟต์เพิ่มหรือมีคนขายใน Free Market ค่อยเปลี่ยนเป็น Slain (ATK 34)"}
    t = J(t, 'S', S)

    def O(o):
        o['gear'][3][2][0][1] = 'Dark Guardian ใช้ต่อ หรือ Steel Avarice (Lv.40, ATK 28)'
        o['gear'][3][2][0][2] = ssub(o['gear'][3][2][0][2], 'คราฟต์ Weaponcrafting Lv.10 / Free Market', 'Weaponcrafting (Slain Lv.50 ยังคราฟต์ไม่ได้)')
        o['craftBasics'][1] = 'claw ที่ร้านไม่มีขาย และคราฟต์ได้: <b>Dark Guardian</b> (Lv.35, Weaponcrafting Lv.7) และ <b>Steel Avarice</b> (Lv.40) ส่วน Slain (Lv.50) ต้อง Weaponcrafting Lv.10 ซึ่งยังเปิดไม่ถึง claw ต้องใช้ <b>Leatherworking</b> ทำ Processed Leather ด้วย'
        for r in o['weapons']:
            if r[1] == 'Dark Slain':
                r[3] = '<b>ยังคราฟต์ไม่ได้</b> สูตรต้อง Weaponcrafting Lv.10 แต่ตอนนี้คราฟต์ได้ถึง Lv.8'
                r[5] = 'none'
        o['craftPlan'][3] = ["Lv.50", "Slain ยังคราฟต์ไม่ได้", ["Steel Slain และ Dark Slain ต้องใช้ Weaponcrafting Lv.10 แต่ตอนนี้คราฟต์ได้สูงสุด Lv.8", "ระหว่างนี้ใช้ Dark Guardian หรือ Steel Avarice และตีม้วน ATK ให้ claw ที่ใช้อยู่"]]
    t = J(t, 'OPTDATA', O)
    t = rep(t, '"คราฟต์ Dark Guardian (Lv.35) และ Dark Slain (Lv.50)"', '"คราฟต์ Dark Guardian (Lv.35) และ Steel Avarice (Lv.40) ส่วน Slain (Lv.50) ยังคราฟต์ไม่ได้"')
    t = rep(t, 'ทำ Black Crystal (ใช้ทำ Dark Guardian และ Dark Slain)', 'ทำ Black Crystal (ใช้ทำ Dark Guardian)')
    t = thief_john(t, 'assassin')
    return t


# ---------------------------------------------------------------- Mage
CROMI_SRC = 'ยังคราฟต์ไม่ได้ สูตรต้อง Arc Forge Lv.10 แต่ตอนนี้คราฟต์ได้ถึง Lv.8 และยังไม่มีแหล่งดรอปใน Classic (MeowDB มีแค่ดรอปอ้างอิงจาก MSEA)'


def mage_patch(t):
    def build(o):
        it = o['items']
        it['Cromi']['k'] = ['none']
        it['Cromi']['src'] = CROMI_SRC
        it['Cromi']['note'] = 'M.ATK 83 ใส่ได้ตอนเลเวล 50 เมื่อมีวิธีหา ระหว่างนี้ใช้ Fairy Wand ต่อ'
        it['Dark Arten']['k'] = ['craft']
        it['Dark Arten']['src'] = 'คราฟต์ด้วย Tailoring หรือซื้อจากผู้เล่น · เควส John\'s Present ใน Classic ต้องเลเวล 65'
        it['Dark Arten']['note'] = 'INT +2 LUK +2 ถ้าหาคนคราฟต์ไม่ได้ใช้ถุงมือเดิมต่อ'
        it['Pansy Earrings']['k'] = ['none']
        it['Pansy Earrings']['src'] = 'ยังไม่มีแหล่งได้ใน Classic (เควส John\'s Last Present ใน Classic ต้องเลเวล 65)'
        it['Pansy Earrings']['note'] = 'หาไม่ได้ในตอนนี้'
        it['Blue Bamboo Hat']['k'] = ['drop']
        it['Blue Bamboo Hat']['src'] = 'ผู้เล่นรายงานบน MeowDB ว่าได้จาก Magic Box ยังไม่ยืนยันว่าเป็นรางวัล Kerning PQ ใน Classic'
        it['Blue Bamboo Hat']['note'] = 'INT +2 ถ้าหาไม่ได้ใช้หมวก Lv.15 หรือ White Bandana ต่อ'
        o['apRows'] = [r if r[1] != 'Cromi' else [r[0], 'Cromi', 1] for r in o['apRows']]
        br = {tuple(b['lv']): b for b in o['br']}
        for lv in [(25, 29), (30, 34), (35, 39), (40, 44), (45, 50)]:
            br[lv]['s']['hat']['opt'] = True
        br[(25, 29)]['head'] = ssub(br[(25, 29)]['head'], 'หมวกดีที่สุดได้จาก Kerning PQ', 'หมวก INT หาได้ยาก')
        br[(25, 29)]['tip'] = ssub(br[(25, 29)]['tip'], 'ถ้าไม่เล่น Kerning PQ ให้ใช้หมวก Lv.15 ต่อ', 'Blue Bamboo Hat ยังไม่ยืนยันแหล่งใน Classic ถ้าหาไม่ได้ให้ใช้หมวก Lv.15 ต่อ')
        b = br[(45, 50)]
        b['head'] = 'ผ้าคลุม Icarus ฟรีจากเควส และใช้ Fairy Wand ต่อถึงเลเวล 50'
        b['tip'] = 'Cromi ยังคราฟต์ไม่ได้ (ต้อง Arc Forge Lv.10) จึงใช้ Fairy Wand ต่อ ถ้าได้ Black Napoleon (LUK +3) ให้ใส่แทน Icarus Cape'
        b['s']['gloves'] = {'i': 'Lemona', 'alt': ['Dark Arten', 'Blue Arten'], 'opt': False, 'note': 'Dark Arten / Blue Arten ต้องคราฟต์ด้วย Tailoring หรือซื้อจากผู้เล่น'}
        b['s']['ear'] = {'i': 'Weighted Earrings', 'alt': ['Red Cross Earrings'], 'opt': False, 'note': None}
        o['text']['gearNotes'][3] = '<b>เก็บ Fairy Wing</b> จากเควส Arwen ไว้ เพราะเป็นวัตถุดิบของ Fairy Wand ส่วน Piece of Ice ใช้กับ Cromi ซึ่งยังคราฟต์ไม่ได้ตอนนี้'
    t = J(t, 'BUILD', build)

    def S(o):
        a = o[8]['act'][2]
        a['x'] = 'ถ้าจะคราฟต์ของเอง (เช่น Screw สำหรับ Fairy Wand) ให้คุยกับ <b>Mr. Thunder</b> ที่อยู่ข้าง Silas เพื่อเรียน Weaponcrafting โดยรับเควสได้หลังส่งเควสของ Silas แล้ว และต้องส่ง Bronze Ingot ×1 กับ Iron Ingot ×1'
        a['tip'] = 'Cromi (Lv.50) ยังคราฟต์ไม่ได้ตอนนี้ เพราะสูตรต้อง Arc Forge Lv.10 แต่เลเวลคราฟต์เปิดถึง Lv.8 ถ้าไม่คราฟต์อะไรเอง ข้ามส่วนนี้ได้'
        o[8]['miss'] = 'ถ้าไม่เปิด Smithing จะเรียน Weaponcrafting กับ Mr. Thunder ไม่ได้ และทำ Screw เองไม่ได้ ทางเลือกคือซื้อ Screw หรืออาวุธสำเร็จจากตลาด'
        o[26]['act'][2]['sub'][0] = '<b>Blue Bamboo Hat</b> (INT+2) ยังไม่ยืนยันว่าเป็นรางวัล KPQ ใน Classic'
        o[27]['intro'] = ssub(o[27]['intro'], 'ซึ่งช่วยให้ใส่ Cromi ได้ตอนเลเวล 50 ก็มาจากสายนี้', 'ก็มาจากสายนี้')
        o[27]['miss'] = ssub(o[27]['miss'], 'และ Cromi ใน <button type=\'button\' class=\'stepchip\' data-go=\'45\'>ขั้น 46</button> (Arc Forge Lv.10) ', '')
        o[28]['opt'][1]['x'] = ssub(o[28]['opt'][1]['x'], 'เก็บไว้หลอม Mithril Ingot ×10 สำหรับ Cromi', 'เก็บไว้หลอม Mithril Ingot หรือขาย')
        o[30]['act'][2]['tip'] = ssub(o[30]['act'][2]['tip'], 'หมวกใช้ Blue Bamboo Hat จาก KPQ ดีที่สุด ถ้าไม่มีให้ใช้ White Bandana ต่อ', 'หมวกใช้ Blue Bamboo Hat ถ้าหาได้ (ยังไม่ยืนยันว่าได้จาก KPQ) ถ้าไม่มีให้ใช้ White Bandana ต่อ')
        o[39]['act'][0]['sub'][2] = 'Fairy Wing ใช้คราฟต์ <b>Fairy Wand</b> (Lv.40) ส่วน Piece of Ice ใช้กับ <b>Cromi</b> ซึ่งยังคราฟต์ไม่ได้ เก็บไว้ก่อนได้'
        o[39]['miss'] = 'Fairy Wing ได้จากเควสของ Arwen ที่เดียว และใช้คราฟต์ Fairy Wand ใน <button type=\'button\' class=\'stepchip\' data-go=\'42\'>ขั้น 43</button> ถ้าไม่ทำเควสนี้ ต้องซื้อ Fairy Wing หรือ Fairy Wand จากผู้เล่น'
        o[42]['next'] = 'Icarus Cape'
        s = o[43]
        s['title'] = 'Deep Forest of Patience — ข้ามได้ (ต้องเลเวล 65 ใน Classic)'
        s['intro'] = 'ไกด์เวอร์ชันก่อนแนะนำ jump quest ของ <b>John</b> ตอนเลเวล 45 แต่ใน Classic เควส John\'s Pink Flower Basket / John\'s Present / John\'s Last Present <b>ต้องเลเวล 65</b> และรางวัลไม่ใช่ Dark Arten หรือ Pansy Earrings (ของเมจคือถุงมือ Dark Manute Lv.60) จึงข้ามขั้นนี้ได้เลย'
        s['act'] = [{"t": "note", "x": "ข้ามขั้นนี้แล้วไปทำ Icarus Cape ต่อ ถุงมือ INT ช่วงนี้ใช้ Lemona ต่อ หรือคราฟต์ / ซื้อ Dark Arten หรือ Blue Arten (Tailoring)"}]
        s['keep'] = '—'
        s['leave'] = 'ไปขั้นถัดไปได้ทันที'
        s['sp'] = '—'
        o[42]['opt'][1]['x'] = ssub(o[42]['opt'][1]['x'], 'ช่วยเติม LUK ให้ใส่ Cromi ได้', 'ช่วยเติม LUK')
        o[45]['title'] = 'ตีมอนให้ถึง Lv.50'
        o[45]['act'][3] = {"t": "note", "x": "<b>Cromi</b> (M.ATK 83) ยังคราฟต์ไม่ได้ เพราะสูตรต้อง Arc Forge Lv.10 แต่ตอนนี้คราฟต์ได้ถึง Lv.8 และยังไม่มีแหล่งดรอปใน Classic ให้ใช้ Fairy Wand ต่อ",
                           "tip": "ถ้ามีคนขาย Cromi ใน Free Market ค่อยซื้อ ต้องมี INT 100 และ LUK 40 ซึ่งแผน AP นี้มีพอดีที่เลเวล 50"}
        o[45]['keep'] = 'Piece of Ice (เผื่อ Cromi คราฟต์ได้ในอนาคต)'
    t = J(t, 'S', S)

    def KEEP(o):
        o[:] = [r for r in o if 'Viola' not in r[0]]
        for r in o:
            if len(r) > 5 and r[5] == 'คราฟต์ Cromi (Lv.50)':
                r[5] = 'เผื่อ Cromi (ยังคราฟต์ไม่ได้)'
    t = J(t, 'KEEP', KEEP)

    def O(o):
        for r in o['gear'][1][2]:
            if r[1] == 'Blue Bamboo Hat (INT+2)':
                r[2] = 'ยังไม่ยืนยันแหล่งใน Classic (MeowDB: Magic Box) · ทางเลือก Brown Bamboo Hat (เควส Maya) หรือ White Bandana ต่อ'
        rows = o['gear'][3][2]
        rows[0][1] = 'Fairy Wand ใช้ต่อ (Cromi ยังคราฟต์ไม่ได้)'
        rows[1] = [rows[1][0], 'Dark Arten (INT+2, LUK+2) · Blue Arten', 'คราฟต์ Tailoring หรือซื้อจากผู้เล่น (เควส John ใน Classic ต้องเลเวล 65)']
        rows[2] = [rows[2][0], 'Weighted Earrings ใช้ต่อ', 'Pansy Earrings ยังไม่มีแหล่งใน Classic']
        o['gear'][3][1] = 'ของเควสและดรอปที่ยืนยันแล้ว'
        rows[0][2] = 'Cromi ต้อง Arc Forge Lv.10 ซึ่งยังเปิดไม่ถึง'
        for r in o['weapons']:
            if 'Cromi' in r[1]:
                r[3] = '<b>ยังคราฟต์ไม่ได้</b> สูตรต้อง Arc Forge Lv.10 แต่ตอนนี้คราฟต์ได้ถึง Lv.8 · ยังไม่มีแหล่งดรอปใน Classic'
                r[5] = 'none'
        for r in o['mats']:
            if r[0] == 'Cromi':
                r[1] = 'Arc Forge Lv.10 (ยังเปิดไม่ถึง)'
        o['weaponBudget'] = ssub(o['weaponBudget'], 'ให้ได้ Fairy Wing + Piece of Ice', 'ให้ได้ Fairy Wing (Cromi Lv.50 ยังคราฟต์ไม่ได้)')
        o['craftBasics'][0] = 'สายหลักของเมจคือ <b>Tailoring</b> (ถุงมือ / รองเท้า / ผ้าคลุม / Lemona) และ <b>Arc Forge</b> (Fairy Wand, ม้วน LUK ต่างหู/ผ้าคลุม) ส่วน Cromi ต้อง Arc Forge Lv.10 ซึ่งยังเปิดไม่ถึง'
        o['craftBasics'][3] = '<b>Fairy Wand ใช้ Screw</b> (ทำจาก Weaponcrafting) ถ้าจะคราฟต์เองให้เปิด Weaponcrafting กับ Mr. Thunder ตอนแวะ Perion หรือซื้อ Screw จากผู้เล่น'
        o['craftNpc'][5][4] = 'ถ้าจะทำ Screw เอง'
        o['craftPlan'][3][2][0] = 'Cromi ยังคราฟต์ไม่ได้: สูตรต้อง Arc Forge Lv.10 แต่ตอนนี้คราฟต์ได้สูงสุด Lv.8'
        o['craftPlan'][3][2][1] = 'Lv.10 (ตัวละคร 50): ม้วน LUK ผ้าคลุม ต้อง Arc Forge Lv.10 เช่นกัน ใช้ Black Napoleon (LUK +3) ช่วยแทน'
    t = J(t, 'OPTDATA', O)

    def G(o):
        m = o['must']
        m[0][1] = '<b>Kerning PQ</b> ได้ EXP ดีและมีโอกาสได้ Squishy Shoes จาก King Slime'
        m[3][1] = 'เควสของ Arwen ได้ <b>Fairy Wing</b> วัตถุดิบของ Fairy Wand ใช้ Arwen\'s Glass Shoe ที่ดรอปจาก Fire Boar'
        o['must'] = [x for x in m if 'John' not in x[1]]
    t = J(t, 'GRIND', G)
    return t


if __name__ == '__main__':
    pass
