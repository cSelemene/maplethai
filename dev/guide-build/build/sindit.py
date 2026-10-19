"""Build the Sindit guide (site/sindit.html): claw + Lucky Seven first, Bandit at 30, dagger + Savage Blow at Lv.44-45.

Base: the website Assassin guide (claw, stars, Lucky Seven route texts) after site_merge/site_patch.
Dagger items, icons and explainers come from the website Bandit guide. Run after site_merge.py.
Owner's framing (customer chat 2026-10-19): stars save a lot of potions; if you dodge well, dagger from the start
is cheaper; switching costs little when the claw is resold (~1,000 meso if not), potions saved maybe 2,000-3,000+.
Owner's decision: switch at Lv.44-45 as the main plan, but the player chooses.
"""
import json, re, base64, os, sys
sys.path.insert(0, '/home/claude/build')
from site_patch import rep, J, ssub

SITE = '/home/claude/site/'
ART = '/tmp/claude-0/-home-claude/eb92408c-1c0c-508b-8f96-18ac41698fec/scratchpad/artifact-files/'
BANDIT_I = ART + 'dafc0106-5b8c-46f7-a32b-5749939c5604/'
MIME = {'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp', 'jpg': 'image/jpeg'}


def inline_bandit(p):
    """Bandit icons use the Bandit artifact's own i/ numbering, so embed them before moving them into this guide."""
    if not p.startswith('i/'):
        return p
    f = BANDIT_I + p
    return 'data:%s;base64,%s' % (MIME[p.rsplit('.', 1)[1]], base64.b64encode(open(f, 'rb').read()).decode())


def get(t, var):
    for l in t.split('\n'):
        if l.startswith(f'const {var} = '):
            return json.loads(l[len(f'const {var} = '):].rstrip(';'))
    raise SystemExit(var)


A = open(SITE + 'assassin.html').read()
BT = open(SITE + 'bandit.html').read()
BB = get(BT, 'BUILD')
B_ICON = get(BT, 'ICON')
B_URL = get(BT, 'ITEM_URL')
DAGGERS = ['Reef Claw', 'Halfmoon Zamadar', 'Gephart', 'Korean Fan', 'Shinkita', 'Pan Lid']

t = A

# ------------------------------------------------------------------ page head
t = rep(t, '<meta name="description" content="ไกด์ Assassin (โจรดาว) Lv.1–50 MapleStory Classic World">',
        '<meta name="description" content="ไกด์ Sindit (โจรปาดาวแล้วเปลี่ยนเป็นมีด) Lv.1–50 MapleStory Classic World">')
t = rep(t, '<title>Assassin Route Lv.1–50 — MapleStory Classic</title>', '<title>Sindit Route Lv.1–50 — MapleStory Classic</title>')
t = rep(t, 'const KEY = "assassin-route-v1";', 'const KEY = "sindit-route-v1";')
h1 = [l for l in t.split('\n') if l.startswith('    <h1>')]
assert len(h1) == 1 and 'Assassin' in h1[0], h1
t = t.replace(h1[0], h1[0].replace('Assassin Route', 'Sindit Route').replace('Assassin', 'Sindit'))

# ------------------------------------------------------------------ intro tab
I = [
 ('["DEX","สเตตัสรองของโจร ใช้ปลดล็อกการใส่ claw และเพิ่มความแม่น ลงแค่ให้พอใส่ claw"]',
  '["DEX","สเตตัสรองของโจร ใช้ปลดล็อกการใส่ claw และมีด และเพิ่มความแม่น ลงแค่ให้พอใส่ของ"]'),
 ('["W.ATK","พลังโจมตีของอาวุธ สำหรับโจรดาวจะนับรวมทั้งพลังของ claw และพลังของดาว"]',
  '["W.ATK","พลังโจมตีของอาวุธ ตอนปาดาวนับรวมพลังของ claw และดาว ตอนใช้มีดนับพลังของมีด"]'),
 ('["Job Advancement","การเปลี่ยนอาชีพ เลเวล 10 เป็น Thief และเลเวล 30 เป็น Assassin"]',
  '["Job Advancement","การเปลี่ยนอาชีพ เลเวล 10 เป็น Thief และเลเวล 30 เป็น Bandit (ยังปาดาวต่อได้)"],\n    ["SP ที่เก็บไว้","แต้มสกิลที่ยังไม่ลง เก็บสะสมได้ ไกด์นี้เก็บ SP ขั้นสองไว้ลงทีเดียวตอนเปลี่ยนเป็นมีด"]'),
 ('["Crit","การตีคริติคอลที่แรงกว่าปกติ Critical Throw ของ Assassin เพิ่มทั้งโอกาสและความแรง"]',
  '["Crit","การตีคริติคอลที่แรงกว่าปกติ Dagger Mastery ของ Bandit เพิ่มโอกาสคริ 20% เมื่อใช้มีด"]'),
 ('<h2>Assassin (โจรดาว) คืออะไร</h2>', '<h2>Sindit (ปาดาวก่อน แล้วเปลี่ยนเป็นมีด) คืออะไร</h2>'),
 ('<p><b>Assassin</b> คือโจรสายปาดาวใน MapleStory Classic World ถือ claw ไว้ที่มือแล้วใช้สกิล <b>Lucky Seven</b> ปาดาวใส่มอนจากระยะไกลตั้งแต่เลเวล 10 ไปจนถึงเลเวล 50 จุดเด่นคือไม่ต้องเข้าไปใกล้มอน และเก็บเลเวลช่วงต้นเกมได้เร็ว</p>',
  '<p><b>Sindit</b> คือการเล่นโจรแบบผสม ช่วงแรกถือ claw แล้วใช้ <b>Lucky Seven</b> ปาดาวจากระยะไกลเหมือน Assassin เพราะแทบไม่โดนมอนตี <b>ประหยัดค่ายาได้มาก</b> พอเลเวล 30 เปลี่ยนอาชีพเป็น <b>Bandit</b> แต่ยังปาดาวต่อ แล้วค่อยเปลี่ยนมาใช้มีดกับ <b>Savage Blow</b> ตอนเลเวล 44–45 (หรือเร็วกว่านั้นถ้าพร้อม) ปลายทางคือ Bandit สายมีดเหมือนไกด์โจรมีด</p>\n    <p>เส้นทางคือ Beginner → Thief (ปาดาว) → Bandit (ยังปาดาว) → Bandit ใช้มีด แผนสกิลของไกด์นี้<b>ไม่ต้องซื้อม้วนรีเซ็ตสกิล</b> เพราะสกิลขั้นแรกเลือกแบบที่ใช้ได้ทั้งสองช่วง และเก็บ SP ขั้นสองไว้ลงทีเดียวตอนเปลี่ยนเป็นมีด</p>'),
 ('ไกด์นี้ใช้ลำดับเควสเดียวกับไกด์โจรสายมีด คือเก็บเลเวลด้วย<b>การทำเควสเป็นหลัก</b> แต่ปรับการลงสเตตัส สกิล อาวุธ และแมพที่ใช้ตีมอนให้เหมาะกับการโจมตีจากระยะไกล',
  'ไกด์นี้ใช้ลำดับเควสเดียวกับไกด์โจรมีดและโจรดาว คือเก็บเลเวลด้วย<b>การทำเควสเป็นหลัก</b> แต่ปรับการลงสเตตัส สกิล อาวุธ และแมพที่ใช้ตีมอนให้เหมาะกับการปาดาวช่วงแรกและการใช้มีดช่วงท้าย'),
 ('<div><h3>เล่นแบบไหน</h3><p>ยืนห่างจากมอนแล้วปาดาวใส่ พยายามให้มอนตายใน 1 ถึง 2 ครั้ง ปาโดนมอนที่บินอยู่ เช่น Stirge ได้ และกระโดดปาเพื่อถอยออกจากมอนได้</p></div>',
  '<div><h3>เล่นแบบไหน</h3><p>เลเวล 10–44 ยืนห่างจากมอนแล้วปาดาวใส่ ให้มอนตายใน 1 ถึง 2 ครั้ง พอได้มีดและ SP พร้อม ก็เปลี่ยนมาเข้าประชิดด้วย Savage Blow ที่แรงกว่า</p></div>'),
 ('<div><h3>ความยาก</h3><p>เล่นง่ายช่วงเลเวล 10 ถึง 30 เพราะปาจากระยะไกลและฆ่ามอนได้เร็ว ที่ยากคือการคุมค่าดาวและยา และต้องคอยรักษาระยะไม่ให้มอนเข้าใกล้</p></div>',
  '<div><h3>ความยาก</h3><p>ช่วงปาดาวเล่นง่ายและปลอดภัย ที่ต้องคิดคือจังหวะเปลี่ยนเป็นมีด ต้องเตรียมมีด โล่ และ SP ไว้ล่วงหน้า และหลังเปลี่ยนต้องฝึกเข้าประชิดมอน</p></div>'),
 ('<div><h3>เหมาะกับใคร</h3><p>คนที่อยากเก็บเลเวลเร็วช่วงต้นเกม ไม่ชอบยืนชิดมอน และยอมจ่ายค่าดาวเพื่อแลกกับความปลอดภัย</p></div>',
  '<div><h3>เหมาะกับใคร</h3><p>คนที่อยากเป็น Bandit แต่ยังหลบมอนไม่เก่ง อยากประหยัดค่ายาช่วงต้น หรืออยากลองปาดาวก่อนแล้วค่อยเลือกเวลาเปลี่ยนเอง</p></div>'),
 ('["i-why","สายดาวกับสายมีด"],', '["i-why","Sindit กับโจรมีดตั้งแต่ต้น"],["i-switch","เปลี่ยนเป็นมีดตอนไหน"],'),
 ('      <li class="here"><span class="jl">Lv.30</span><h3>Assassin</h3><p>เลือก<b>สายปาดาว</b> (ไม่ใช่ Bandit สายมีด) ได้ Claw Mastery, Critical Throw, Haste และ Claw Booster ไกด์นี้จบที่เลเวล 50</p></li>\n      <li class="later"><span class="jl">Lv.70</span><h3>Hermit</h3><p>อาชีพขั้นที่ 3 ซึ่งอยู่นอกขอบเขตของไกด์นี้ เป็นช่วงที่ได้สกิลตีหลายตัวพร้อมกัน</p></li>',
  '      <li><span class="jl">Lv.30</span><h3>Bandit (ยังปาดาว)</h3><p>เลือก <b>Bandit</b> แต่ยังถือ claw ปาดาวต่อ เพราะ Lucky Seven เป็นสกิลขั้นแรกที่ใช้ได้ตลอด สกิลขั้นสองเกือบทั้งหมดใช้ได้กับมีดเท่านั้น จึงเก็บ SP ไว้ก่อน</p></li>\n      <li class="here"><span class="jl">Lv.44–45</span><h3>Bandit ใช้มีด</h3><p>ลง SP ที่เก็บไว้ใน Savage Blow, Dagger Mastery และ Dagger Booster แล้วเปลี่ยนมาใช้มีดกับโล่ ไกด์นี้จบที่เลเวล 50</p></li>\n      <li class="later"><span class="jl">Lv.70</span><h3>Chief Bandit</h3><p>อาชีพขั้นที่ 3 ซึ่งอยู่นอกขอบเขตของไกด์นี้</p></li>'),
 ('<h2>Assassin เด่นอะไร และมีข้อเสียอะไร</h2>', '<h2>Sindit เด่นอะไร และมีข้อเสียอะไร</h2>'),
 ('''        "โจมตีจากระยะไกลได้ตั้งแต่เลเวล 10 Lucky Seven ใช้ขณะกระโดดได้ และปาโดนมอนที่บินได้ จึงโดนตีน้อย",
        "ช่วงเลเวล 10 ถึง 30 เป็นโจรที่เก็บเลเวลได้เร็วที่สุด",
        "หลบมอนเก่ง เพราะได้ทั้งจาก LUK และสกิล Nimble Body และมี Haste ที่ทำให้วิ่งเร็ว ใช้ให้เพื่อนในปาร์ตี้ได้ด้วย",
        "ไม่ค่อยต้องแย่งพื้นที่กับคนอื่น เพราะยืนปาจากจุดที่ปลอดภัยได้ทั่วแมพ",''',
  '''        "ช่วงเลเวล 10–44 ยืนปาดาวจากระยะไกล โดนตีน้อยมาก <b>ประหยัดค่ายาได้มาก</b> เมื่อเทียบกับโจรมีดที่ต้องเข้าไปแทงมอนใกล้ๆ",
        "ช่วงเลเวล 10 ถึง 30 เก็บเลเวลได้เร็ว เพราะ Lucky Seven แรงและปาโดนมอนที่บินได้",
        "ปลายทางเป็น Bandit ใช้ Savage Blow ซึ่ง MeowDB คำนวณว่าแรงกว่า Lucky Seven ราว 39% ต่อนาทีที่เลเวล 40 และได้ Dark Sight เต็ม 20 จากแผนสกิลขั้นแรก",
        "ไม่ต้องซื้อม้วนรีเซ็ตสกิล ถ้าลง SP ตามไกด์นี้ และเลือกเวลาเปลี่ยนเป็นมีดเองได้ตามมีดและเงินที่มี",'''),
 ('''        "ต้องเสียเงินค่าดาวตลอด ทั้งค่าซื้อแพ็กใหม่และค่าเติมดาว และทุกครั้งที่ขึ้น MISS ก็คือเสียดาวไปฟรีๆ",
        "ไม่มีสกิลตีหลายตัวพร้อมกันจนกว่าจะเปลี่ยนเป็น Hermit ตอนเลเวล 70 ระหว่างนี้ต้องใช้ Lucky Seven ตีทีละตัว",
        "claw ใส่คู่กับโล่ไม่ได้ และถ้ามอนเข้ามาใกล้เกิน 65 ตัวละครจะต่อยด้วย claw แทนการปาดาว",
        "ดาวที่แรงๆ ตั้งแต่ Tobi ขึ้นไปราคาแพงมาก ช่วงเลเวล 1 ถึง 50 จึงใช้ Subi และ Wolbi เป็นหลัก",''',
  '''        "ช่วงที่ยังปาดาวต้องเสียค่าดาว และทุกครั้งที่ขึ้น MISS คือเสียดาวฟรี",
        "ต้องเตรียมของสองชุด: claw กับดาวช่วงแรก และมีดกับโล่ตอนเปลี่ยน ถ้าขาย claw ต่อได้แทบไม่เสียอะไร ถ้าขายไม่ได้รวมแล้วเสียราวพันกว่า meso",
        "ไม่มี Double Stab เพราะแต้มขั้นแรกใช้กับ Lucky Seven หลังเปลี่ยนเป็นมีดจึงใช้ Savage Blow อย่างเดียว ซึ่งใช้ MP มากกว่า",
        "ช่วงเลเวล 30–44 สกิลขั้นสองยังไม่ได้ใช้ เพราะเก็บ SP ไว้ และ claw ใส่โล่ไม่ได้จนกว่าจะเปลี่ยนเป็นมีด",'''),
 ('<h2>สายดาวกับสายมีดต่างกันยังไง</h2>', '<h2>Sindit กับโจรมีดตั้งแต่ต้น เลือกแบบไหนดี</h2>'),
 ('<div class="pc">Assassin (ไกด์นี้)</div><div class="pc">Pure Bandit</div>', '<div class="pc">Sindit (ไกด์นี้)</div><div class="pc">โจรมีดตั้งแต่ต้น</div>'),
 ('''      ${[["เลเวล 10 ถึง 30","ใช้ Lucky Seven ปาจากระยะไกล ฆ่ามอนได้เร็ว","ใช้ Double Stab ตีระยะประชิด ฆ่าช้ากว่า"],
         ["ค่าใช้จ่าย","ค่ายา บวกค่าดาวที่ปาหมดไปเรื่อยๆ","ส่วนใหญ่เป็นค่ายา"],
         ["ความปลอดภัย","ยืนห่างจากมอน โดนตีน้อย","ต้องยืนติดมอน ใช้โล่ช่วยกันดาเมจ"],
         ["แมพที่ใช้ตีมอน","Transfer Area (ตี Stirge) ดีที่สุดช่วงเลเวล 20 ถึง 30","ตี Green Mushroom และ Jr. Necki"],
         ["อาวุธ","ซื้อจากร้านได้ถึงเลเวล 25 (Meba) ตั้งแต่เลเวล 30 ต้องคราฟต์หรือซื้อจากผู้เล่น","ซื้อได้ถึงเลเวล 27 ส่วนเลเวล 30 ถึง 40 ต้องคราฟต์หรือรอดรอป"]]''',
  '''      ${[["เลเวล 10 ถึง 44","ปาดาวด้วย Lucky Seven จากระยะไกล","แทงด้วย Double Stab ระยะประชิด"],
         ["ค่าใช้จ่าย","ค่าดาว แต่ค่ายาน้อยมาก เพราะแทบไม่โดนตี","ไม่มีค่าดาว แต่ค่ายาสูงกว่าถ้าหลบมอนไม่เก่ง"],
         ["ค่าเปลี่ยนสาย","ขาย claw ต่อได้แทบไม่เสีย ขายไม่ได้รวมราวพันกว่า meso ส่วนยาที่ประหยัดได้อาจ 2,000–3,000 meso ขึ้นไป","ไม่มี"],
         ["สกิลขั้นแรก","Lucky Seven 20 / Nimble Body 15 / Keen Eyes 3 / Disorder 3 / Dark Sight 20","Double Stab 20 / Nimble Body 15 / Disorder 6 / Dark Sight 20"],
         ["หลังเลเวล 44","Bandit มีด ใช้ Savage Blow อย่างเดียว","Bandit มีด มี Double Stab ไว้ประหยัด MP ด้วย"],
         ["ใครควรเลือก","หลบมอนยังไม่เก่ง อยากประหยัดยา","หลบมอนเก่ง ต้นทุนรวมถูกกว่า"]]'''),
 ('<p class="onote">ลำดับเควสในไกด์ทั้งสองแบบเหมือนกัน สิ่งที่ต่างกันคือการลงสเตตัส สกิล อาวุธ และแมพที่ใช้ตีมอน</p>\n  </section>',
  '''<p class="rule"><b>ความเห็นของเจ้าของไกด์:</b> ถ้าเล่นเก่ง หลบมอนได้ดี โจรมีดตั้งแต่ต้นต้นทุนจะถูกกว่า แต่ถ้าคิดว่ายังหลบมอนไม่เป็น ปาดาวไปก่อนจะประหยัดกว่า เพราะดาวประหยัดยาเลือดได้มาก ยืนปาแทบไม่โดนมอนตี ส่วนโจรมีดต้องเอาหน้าเข้าไปแทงมอนใกล้ๆ ค่าเปลี่ยนสายก็ไม่แพง ถ้าขาย claw ต่อได้แทบไม่เสียอะไร</p>
    <p class="onote">ลำดับเควสในไกด์ทั้งสองแบบเหมือนกัน สิ่งที่ต่างกันคือการลงสเตตัส สกิล อาวุธ และแมพที่ใช้ตีมอน</p>
  </section>

  <section id="i-switch" class="osec"><h2>เปลี่ยนเป็นมีดตอนไหนดี</h2>
    <div class="card band pad">
      <p>ไม่มีเลเวลที่ถูกต้องเพียงเลเวลเดียว ขึ้นกับมีดที่มี เงิน และแมพที่อยากฟาร์ม ผู้เล่นตัดสินใจเองได้ ไกด์นี้แนะนำ <b>เลเวล 44–45</b> เพราะ SP ที่เก็บไว้พอลง Savage Blow 21 (ฟัน 6 ครั้ง) และ Dagger Mastery 20 พร้อมกันตั้งแต่วันแรกที่ถือมีด</p>
      <div class="btbl"><table><thead><tr><th>เปลี่ยนตอน</th><th>มีด</th><th>SP ที่เก็บไว้</th><th>ลงตอนเปลี่ยน</th><th>เทียบกับ Lucky Seven</th></tr></thead><tbody>
        <tr><td>Lv.36</td><td>Halfmoon Zamadar (หรือ Reef Claw)</td><td class="num">19</td><td>Savage Blow 12 / Mastery 6 / Booster 1</td><td>MeowDB: แรงกว่าราว 7.7% ต่อนาที (Halfmoon ไม่ตีม้วน)</td></tr>
        <tr><td>Lv.40</td><td>Gephart หรือ Halfmoon Zamadar</td><td class="num">31</td><td>Savage Blow 21 / Mastery 9 / Booster 1</td><td>MeowDB: Savage Blow 21 กับ Gephart แรงกว่าราว 39% ต่อนาที</td></tr>
        <tr><td><b>Lv.44 (แนะนำ)</b></td><td>Gephart หรือ Halfmoon Zamadar</td><td class="num">43</td><td>Savage Blow 21 / Mastery 20 / Booster 1 / Haste 1</td><td>แรงที่สุดตอนเปลี่ยน ขอบล่างของดาเมจสูง ฆ่ามอนได้ในจำนวนครั้งที่แน่นอนกว่า</td></tr>
      </tbody></table></div>
      ${L([
        "<b>เปลี่ยนเร็ว</b> ได้ดาเมจเพิ่มเร็ว แต่ต้องเข้าประชิดมอนตั้งแต่ช่วง Fire Boar และ Zombie Lupin ซึ่งชนแรง",
        "<b>เปลี่ยนช้า</b> ปาดาวต่อได้ปลอดภัยถึงแมพ Lorang ช่วงเลเวล 38–45 และพอเปลี่ยนก็แรงเต็มที่ทันที",
        "<b>ถ้ายังไม่มีมีด</b> ปาดาวต่อและเก็บ SP ต่อไปได้เลย ไม่มีอะไรเสีย",
        "<b>อย่าลง SP ขั้นสองในสกิลมีดก่อนเปลี่ยน</b> Dagger Mastery, Dagger Booster และ Savage Blow ใช้กับ claw ไม่ได้",
        "รายละเอียดการลง SP หลังเปลี่ยนและมีดที่ควรใช้ ดูในแท็บ <button type=\\"button\\" class=\\"linkbtn\\" data-tab=\\"builds\\"><b>Builds</b></button>",
      ])}
      <p class="onote">ตัวเลขเปรียบเทียบมาจาก Bandit class guide ของ MeowDB (Training Advisor) คิดกับมอน WDEF 0 และอุปกรณ์ไม่ตีม้วน ฝั่ง Lucky Seven ใช้ Adamantium Guards กับดาว Wolbi ผลจริงขึ้นกับมีด ดาว และมอนที่ตี</p>
    </div>
  </section>'''),
 ('      "<b>ตั้งแต่เลเวล 32</b> ให้เปิด Haste และ Claw Booster ไว้ตลอด Booster ลงแค่ 1 แต้มก็ได้ความเร็วเต็มที่แล้ว",',
  '      "<b>เก็บ Pan Lid ที่ดรอปจาก Green Mushroom ไว้</b> ช่วงปาดาวใส่โล่ไม่ได้ แต่พอเปลี่ยนเป็นมีดจะได้ใช้ทันที ไม่ต้องซื้อแพง (ตุลาคม 2026 ผู้เล่นซื้อขายกันราว 45,000 meso)",\n      "<b>ช่วงเลเวล 30–44 ยังไม่มีบัฟความเร็ว</b> เพราะเก็บ SP ไว้ หลังเปลี่ยนเป็นมีดให้เปิด Dagger Booster (1 แต้มก็เร็วเต็มที่) และ Haste ไว้ตลอด",'),
 ('<h3>ทำไมโจรดาวควรเลือก Kerning</h3>', '<h3>ทำไม Sindit ควรเลือก Kerning</h3>'),
 ('แต่สำหรับโจรดาว <b>สายที่ควรอัปเลเวลจริงจังมีแค่สายทำอาวุธ</b> และอัปเฉพาะถ้าจะคราฟต์ claw เอง',
  'สำหรับ Sindit <b>สายที่ควรอัปเลเวลจริงจังมีแค่สายทำอาวุธ</b> และอัปเฉพาะถ้าจะคราฟต์ claw หรือมีดเอง (Halfmoon Zamadar ใช้ Weaponcrafting Lv.7 และ Gephart ใช้ Lv.8)'),
 ('"คราฟต์ Dark Guardian (Lv.35) และ Steel Avarice (Lv.40) ส่วน Slain (Lv.50) ยังคราฟต์ไม่ได้","<span class=\'lvl hi\'>เน้นที่สุด</span> ถ้าจะคราฟต์ claw เอง","claw เลเวล 35 และ 50 ไม่มีขายในร้าน ถ้าใช้ Adamantium Guards จากร้านไปจนถึงเลเวล 50 ข้ามสายนี้ได้"',
  '"คราฟต์ Dark Guardian (Lv.35) และมีด Halfmoon Zamadar (Lv.35) กับ Gephart (Lv.40)","<span class=\'lvl hi\'>เน้นที่สุด</span> ถ้าจะคราฟต์ claw หรือมีดเอง","claw เลเวล 35 และมีดเลเวล 35–40 ไม่มีขายในร้าน ถ้าซื้อจากผู้เล่นแทน ข้ามสายนี้ได้"'),
 ('      "ยืนชิดมอนเกินไป ตัวละครจะต่อยด้วย claw แทนการปาดาว และดาเมจต่ำมาก",',
  '      "ยืนชิดมอนเกินไปตอนยังปาดาว ตัวละครจะต่อยด้วย claw แทนการปาดาว และดาเมจต่ำมาก",\n      "ลง SP ขั้นสองในสกิลมีดตอนยังปาดาวอยู่ แต้มพวกนั้นไม่ช่วยอะไรจนกว่าจะเปลี่ยนเป็นมีด ควรเก็บไว้ลงทีเดียว",\n      "ขาย Pan Lid ทิ้งช่วงปาดาว แล้วต้องซื้อคืนแพงตอนเปลี่ยนเป็นมีด",'),
 ('<p class="credit">ข้อมูลอ้างอิงจากไกด์ Thief (เลเวล 1 ถึง 30) และ Assassin (เลเวล 30 ถึง 70) ของ <a href="https://meowdb.com/msclassic/guides/assassin-class-guide" target="_blank" rel="noopener">NiaMeowDB</a>',
  '<p class="credit">ข้อมูลอ้างอิงจากไกด์ Thief, Assassin และ <a href="https://meowdb.com/msclassic/guides/bandit-class-guide" target="_blank" rel="noopener">Bandit (รวมหัวข้อ Sindit)</a> ของ NiaMeowDB และประสบการณ์ของเจ้าของไกด์'),
]
for a, b in I:
    t = rep(t, a, b)

# ------------------------------------------------------------------ other Assassin wording outside the data
t = rep(t, 'ของที่ขายได้ราคาดีหรือ Assassin ใช้เอง', 'ของที่ขายได้ราคาดีหรือ Sindit ใช้เอง')
t = rep(t, '<h3 class="sub-h">แผนคราฟต์ของ Assassin ตามช่วงเลเวล</h3>', '<h3 class="sub-h">แผนคราฟต์ของ Sindit ตามช่วงเลเวล</h3>')

# ------------------------------------------------------------------ Builds template hooks (same as Bandit)
t = rep(t, '    <p class="onote">${B.apNote}</p>\n', '    <p class="onote">${B.apNote}</p>\n    ${typeof sinditApMore === "function" ? sinditApMore() : ""}\n')
t = rep(t, '    <div class="card band pad"><ul class="olist">${B.spRules.map(x => `<li>${ico(x)}</li>`).join("")}</ul></div>\n',
        '    <div class="card band pad"><ul class="olist">${B.spRules.map(x => `<li>${ico(x)}</li>`).join("")}</ul></div>\n    ${B.spWhy || ""}\n')
t = rep(t, 'const t = $(j.dataset.jump); if (t) t.scrollIntoView({behavior:"smooth", block:"start"}); return; }',
        'const t = $(j.dataset.jump); if (t) { if (t.tagName === "DETAILS") t.open = true; t.scrollIntoView({behavior:"smooth", block:"start"}); } return; }')

SINDIT_JS = r'''
/* Sindit extras: AP / switch explainers (prices from the market snapshot). */
function sinditApMore(){
  const p = n => bPrice(n) || "—";
  return `<style>
  #builds details.bmore{margin:14px 0;padding:0}
  #builds details.bmore>summary{cursor:pointer;padding:14px 18px;font-weight:700;font-size:17px;list-style-position:inside}
  #builds details.bmore>div{padding:0 18px 16px}
  </style>
  <details class="card band bmore" id="b-lukdex"><summary>LUK กับ DEX ทำอะไรกับดาเมจ ทั้งตอนปาดาวและตอนใช้มีด</summary><div>
    <p><b>ตอนปาดาว</b> ดาเมจของ Lucky Seven คิดจาก LUK เป็นหลัก คูณกับ ATK รวมของ claw และดาว DEX แทบไม่เพิ่มดาเมจของท่านี้ จึงลง DEX แค่พอใส่ claw</p>
    <p><b>ตอนใช้มีด</b> ดาเมจสุ่มอยู่ระหว่างขอบล่างกับขอบบน (สูตรของ MeowDB)</p>
    <ul class="olist">
      <li>ขอบบน = (1 + (2 × LUK + STR + DEX) / 100) × ATK มีด × % สกิล</li>
      <li>ขอบล่าง = (0.8 + (2 × LUK × Mastery + STR + DEX) / 100) × ATK มีด × % สกิล</li>
    </ul>
    <p>LUK ดันขอบบน ส่วน DEX บวกทั้งสองขอบเท่ากัน จึงช่วยดาเมจเฉลี่ยด้วย หลัง Dagger Mastery เต็ม LUK คุ้มกว่า DEX ราว 1.5–1.8 เท่า และ DEX ยังเพิ่มความแม่น แผนนี้จะมี DEX 45 ตอนเลเวล 44 ซึ่งพอใส่มีดและชุดโจรถึงเลเวล 50 จึงลง LUK ล้วนหลังจากนั้น</p>
  </div></details>
  <details class="card band bmore" id="b-cost"><summary>ค่าใช้จ่ายของการเปลี่ยนสาย คุ้มไหม</summary><div>
    <ul class="olist">
      <li><b>ดาวประหยัดยาเลือดได้มาก</b> ยืนปาแทบไม่โดนมอนตี ส่วนโจรมีดต้องเข้าไปแทงมอนใกล้ๆ ยาที่ประหยัดได้ตลอดช่วงเลเวล 10–44 อาจถึง 2,000–3,000 meso ขึ้นไป ขึ้นกับฝีมือหลบมอน</li>
      <li><b>ค่าเปลี่ยนสาย</b> ถ้าขาย claw และดาวที่เหลือต่อให้ผู้เล่นได้ แทบไม่เสียอะไร ถ้าขายไม่ได้ รวมแล้วเสียราวพันกว่า meso</li>
      <li><b>ไม่ต้องรีเซ็ตสเตตัสหรือสกิล</b> แผน AP นี้มี DEX พอใส่ทั้ง claw และมีด และสกิลขั้นแรกใช้ได้ทั้งสองช่วง</li>
      <li><b>ของที่ต้องเตรียมตอนเปลี่ยน</b> มีด 1 เล่ม และโล่ Pan Lid (เก็บจาก Green Mushroom ไว้ตั้งแต่ต้น)</li>
    </ul>
    <div class="btbl"><table><thead><tr><th>มีดสำหรับเปลี่ยนสาย</th><th>ATK</th><th>ต้องมี</th><th>ราคาตลาด</th></tr></thead><tbody>
      <tr><td>Reef Claw (Lv.30)</td><td class="num">48</td><td>DEX 25 / LUK 60</td><td class="bprice">${p("Reef Claw")}</td></tr>
      <tr><td>Halfmoon Zamadar (Lv.35)</td><td class="num">53</td><td>DEX 30 / LUK 70</td><td class="bprice">${p("Halfmoon Zamadar")}</td></tr>
      <tr><td>Gephart (Lv.40)</td><td class="num">58</td><td>DEX 35 / LUK 80</td><td class="bprice">${p("Gephart")}</td></tr>
      <tr><td>Korean Fan (Lv.40)</td><td class="num">55</td><td>LUK 70</td><td class="bprice">${p("Korean Fan")}</td></tr>
      <tr><td>Pan Lid (โล่)</td><td class="num">—</td><td>—</td><td class="bprice">${p("Pan Lid")}</td></tr>
    </tbody></table></div>
    <p class="onote">ถ้าไม่อยากจ่ายแพง Halfmoon Zamadar ใช้ได้ถึงเลเวล 50 (ดาเมจราว 91% ของ Gephart) Korean Fan ดรอปจาก Lorang ที่ route พาไปตี ถ้าได้มาก็ใช้ได้ทันที</p>
  </div></details>`;
}
'''
t = rep(t, '\n/* ---------- แท็บ Builds ---------- */', SINDIT_JS.rstrip('\n') + '\n\n/* ---------- แท็บ Builds ---------- */')

SP_WHY = '''<h3 class="sub-h">ตอนเปลี่ยนเป็นมีด ลง SP ยังไง</h3>
  <div class="card band pad">
    <p>ตั้งแต่เลเวล 30 ได้ SP ขั้นสองเลเวลละ 3 แต้ม (เปลี่ยนอาชีพได้ 1 แต้ม) <b>เก็บไว้ทั้งหมด</b> แล้วลงทีเดียวในวันที่ถือมีด เลือกแถวที่ตรงกับเลเวลที่คุณเปลี่ยน</p>
    <div class="btbl"><table><thead><tr><th>เปลี่ยนตอน</th><th>SP ที่มี</th><th>ลงทันที</th><th>หลังจากนั้น</th></tr></thead><tbody>
      <tr><td>Lv.36</td><td class="num">19</td><td>Savage Blow 12 / Dagger Mastery 6 / Dagger Booster 1</td><td>Mastery +3 ต่อเลเวลจนเต็ม 20 (Lv.41) แล้ว Savage Blow ถึง 21 (Lv.44)</td></tr>
      <tr><td>Lv.40</td><td class="num">31</td><td>Savage Blow 21 / Dagger Mastery 9 / Dagger Booster 1</td><td>Lv.41–43 Mastery +3 ต่อเลเวล และ Lv.44 Mastery 20 + Haste 1</td></tr>
      <tr><td><b>Lv.44 (แนะนำ)</b></td><td class="num">43</td><td>Savage Blow 21 / Dagger Mastery 20 / Dagger Booster 1 / Haste 1</td><td>ตามแผนด้านล่าง</td></tr>
    </tbody></table></div>
    <ol class="steps">
      <li>Lv.45–47: Savage Blow +3 ต่อเลเวล จนเต็ม 30</li>
      <li>Lv.48: Haste 4 → Lv.49: Haste 5 / Steal 1 / Nimble Recovery 1 → Lv.50: Haste 8</li>
      <li>ที่เลเวล 50 จะได้ Mastery 20 / Savage Blow 30 / Haste 8 / Booster 1 / Steal 1 / Recovery 1 รวม 61 SP เท่ากับแผนของไกด์โจรมีด หลังจากนั้นลงต่อตามทางเลือก A/B/C ในไกด์โจรมีด</li>
    </ol>
    <p><b>ทำไมลง Dagger Mastery ให้เต็มเร็ว</b> Mastery บีบช่วงดาเมจให้แคบลง ขอบล่างขึ้นจากราว 32% เป็นราว 79% ของขอบบน ดาเมจเฉลี่ยเพิ่มราว 36% และได้คริ +20% ส่วนแถว Lv.40 ลง Savage Blow ก่อนเพราะ Sindit ไม่มี Double Stab จึงต้องมีท่าที่ฟัน 6 ครั้งตั้งแต่วันแรก</p>
    <p class="onote">ไม่อยากเก็บ SP? ลง Haste ระหว่างปาดาวก่อนได้ (Haste 8 อยู่ในแผนเลเวล 50 อยู่แล้ว) แต่ทุกแต้มที่ลงไปจะทำให้ Savage Blow หรือ Mastery ตอนเปลี่ยนน้อยลง อีกทางคือแบบของ MeowDB ที่ใช้ม้วนรีเซ็ตสกิล (7,000 NX) ตอนเลเวล 40 เพื่อแลก Lucky Seven เป็น Double Stab ไกด์นี้ไม่ใช้ทางนั้นเพราะต้องจ่ายเงินจริง</p>
  </div>'''

TEXT = {
 "title": "ลงสเตตัส สกิล และชุดตามเลเวล",
 "lead": "แท็บนี้รวมทุกอย่างที่ต้องตัดสินใจตอนเลเวลอัป ได้แก่ ลง AP ยังไง ลง SP ยังไง เก็บ SP ไว้เท่าไร และแต่ละช่วงเลเวลควรใช้ claw ดาว มีด และชุดอะไร ทุกอย่างอ้างอิงตาม route ของไกด์นี้",
 "summary": [["AP", "LUK เป็นหลัก ลง DEX ให้พอใส่ claw และมีด (DEX 45 ที่ Lv.44) แล้วลง LUK ล้วนถึง Lv.50"],
             ["SP", "ขั้นแรก Lucky Seven 20 / Nimble Body 15 / Keen Eyes 3 / Disorder 3 / Dark Sight 20 ขั้นสองเก็บไว้ลงทีเดียวตอนเปลี่ยนเป็นมีด"],
             ["ของ", "ก่อนเปลี่ยน: claw กับดาว ตอนเปลี่ยน: มีด Lv.35–40 กับโล่ Pan Lid และชุดที่เพิ่ม LUK"]],
 "apFlow": [["Lv.1", "สร้างตัวละครแบบโจร STR 4, DEX 5, INT 4, LUK 12"], ["Lv.2–19", "ลง LUK ทั้งหมด เลเวลละ 5 แต้ม"],
            ["Lv.20–24", "ลง DEX 4 และ LUK 1 ทุกเลเวล ให้ DEX ถึง 25 ทันใส่ Meba"], ["Lv.25–44", "ลง DEX 1 และ LUK 4 ทุกเลเวล (DEX 45 ที่ Lv.44)"],
            ["Lv.45–50", "ลง LUK ทั้งหมด DEX 45 พอใส่มีดและชุดถึงเลเวล 50"]],
 "apRules": [
   "<b>LUK</b> คือสเตตัสหลักทั้งตอนปาดาวและตอนใช้มีด ให้ลงมากที่สุดเท่าที่ทำได้",
   "<b>DEX</b> ลงแค่พอใส่ของ แผนนี้ลง DEX เร็วช่วงเลเวล 20–24 เพื่อใส่ Meba แล้วลงเลเวลละ 1 ที่เลเวล 44 จะมี DEX 45 พอใส่ Gephart (DEX 35) และ Shinkita (DEX 45) จึงไม่ต้องลง DEX เพิ่มจนถึงเลเวล 50",
   "<b>STR และ INT ไม่ต้องลงเลย</b> มีดสาย STR (Cass, Bazlud, Sai) จึงใส่ไม่ได้",
   "<b>ถ้าขึ้น MISS บ่อย</b> ให้เก็บเลเวลก่อน อย่าลง DEX เพิ่ม เพราะเลเวลของตัวละครช่วยเรื่องความแม่นได้มากกว่า",
 ],
 "apNote": "ถ้าลงสเตตัสผิด แก้ได้ด้วยม้วน AP Reset ราคา 7,000 NX (ใช้ได้ตั้งแต่เลเวล 10) เกมจะไม่รีเซ็ตสเตตัสให้เองตอนเปลี่ยนอาชีพ",
 "spRules": [
   "<b>ตอนเป็น Beginner</b> ถึงเลเวล 10 จะได้ 9 แต้ม ให้ลง Three Snails, Recovery และ Nimble Feet สกิลละ 3 แต้ม",
   "<b>ขั้นแรก 61 SP</b> Lucky Seven 20 → Nimble Body 15 → Keen Eyes 3 → Disorder 3 → Dark Sight 20 <b>ไม่ลง Double Stab</b> ทั้งหมดต้องลงให้จบภายในเลเวล 30 เพราะแต้มขั้นสองเอามาลงสกิลขั้นแรกไม่ได้",
   "<b>Keen Eyes ลงแค่ 3</b> เพื่อเหลือแต้มให้ Dark Sight เต็ม 20 ซึ่งยังใช้ได้หลังเปลี่ยนเป็นมีด",
   "<b>ขั้นสอง (Bandit) เก็บ SP ไว้ก่อน</b> Dagger Mastery, Dagger Booster และ Savage Blow ใช้ได้กับมีดเท่านั้น ลงตอนยังปาดาวจะเสียแต้มเปล่า",
   "<b>วันที่เปลี่ยนเป็นมีด</b> ลง SP ที่เก็บไว้ตามตารางด้านล่าง แผนหลักเลเวล 44: Savage Blow 21 / Dagger Mastery 20 / Dagger Booster 1 / Haste 1",
 ],
 "spTables": [{"t": "สกิลแต่ละตัวทำอะไร", "head": ["สกิล", "สกิลนี้ทำอะไร", "ลงตอนไหน"], "rows": [
   ["Lucky Seven", "ปาดาว 2 ลูกใส่มอนจากระยะไกล แต่ละลูกแรง 140% ท่าหลักตั้งแต่เลเวล 10 จนเปลี่ยนเป็นมีด", "เลเวล 10–17 จนเต็ม 20"],
   ["Nimble Body", "เพิ่ม ACC และ Avoid ลด MISS ซึ่งสำคัญเพราะ MISS ทุกครั้งคือเสียดาวฟรี และยังช่วยหลังเปลี่ยนเป็นมีด", "เลเวล 17–22 จนเต็ม 15"],
   ["Keen Eyes", "เพิ่มระยะปาดาว ลงแค่ 3 แต้มเพื่อเหลือแต้มให้ Dark Sight", "เลเวล 22–23 ลง 3"],
   ["Disorder", "ลดพลังโจมตีของมอน ต้องมี 3 แต้มก่อนลง Dark Sight", "เลเวล 23–24 ลง 3"],
   ["Dark Sight", "หายตัว ใช้หนีหรือเดินผ่านมอน ลงเต็มแล้วไม่เสียความเร็วและใช้ MP น้อยลง ใช้ได้ทั้งตอนปาดาวและตอนใช้มีด", "เลเวล 24–30 จนเต็ม 20"],
   ["Savage Blow", "ฟันมอนตัวเดียว 4 / 5 / 6 ครั้งที่สกิล 1 / 11 / 21 ท่าหลักหลังเปลี่ยนเป็นมีด ใช้ได้เฉพาะมีด", "ตอนเปลี่ยนเป็นมีด (21 ที่เลเวล 44) แล้วเลเวล 45–47 จนเต็ม 30"],
   ["Dagger Mastery", "บีบช่วงดาเมจของมีดให้แคบลง ขอบล่างสูงขึ้นมาก และคริ +20% ใช้ได้เฉพาะมีด", "ตอนเปลี่ยนเป็นมีด ลงให้เต็ม 20"],
   ["Dagger Booster", "ตีด้วยมีดเร็วขึ้น 2 ขั้น 1 แต้มก็เร็วเต็มที่ ต้องมี Mastery 5", "1 แต้มตอนเปลี่ยนเป็นมีด"],
   ["Haste", "วิ่งเร็ว กระโดดสูง ใช้กับเพื่อนในปาร์ตี้ได้ ใช้ได้ทุกอาวุธ", "1 แต้มตอนเปลี่ยน แล้วเลเวล 48–50 ถึง 8"],
   ["Steal / Nimble Recovery", "Steal ต้องมี Haste 5 ขโมยสำเร็จได้บัฟ Attack Power ส่วน Recovery ฟื้น HP/MP หลังหลบสำเร็จ", "อย่างละ 1 แต้มที่เลเวล 49"],
 ], "notes": ["ลำดับการลงสกิลแบบเลเวลต่อเลเวลเขียนไว้ในช่อง SP ของแต่ละขั้นใน route แล้ว"]}],
 "gearNotes": [
   "<b>ดาเมจของ Lucky Seven</b> คิดจาก LUK คูณกับ ATK รวมของ claw และดาว การเปลี่ยนดาวจาก Subi (+15) เป็น Wolbi (+17) จึงเพิ่มดาเมจได้พอๆ กับการอัปเกรด claw หนึ่งขั้น",
   "<b>claw ที่ขายในร้าน NPC ตอนเปิดเกมมีแค่ 4 อัน</b> คือ Garnier, Steel Titans, Steel Igor และ Meba ที่ Cutthroat Manny ใน Kerning ตั้งแต่เลเวล 30 ขึ้นไปต้องคราฟต์หรือซื้อจากผู้เล่น",
   "<b>claw ใส่โล่ไม่ได้</b> แต่ให้เก็บ Pan Lid ที่ดรอปจาก Green Mushroom ไว้ใช้ตอนเปลี่ยนเป็นมีด",
   "<b>ตอนเปลี่ยนเป็นมีด</b> ขาย claw และดาวที่เหลือให้ผู้เล่นคนอื่น ถ้าขายต่อได้แทบไม่เสียเงิน ถ้าจะเปลี่ยนเร็วตอนเลเวล 36–40 ไม่ต้องทำ Dark Guardian",
 ],
}


def build(o):
    o['cls'] = 'Sindit'
    o['wlabel'] = 'อาวุธ'
    o['stat']['phases'] = [[2, 19, {"luk": 5}], [20, 24, {"dex": 4, "luk": 1}], [25, 44, {"dex": 1, "luk": 4}], [45, 99, {"luk": 5}]]
    o['jobLines'] = [{"lv": 30, "t": "Bandit"}, {"lv": 44, "t": "ใช้มีด"}]
    keep_alt = o['text'].get('apAlt')
    create = o['text']['create']
    o['text'] = dict(TEXT)
    o['text']['create'] = create
    if keep_alt:
        o['text']['apAlt'] = keep_alt
    o['text']['spWhy'] = SP_WHY
    o['sp'] = [
        {"n": "Lucky Seven", "d": "ท่าปาดาวหลักจนเปลี่ยนเป็นมีด", "seg": [[10, 17, 20]]},
        {"n": "Nimble Body", "d": "ACC และ Avoid ลด MISS", "seg": [[17, 22, 15]]},
        {"n": "Keen Eyes", "d": "ปาไกลขึ้น ลงแค่ 3", "seg": [[22, 23, 3]]},
        {"n": "Disorder", "d": "ต้องมี 3 ก่อน Dark Sight", "seg": [[23, 24, 3]]},
        {"n": "Dark Sight", "d": "ใช้ได้ทั้งสองช่วง MAX 20", "seg": [[24, 30, 20]]},
        {"n": "Savage Blow", "d": "ลงตอนเปลี่ยนมีด 6 ฮิตที่ 21", "seg": [[44, 44, 21], [45, 47, 30]]},
        {"n": "Dagger Mastery", "d": "ลงเต็มตอนเปลี่ยนมีด", "seg": [[44, 44, 20]]},
        {"n": "Dagger Booster", "d": "1 แต้มพอ", "seg": [[44, 44, 1]]},
        {"n": "Haste", "d": "วิ่งเร็ว กระโดดสูง", "seg": [[44, 44, 1], [48, 50, 8]]},
        {"n": "Steal", "d": "ต้องมี Haste 5", "seg": [[49, 49, 1]]},
        {"n": "Nimble Recovery", "d": "ต้องหลบสำเร็จ", "seg": [[49, 49, 1]]},
    ]
    it = o['items']
    for n in DAGGERS:
        x = json.loads(json.dumps(BB['items'][n]))
        x['ic'] = inline_bandit(x['ic'])
        x.pop('howto', None)
        it[n] = x
    it['Pan Lid']['note'] = 'เก็บไว้ตั้งแต่ Green Mushroom ช่วงปาดาวใส่ไม่ได้ แต่ใช้ได้ทันทีตอนเปลี่ยนเป็นมีด'
    it['Korean Fan']['note'] = 'มีด Lv.40 ต้องการแค่ LUK 70 ATK น้อยกว่า Gephart 3 แต่ตีเร็วกว่า 1 ขั้น ถ้าดรอปจาก Lorang ระหว่างปาดาว ใช้ตอนเปลี่ยนได้ทันที'
    it['Gephart']['note'] = 'มีดหลักสำหรับเปลี่ยนสายตอนเลเวล 40–44 แผน AP นี้มี DEX พอตั้งแต่เลเวล 40'
    it['Halfmoon Zamadar']['note'] = 'ทางเลือกที่ถูกกว่า ใช้เปลี่ยนสายได้ตั้งแต่เลเวล 36 และใช้ได้ถึงเลเวล 50'
    it['Dark Guardian']['note'] = 'claw Lv.35 ATK 26 ใช้ปาดาวถึงเลเวล 43 แล้วขายต่อตอนเปลี่ยนเป็นมีด ถ้าจะเปลี่ยนเร็วไม่ต้องทำ'
    tb = {x['k']: x for x in o['tables']}
    tb['weapon']['items'] += [n for n in ['Reef Claw', 'Halfmoon Zamadar', 'Gephart', 'Korean Fan', 'Shinkita'] if n not in tb['weapon']['items']]
    o['tables'].insert(2, {"k": "shield", "t": "โล่", "items": ["Pan Lid"]})
    o['apRows'] = [[10, "Beginner's Garnier"], [15, "Steel Titans", 1], [20, "Steel Igor", 1], [25, "Meba"], [30, "Adamantium Guards", 1],
                   [35, "Dark Guardian"], [36, "Halfmoon Zamadar", 1], [40, "Gephart", 1], [44, "Gephart"], [44, "Korean Fan", 1], [50, "Shinkita", 1]]
    br = {tuple(b['lv']): b for b in o['br']}
    for b in o['br']:
        if b['job'] == 'Assassin':
            b['job'] = 'Bandit'
    br[(30, 34)]['head'] = 'เปลี่ยนอาชีพเป็น Bandit แต่ยังปาดาวด้วย Meba'
    br[(30, 34)]['tip'] = 'เก็บ SP ขั้นสองไว้ทั้งหมด ร้าน NPC ไม่มี claw เลเวล 30 ขาย ใช้ Meba ต่อ หรือคราฟต์ Adamantium Guards ถ้ามีวัตถุดิบ'
    br[(35, 39)]['head'] = 'claw Dark Guardian หรือเตรียมเปลี่ยนเป็นมีดเร็ว'
    br[(35, 39)]['tip'] = br[(35, 39)]['tip'] + ' ถ้าจะเปลี่ยนเป็นมีดตอนเลเวล 36 ใช้ Halfmoon Zamadar แทน ไม่ต้องทำ Dark Guardian'
    br[(35, 39)]['s']['weapon']['alt'] = ['Meba', 'Halfmoon Zamadar']
    b = br[(40, 44)]
    b['head'] = 'ปาดาวต่อ และเตรียมมีดกับโล่ไว้เปลี่ยนตอนเลเวล 44'
    b['tip'] = 'แผนหลักปาดาวถึงเลเวล 43 แล้วเปลี่ยนเป็นมีดตอนเลเวล 44 ถ้ามีมีดแล้วและอยากเปลี่ยนเร็ว ดูตารางในหัวข้อลง SP'
    b['s']['weapon'] = {'i': 'Dark Guardian', 'alt': ['Gephart', 'Halfmoon Zamadar', 'Korean Fan'], 'opt': False, 'note': 'มีดในช่องตัวเลือกคือของที่ต้องเตรียมไว้เปลี่ยนตอนเลเวล 44'}
    b['s']['shield'] = {'i': 'Pan Lid', 'alt': [], 'opt': True, 'note': 'ใส่ได้หลังเปลี่ยนเป็นมีด'}
    b = br[(45, 50)]
    b['head'] = 'เป็น Bandit ใช้มีดเต็มตัว ฟันด้วย Savage Blow'
    b['tip'] = 'ขาย claw และดาวที่เหลือ ถ้าได้ Black Napoleon (LUK +3) ให้ใส่แทน Icarus Cape มีด Lv.50 (Shinkita) ยังไม่มีแหล่งได้ จึงใช้ Gephart หรือ Halfmoon ต่อ'
    b['s']['weapon'] = {'i': 'Gephart', 'alt': ['Halfmoon Zamadar', 'Korean Fan'], 'opt': False, 'note': None}
    b['s']['shield'] = {'i': 'Pan Lid', 'alt': [], 'opt': False, 'note': None}
    b.pop('ammo', None)


t = J(t, 'BUILD', build)

# ------------------------------------------------------------------ route
SP = {
 11: 'เลเวล 10 ลง Lucky Seven 1 แต้ม',
 12: 'เลเวล 11 ลง Lucky Seven ให้ถึง 4',
 14: 'เมื่อถึง Lv.12 ลง Lucky Seven ให้ถึง 7',
 16: 'เลเวล 13 ลง Lucky Seven ให้ถึง 10',
 17: 'เลเวล 14 ลง Lucky Seven ให้ถึง 13',
 19: 'เลเวล 15 ลง Lucky Seven ถึง 16, เลเวล 16 ถึง 19, เลเวล 17 ถึง 20 ซึ่งเต็มแล้ว (MAX) และลง Nimble Body 2, เลเวล 18 ลง Nimble Body ถึง 5, เลเวล 19 ถึง 8 และเลเวล 20 ถึง 11',
 21: 'เลเวล 21 ลง Nimble Body ให้ถึง 14',
 22: 'เลเวล 22 ลง Nimble Body ถึง 15 ซึ่งเต็มแล้ว (MAX) และลง Keen Eyes 2',
 26: 'เลเวล 23 ลง Keen Eyes ถึง 3 และลง Disorder 2',
 29: 'เลเวล 24 ลง Disorder ถึง 3 และลง Dark Sight 2',
 30: 'เลเวล 25 ลง Dark Sight ถึง 5, เลเวล 26 ถึง 8 และเลเวล 27 ถึง 11',
 32: 'เลเวล 28 ลง Dark Sight ให้ถึง 14',
 33: 'เลเวล 29 ลง Dark Sight ถึง 17',
 35: 'เลเวล 30 ลง Dark Sight ถึง 20 ซึ่งเต็มแล้ว (MAX) ครบ 61 SP ของขั้นแรก เมื่อเป็น Bandit แล้วได้ 1 แต้ม <b>ยังไม่ต้องลง เก็บไว้</b>',
 36: 'เลเวล 31 เก็บ SP ไว้ (รวม 4 แต้ม)',
 37: 'เลเวล 32 เก็บ SP ไว้ (รวม 7 แต้ม)',
 38: 'เลเวล 33–35 เก็บ SP ไว้ (รวม 10 / 13 / 16 แต้ม) ถ้าจะเปลี่ยนเป็นมีดตอนเลเวล 36 ดูตารางในแท็บ Builds',
 39: 'เลเวล 36–37 เก็บ SP ไว้ (รวม 19 / 22 แต้ม)',
 40: 'เลเวล 38–43 เก็บ SP ไว้ (รวม 25 / 28 / 31 / 34 / 37 / 40 แต้ม) <b>เลเวล 44 เปลี่ยนเป็นมีด</b> แล้วลง 43 แต้มที่เก็บไว้: Savage Blow 21 / Dagger Mastery 20 / Dagger Booster 1 / Haste 1 เลเวล 45 ลง Savage Blow ถึง 24',
 41: 'เลเวล 46 ลง Savage Blow ถึง 27',
 42: 'เลเวล 47 ลง Savage Blow ถึง 30 ซึ่งเต็มแล้ว (MAX) เลเวล 48 ลง Haste ถึง 4 เลเวล 49 ลง Haste 5 / Steal 1 / Nimble Recovery 1 และเลเวล 50 ลง Haste ถึง 8',
}


def route(S):
    for i, s in SP.items():
        S[i]['sp'] = s
    BS = get(BT, 'S')
    adv = json.loads(json.dumps(BS[35]))
    adv['act'][5] = S[35]['act'][5]
    adv['act'][5]['x'] = ssub(adv['act'][5]['x'], 'ให้ใช้ Meba ต่อ', 'ให้ปาดาวด้วย Meba ต่อ')
    adv['opt'] = [{"k": "craft", "x": "ถ้า Weaponcrafting ถึง Lv.7 จะคราฟต์ได้ทั้ง Dark Guardian (claw Lv.35) และ Halfmoon Zamadar (มีด Lv.35) ส่วน Gephart (มีด Lv.40) ต้อง Lv.8 ดูแผนในแท็บล่าของ"}]
    adv['ap'] = S[35]['ap']
    adv['sp'] = SP[35]
    S[35] = adv
    S[16]['opt'][0]['x'] = 'Green Mushroom ดรอป Pan Lid (โล่) <span class="cf" title="ผู้เล่นยืนยันดรอปใน Classic 18 คน">ยืนยัน 18 คน</span> claw ใส่โล่ไม่ได้ <b>แต่ให้เก็บไว้ใช้ตอนเปลี่ยนเป็นมีด</b> ถ้าได้หลายอันค่อยขายส่วนที่เกิน'
    S[19]['opt'][2]['x'] = ssub(S[19]['opt'][2]['x'], '(ไว้ขาย)', '(เก็บไว้ 1 อันสำหรับตอนเปลี่ยนเป็นมีด)')
    S[38]['opt'][0]['x'] = 'Jr. Wraith ดรอป Dagger Attack Scroll: Intermediate (60%) ม้วนมีดที่จะได้ใช้หลังเปลี่ยนสาย เก็บไว้ตีม้วนมีด และ Jr. Wraith ยังมีลุ้น Mokbi Throwing Stars (+19) ด้วย'
    S[38]['opt'][2]['x'] = 'Ligator ดรอป Reef Claw / Gephart (มีด) <span class="cf" title="ผู้เล่นยืนยันดรอปใน Classic 1 คน">ยืนยัน 1 คน</span> เก็บไว้ใช้ตอนเปลี่ยนเป็นมีด'
    S[39]['act'][7]['tip'] = S[39]['act'][7]['tip'] + ' ถ้าจะเปลี่ยนเป็นมีดตอนเลเวล 36–40 ไม่ต้องทำ Dark Guardian ใช้ Meba ต่อแล้วเก็บเงินไว้ซื้อมีด'
    S[40]['intro'] = S[40]['intro'] + ' ช่วงนี้คือจังหวะเปลี่ยนเป็นมีด แผนหลักเปลี่ยนตอนเลเวล 44'
    S[40]['opt'][2]['x'] = 'Lorang ดรอป Korean Fan (มีด Lv.40 ต้องการแค่ LUK 70) ถ้าได้มาใช้เปลี่ยนสายได้ทันที ส่วน claw ที่ใช้อยู่ให้ขายต่อหลังเปลี่ยน'
    S[40]['act'].append({"t": "gear", "x": "<b>เลเวล 44 เปลี่ยนเป็นมีด</b> ใส่ Gephart หรือ Halfmoon Zamadar คู่กับโล่ Pan Lid แล้วลง SP ที่เก็บไว้ 43 แต้ม: Savage Blow 21 / Dagger Mastery 20 / Dagger Booster 1 / Haste 1",
                         "tip": "เปิด Dagger Booster และ Haste ไว้ตลอด ใช้ Savage Blow เป็นท่าหลัก ถ้ายังไม่มีมีด ปาดาวต่อและเก็บ SP ต่อไปได้",
                         "sub": ["ขาย claw และดาวที่เหลือให้ผู้เล่นคนอื่น", "ถ้าอยากเปลี่ยนเร็วกว่านี้ ดูตารางเลเวล 36 / 40 ในแท็บ Builds"]})
    S[40]['ap'] = 'เลเวล 40–44 ทุกครั้งที่เลเวลอัปให้ลง DEX 1 แต้มและ LUK 4 แต้ม (DEX ถึง 45 ที่เลเวล 44) ตั้งแต่เลเวล 45 ลง LUK ทั้ง 5 แต้ม'
    S[41]['ap'] = 'ลง LUK ทั้ง 5 แต้มทุกเลเวล'
    S[42]['ap'] = 'ลง LUK ทั้ง 5 แต้มทุกเลเวล DEX 45 พอใส่มีดและชุดโจรถึงเลเวล 50'
    S[42]['act'][3] = {"t": "gear", "x": "มีดเลเวล 50 สาย DEX (Shinkita) ยังไม่มีแหล่งได้ใน Classic ให้ใช้ Gephart หรือ Halfmoon Zamadar ต่อถึงเลเวล 50",
                       "tip": "ตีม้วน ATK ให้มีดที่ใช้อยู่คุ้มกว่ารอมีดใหม่"}
    S[42]['keep'] = '—'
    return S


t = J(t, 'S', route)


def optdata(o):
    BO = get(BT, 'OPTDATA')
    o['weapons'] += [r for r in BO['weapons'] if any(k in r[1] for k in ('Halfmoon', 'Gephart', 'Korean'))]
    o['weaponSkip'] = o['weaponSkip'] + ' · มีดสำหรับเปลี่ยนสาย: Halfmoon Zamadar (Lv.35) หรือ Gephart (Lv.40) คราฟต์ได้ด้วย Weaponcrafting Lv.7 / Lv.8'
    rows = o['gear'][3][2]
    rows[0] = ["อาวุธ", "claw ใช้ถึงเลเวล 43 → มีด Gephart / Halfmoon Zamadar ตอนเลเวล 44 + โล่ Pan Lid", "มีดคราฟต์ Weaponcrafting Lv.7–8 หรือซื้อจากผู้เล่น · Korean Fan ดรอปจาก Lorang"]
    o['craftPlan'][3] = ["Lv.35–44", "มีดสำหรับเปลี่ยนสาย", ["Halfmoon Zamadar (Weaponcrafting Lv.7) หรือ Gephart (Weaponcrafting Lv.8) ดูวัตถุดิบในตารางสูตรคราฟต์", "ถ้าจะเปลี่ยนเร็วตอนเลเวล 36–40 ข้าม Dark Guardian ได้"]]


t = J(t, 'OPTDATA', optdata)


def grind(o):
    o['cls'] = 'Sindit'
    st = o['stages']
    st[3]['cls'] = ["Lorang เดินเร็ว ให้ปาตั้งแต่ระยะไกลสุดของ Keen Eyes", "Lorang ดรอป <b>Korean Fan</b> มีด Lv.40 ที่ต้องการแค่ LUK 70 ใช้เปลี่ยนสายได้ทันที แมพนี้เหมาะจะเปลี่ยนเป็นมีดตอนเลเวล 44"]
    st[4]['cls'] = ["ถ้าเปลี่ยนเป็นมีดแล้ว Clang มี PDEF 15 ใช้ Savage Blow ตลอด และเปิด Haste ไว้", "ถ้ายังปาดาว Clang ใช้ Lucky Seven 2–3 ครั้งตอนเลเวล 45 ถ้าดาวเปลืองเกินไปให้กลับไปตี Lorang"]


t = J(t, 'GRIND', grind)

def rare(R):
    for r in R:
        if r[0] == 'Pan Lid': r[7] = 'เก็บไว้ใช้เองตอนเปลี่ยนเป็นมีด (ช่วงปาดาวใส่ไม่ได้)'
        if r[0] == 'Dagger Attack Scroll: Intermediate': r[7] = 'เก็บไว้ตีม้วนมีดหลังเปลี่ยนสาย'
        if r[0] == 'Korean Fan': r[7] = 'ใช้เองตอนเปลี่ยนเป็นมีด หรือขายได้ราคาสูง'


t = J(t, 'RAREDATA', rare)
t = rep(t, '<div class="pc">สำหรับ Assassin</div>', '<div class="pc">สำหรับ Sindit</div>')

# ICON / ITEM_URL for the dagger names that now appear in route text and tables
def icons(o):
    for n in DAGGERS:
        if n in B_ICON and n not in o:
            o[n] = inline_bandit(B_ICON[n])
t = J(t, 'ICON', icons)
t = J(t, 'ITEM_URL', lambda o: o.update({n: B_URL[n] for n in DAGGERS if n in B_URL and n not in o}))

left = [m.start() for m in re.finditer('Assassin', t)]
open(SITE + 'sindit.html', 'w').write(t)
print('sindit ok', len(t), 'Assassin mentions left:', len(left))
