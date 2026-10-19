"""Turn the assembled artifact guides (out/*.html) into website versions (site/*.html).

The website copies in Supabase guide_files carry edits the artifacts never had:
  - all guides: no artifact wrapper, market prices via window.__MKT__ instead of the
    artifact db, a different price-source note, and the owner's "mkt-profit-tips" money section
  - Bandit: the owner's skill plan (Sindit option, 2nd-job A/B/C builds, level plan,
    route SP overrides) and Reef Claw "not sold by NPC" corrections
This script re-applies those edits on top of the new content so nothing of the owner's is lost.
"""
import re, sys
import site_patch

B = '/home/claude/build/'
TIPS = open(B + 'site_money_tips.html').read().rstrip('\n')
BANDIT_BLOCK = open(B + 'site_bandit_block.js').read().rstrip('\n')
MKT_LINE = 'if (window.__MKT__ && window.__MKT__.prices && (!MKT.fetchedAt || window.__MKT__.fetchedAt >= MKT.fetchedAt)) { MKT = window.__MKT__; mktSource = "db"; }'
ONOTE = '    <p class="onote">ราคาผู้เล่นเป็นราคาที่ผู้เล่นช่วยกันรายงานไว้บน <a href="https://meowdb.com/msclassic/free-market" target="_blank" rel="noopener">MeowDB Free Market</a> ย้อนหลัง 14 วัน หน้านี้ดึงราคามาอัปเดตวันละครั้ง ข้อมูลล่าสุดเมื่อ <b>${mktDate()}</b></p>'


def rep(t, old, new, count=1):
    n = t.count(old)
    if n != count:
        sys.exit(f'expected {count} of {old[:80]!r}, found {n}')
    return t.replace(old, new)


def common(t):
    lines = t.split('\n')
    # artifact wrapper: first line is the injected <!doctype ...><body>, last lines are </body></html>
    assert lines[0].startswith('<!doctype html><html><head><meta charset=utf8>'), lines[0][:60]
    lines = lines[1:]
    while lines and lines[-1].strip() in ('', '</body></html>'):
        lines.pop()
    t = '\n'.join(lines) + '\n'
    # market loader
    m = re.search(r'async function loadMarket\(\)\{.*?\nif \(window\.claude && claude\.use\) loadMarket\(\);', t, re.S)
    assert m, 'loadMarket block'
    t = t[:m.start()] + MKT_LINE + t[m.end():]
    # price source note
    m = re.search(r'    <p class="onote">ราคาผู้เล่นเป็นราคาที่ผู้เล่นช่วยกันรายงานไว้บน[^\n]*', t)
    assert m, 'onote'
    t = t[:m.start()] + ONOTE + t[m.end():]
    # owner's money tips, right before the "check before selling" rule
    t = rep(t, '    <p class="rule"><b>ก่อนขายของทุกครั้ง</b>', TIPS + '\n    <p class="rule"><b>ก่อนขายของทุกครั้ง</b>')
    return t


def bandit(t):
    # Reef Claw is not sold by any NPC in Victoria (owner's correction)
    t = rep(t, 'Reef Claw ตอนเลเวล 30 (ดรอปจาก Ligator หรือซื้อจากร้านถ้ามีขาย)',
            'Reef Claw ตอนเลเวล 30 (ดรอปจาก Ligator หรือซื้อจากผู้เล่น ไม่มีขายจาก NPC)')
    t = rep(t, '"ได้จาก Ligator ดรอปในขั้น Icarus Balloon หรือซื้อราคา 22,000 meso จาก <b>Cutthroat Manny</b> (ร้านอาวุธ Kerning City Self-Defence Item Store ซึ่งเป็นตึกในเมือง Kerning)", "<b>ถ้าร้านไม่มีขาย</b> ให้ลุ้น',
            '"ได้จาก Ligator ดรอปในขั้น Icarus Balloon หรือซื้อจากผู้เล่น (ไม่มีขายจาก NPC)", "<b>ไม่มีขายจาก NPC</b> ให้ลุ้น')
    t = rep(t, ' · ซื้อ 22,000 meso จาก <b>Cutthroat Manny</b> (Self-Defence Item Store, Kerning)"',
            ' · ไม่มีขายจาก NPC · ซื้อจากผู้เล่นได้"')
    t = rep(t, '"22,000 meso จาก <b>Cutthroat Manny</b> (Self-Defence Item Store, Kerning) ถ้าร้านไม่มี หาใน Free Market"',
            '"ไม่มีขายจาก NPC · ซื้อขายกับผู้เล่นได้ ถ้าร้านไม่มี หาใน Free Market"')
    t = rep(t, 'ซื้อแค่ 2 เล่ม (Forked Dagger, Reef Claw) รวมราว 37,000 meso',
            'เตรียมงบซื้อ Forked Dagger ส่วน Reef Claw ไม่มีขายจาก NPC ต้องดรอปจาก Ligator หรือซื้อจากผู้เล่น')
    # owner's skill descriptions
    t = rep(t, '["Double Stab", "แทงมอนสองครั้งติดกันในการกดครั้งเดียว เป็นท่าโจมตีหลักตั้งแต่เลเวล 10 ไปจนถึงประมาณเลเวล 43", "ลงต่อเนื่องช่วงเลเวล 10 ถึง 17 จนเต็ม 20 แต้ม"]',
            '["Double Stab", "แทงมอนสองครั้งติดกันในการกดครั้งเดียว เป็นท่าโจมตีหลักช่วงแรก ใช้ต่อได้เมื่อฆ่ามอนครั้งเดียวเพื่อประหยัด MP", "ลงต่อเนื่องช่วงเลเวล 10 ถึง 17 จนเต็ม 20 แต้ม"]')
    t = rep(t, '"ลง 1 แต้มตอนเลเวล 30 แล้วลงต่อตั้งแต่เลเวล 48"]', '"Lv.32 ลง 1, Lv.45–46 ลงถึง 5 จากนั้น Lv.50–54 ลงจนเต็ม 20"]')
    t = rep(t, '"ลงต่อเนื่องช่วงเลเวล 31 ถึง 37 จนเต็ม 20 แต้ม"]', '"Lv.30–32 ลงถึง 5 แล้ว Lv.33–37 ลงจนเต็ม 20 ก่อนเริ่ม Savage Blow"]')
    t = rep(t, '["Savage Blow", "ฟันมอนรัวหลายครั้งในการกดครั้งเดียว เป็นสกิลที่แรงที่สุดของ Bandit เริ่มใช้แทน Double Stab ได้ตั้งแต่ลงไว้ 18 แต้ม", "ลงต่อเนื่องช่วงเลเวล 38 ถึง 47 จนเต็ม 30 แต้ม"]',
            '["Savage Blow", "ฟันมอนรัวหลายครั้งในการกดครั้งเดียว โจมตีหนึ่งตัว 4 / 5 / 6 ฮิตที่สกิล 1 / 11 / 21 ตามลำดับ เลือกใช้ตามจำนวนครั้งที่ฆ่ามอนและ MP", "Lv.38–44 ลงถึง 21 ได้ 6 ฮิต จากนั้น Lv.47–49 ลงจนเต็ม 30"]')
    # stale timing left over from the old skill order; Mastery-first plan gives 6 hits at Lv.44
    t = rep(t, 'ใช้ Savage Blow เป็นท่าหลักตั้งแต่ Lv.43', 'ใช้ Savage Blow เป็นท่าหลักตั้งแต่ Lv.44')
    t = rep(t, 'จนกว่า Savage Blow จะถึง 18 (เลเวล 43)', 'จนกว่า Savage Blow จะถึง 21 (เลเวล 44)')
    # owner's Sindit wording (intro)
    lines = t.split('\n')
    def swap(prefix, new):
        idx = [i for i, l in enumerate(lines) if l.startswith(prefix)]
        if len(idx) != 1:
            sys.exit(f'line prefix {prefix[:60]!r} found {len(idx)}')
        lines[idx[0]] = new
    swap('        <li><b>ทางที่ง่ายกว่า:</b>', '        <li><b>ทางที่ง่ายกว่า:</b> เล่นเป็นโจร<b>สายปาดาว</b>ไปก่อนตามแผน Sindit ในแท็บ Builds แล้วเปลี่ยนมาใช้มีดเมื่ออาวุธและ Savage Blow พร้อม แผนสกิลนี้ไม่ต้องรีเซ็ต แต่ต้องวางแผน AP และค่าอุปกรณ์</li>')
    swap('        "หลังเลเวล 50 จะได้สกิล Steal', '        "Steal เปิดได้เมื่อ Haste 5 แผนหลักลง 1 ที่ Lv.34 ขโมยสำเร็จแล้วได้บัฟ Attack Power 30 วินาที",')
    swap('    <p class="onote">Sindit คือวิธีเล่น', '    <p class="onote">Sindit เริ่มจากปาดาวด้วย Lucky Seven แล้วเปลี่ยนเป็น Bandit และใช้มีดเมื่อพร้อม สามารถจัด 61 SP ขั้นแรกโดยไม่ต้องรีเซ็ต ดูทางเลือกใน Builds; Route หลักยังเป็นมีดล้วน</p>')
    swap('         ["การรีเซ็ตสกิล"', '         ["การรีเซ็ตสกิล","ไม่ต้องรีเซ็ต","ไม่ต้องรีเซ็ตตามแผน Lucky Seven 20 / Nimble Body 15 / Keen Eyes 3 / Disorder 3 / Dark Sight 20"],')
    swap('         ["ความยากในการวางแผน"', '         ["ความยากในการวางแผน","เล่นแบบเดียวตลอด ไม่ต้องสลับ","วางแผนอุปกรณ์และจังหวะเปลี่ยนจาก Lucky Seven เป็น Savage Blow"]]')
    swap('    <h3 class="sub-h">ลำดับลงสกิลตามเลเวล</h3>', '    ${banditSkillOptionsHTML()}\n    <h3 class="sub-h">Timeline · Pure Dagger ถึง Lv.50</h3>')
    # owner's skill block goes right after the BUILD text block closes, before the Builds tab code
    k = [i for i, l in enumerate(lines) if l == '/* ---------- แท็บ Builds ---------- */']
    assert len(k) == 1
    j = k[0] - 1
    while lines[j].strip() == '':
        j -= 1
    assert lines[j] == '});', lines[j]
    lines.insert(j + 1, BANDIT_BLOCK)
    return '\n'.join(lines)


for g in sys.argv[1:]:
    t = open(f'/home/claude/out/{g}.html').read()
    t = common(t)
    if g == 'bandit':
        t = site_patch.bandit_patch(bandit(t))
    elif g == 'assassin':
        t = site_patch.assassin_patch(t)
    elif g == 'mage':
        t = site_patch.mage_patch(t)
    open(f'/home/claude/site/{g}.html', 'w').write(t)
    print(g, 'ok', len(t))
