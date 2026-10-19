import sys, collections
sys.path.insert(0,'/home/claude/tools')
from mapdata import mapdata
def bfs(src, dst, maxn=400):
    q=collections.deque([[src]]); seen={src}
    while q:
        p=q.popleft(); m=mapdata(p[-1])
        if not m: continue
        for po in m['portals']:
            t=po['toMapId']
            if not t or t in seen or t.startswith('99'): continue
            if t==dst: return p+[t]
            seen.add(t)
            if len(seen)>maxn: return None
            q.append(p+[t])
for a,b in [s.split(':') for s in sys.argv[1:]]:
    p=bfs(a,b); print(a,'->',b, p, [mapdata(x)['name'] for x in p] if p else None)
