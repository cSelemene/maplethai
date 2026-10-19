import json, sys, subprocess, os, base64, struct
sys.path.insert(0, '/home/claude/tools')
from mapdata import mapdata

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"

def pct(m, x, y):
    return [round((x + m['cx']) / m['w'] * 100, 1), round((y + m['cy']) / m['h'] * 100, 1)]

def hword(x):
    if x < 15: return "ซ้ายสุด"
    if x < 36: return "ซ้าย"
    if x < 64: return "กลาง"
    if x < 90: return "ขวา"
    return "ขวาสุด"

def vword(y):
    if y < 15: return "บนสุด"
    if y < 40: return "บน"
    if y < 56: return "กลาง"
    if y < 85: return "ล่าง"
    return "ล่างสุด"

def posword(p):
    h, v = hword(p[0]), vword(p[1])
    if h == "กลาง" and v == "กลาง": return "กลางแมพ"
    if h == "กลาง": return "กลางด้าน" + v
    return h + v

def move(m, a, b):
    if not a: return ""
    dxp = (b[0] - a[0]) / 100 * m['w']; dyp = (b[1] - a[1]) / 100 * m['h']
    parts = []
    if dxp > 150: parts.append("เดินไปทางขวา")
    elif dxp < -150: parts.append("เดินไปทางซ้าย")
    if dyp < -200: parts.append("ปีนเชือก/บันไดขึ้นไป")
    elif dyp > 200: parts.append("ลงไปชั้นล่าง")
    if not parts: return "อยู่ใกล้จุดที่เข้ามา"
    return " แล้ว".join(parts) if len(parts) == 1 else parts[0] + " แล้ว" + parts[1]

def walk(path):
    """path: list of map ids; returns NAV walk entries for each hop"""
    out = []
    maps = [mapdata(m) for m in path]
    for i in range(len(path) - 1):
        m = maps[i]; nxt = path[i + 1]
        po = [p for p in m['portals'] if p['toMapId'] == nxt]
        assert po, (m['name'], nxt)
        p = po[0]
        b = pct(m, p['x'], p['y'])
        a = None
        if i > 0:
            back = [q for q in m['portals'] if q['toMapId'] == path[i - 1]]
            if back: a = pct(m, back[0]['x'], back[0]['y'])
        kind = "เข้าวงวาร์ป" if p['type'] == 2 else "เข้าประตู (ไม่มีวงแสง)"
        mv = move(m, a, b)
        t = f"<b>{m['name']}</b>: ไปทาง <b>{posword(b)}</b> ของแมพ" + (f" ({mv} จากจุดที่เข้ามา)" if mv else "") + f" → {kind} กด ↑ → <b>{maps[i+1]['name']}</b>"
        e = {"k": "walk", "t": t, "m": path[i], "b": b}
        if a: e["a"] = a
        out.append(e)
    return out

def npc(mid, name, extra=""):
    m = mapdata(mid)
    n = [x for x in m['npcs'] if x['displayName'] == name][0]
    p = pct(m, n['x'], n['y'])
    return {"k": "npc", "t": f"<b>{name}</b> อยู่ใน <b>{m['name']}</b> {posword(p)}" + extra, "m": mid, "b": p}

def minimap(mid, outdir):
    os.makedirs(outdir, exist_ok=True)
    f = os.path.join(outdir, f"{mid}.png")
    if not os.path.exists(f):
        r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, f'https://meowdb.com/msclassic/maps/minimaps/{mid}.png'], capture_output=True)
        open(f, 'wb').write(r.stdout)
    d = open(f, 'rb').read()
    assert d[:4] == b'\x89PNG', (mid, d[:40])
    w, h = struct.unpack('>II', d[16:24])
    return f, w, h

if __name__ == '__main__':
    print(json.dumps(walk(sys.argv[1:]), ensure_ascii=False, indent=1))
