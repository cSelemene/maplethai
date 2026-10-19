"""Build item records (same shape as BUILD.items) for gear the guides did not list yet.
Stats come from the MeowDB item list, icons from the MeowDB icon API (embedded as data URIs)."""
import json, subprocess, base64
d = json.load(open('/home/claude/dl/equip_live.json'))
by = {x['name']: x for x in d}
KERN = {"npc": "Don Hwang", "town": "Kerning City", "map": "Victoria Road: Kerning City Self-Defence Item Store"}
NEW = {
  'Black Pao Bottoms': dict(shop=dict(KERN, price=4800), k=['buy'], src='', note='LUK +2 คู่กับ Black Pao ซื้อได้ตั้งแต่เลเวล 20'),
  'Black Loosecap':    dict(shop=dict(KERN, price=3600), k=['buy'], src='', note='หมวก LUK +2 ราคาถูก ใส่แทน Black Thief Hood ได้ตั้งแต่เลเวล 20'),
  'Dark Sneak':        dict(shop=dict(KERN, price=7500), k=['buy'], src='', note='เสื้อโจร LUK +2 ชุดสุดท้ายที่ร้าน NPC มีขาย ชุดเลเวล 30 ขึ้นไปต้องดรอปเท่านั้น'),
  'Dark Sneak Pants':  dict(shop=dict(KERN, price=6000), k=['buy'], src='', note='กางเกงโจร LUK +2 คู่กับ Dark Sneak ใช้ได้ยาวจนกว่าจะได้ Knucklevest'),
  'Dark Tiberian':     dict(shop=dict(KERN, price=4500), k=['buy'], src='', note='หมวก LUK +2 จากร้าน ถ้าไม่อยากใช้ Brown Bamboo Hat ที่ไม่มี LUK'),
  'Yellow Baseball Cap': dict(shop={"npc": "Sam", "town": "Henesys", "map": "Victoria Road: Henesys Weapon Store", "price": 3900}, k=['buy'], src='', note='หมวกอาชีพไหนก็ใส่ได้ LUK +2 ไม่ต้องมี DEX เป็นของที่บิลด์ Dexless นิยมใช้'),
}
out = {}
for n, extra in NEW.items():
    x = by[n]
    st = json.loads(x['stats']) if isinstance(x['stats'], str) else dict(x['stats'])
    st.pop('price', None)
    icon = subprocess.run(['curl', '-sS', '-m', '60', '-A', 'Mozilla/5.0', f"https://meowdb.com/msclassic/api/assets/icons/{x['iconKey']}"], capture_output=True).stdout
    assert icon[:4] == b'\x89PNG', n
    out[n] = {"shop": extra['shop'], "nshop": 1 if extra['shop'] else 0, "id": x['id'], "sub": x['subtype'], "lv": x['levelReq'], "st": st,
              "spd": None, "ic": 'data:image/png;base64,' + base64.b64encode(icon).decode(), "k": extra['k'], "src": extra['src'], "note": extra['note']}
json.dump(out, open('/home/claude/build/newitems.json', 'w'), ensure_ascii=False)
print({k: (v['lv'], v['st']) for k, v in out.items()})
