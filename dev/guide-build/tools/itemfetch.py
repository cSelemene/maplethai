import json,re,subprocess,sys,base64,os
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
A=json.load(open('/home/claude/dl/equip.json'))
byname={}
for i in A:
    byname.setdefault(i['name'],[]).append(i)
cache_p='/home/claude/dl/itemcache.json'
cache=json.load(open(cache_p)) if os.path.exists(cache_p) else {}
def curl(u,binary=False):
    r=subprocess.run(['curl','-sS','-m','60','-A',UA,u],capture_output=True)
    return r.stdout if binary else r.stdout.decode('utf8','replace')
def rsc(html):
    chunks=re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)',html,re.S)
    return ''.join(json.loads('"'+c+'"') for c in chunks)
def shops(t):
    i=t.find('"Where to buy"')
    if i<0: return []
    seg=t[i:i+40000]
    end=seg.find('\n',100)
    out=[]
    for li in re.finditer(r'\["\$","li","\d+",\{.*?"Launch prices"|\["\$","li","\d+",\{.*?prices"',seg,re.S):
        pass
    # split by li entries
    parts=re.split(r'\["\$","li","\d+",',seg)[1:]
    for p in parts:
        npc=re.search(r'"href":"/msclassic/npcs/\d+","className":"[^"]*","children":"([^"]+)"',p)
        mp=re.search(r'"href":"/msclassic/maps/\d+","className":"[^"]*","children":"([^"]+)"',p)
        town=re.search(r'"children":\[" · ","([^"]+)"\]',p)
        price=re.search(r'"font-mono text-maple-text","children":"([\d,]+)"',p)
        launch='Launch prices' in p and 'Not open in this release' not in p
        if npc and price:
            out.append({'npc':npc.group(1),'town':town.group(1) if town else '','map':mp.group(1) if mp else '','price':int(price.group(1).replace(',','')),'launch':launch})
        if '"Not open' in p: pass
    return out
def fetch(name):
    if name in cache: return cache[name]
    c=byname.get(name)
    if not c: print('NOT FOUND',name,file=sys.stderr); return None
    it=sorted(c,key=lambda x:x['id'])[0]
    st=json.loads(it['stats']) if isinstance(it['stats'],str) else it['stats']
    h=curl(f"https://meowdb.com/msclassic/item-db/{it['id']}")
    t=rsc(h)
    sh=[s for s in shops(t) if s['launch']]
    sh.sort(key=lambda s:s['price'])
    spd=st.get('attackSpeedName')
    icon=curl(f"https://meowdb.com/msclassic/api/assets/icons/{it['iconKey']}",binary=True)
    mime='image/png' if icon[:4]==b'\x89PNG' else ('image/gif' if icon[:3]==b'GIF' else 'image/webp')
    d={'id':it['id'],'sub':it['subtype'],'lv':it.get('levelReq') or 0,'st':{k:v for k,v in st.items() if k not in('price','attackSpeedName')},'spd':spd,
       'shop':({'npc':sh[0]['npc'],'town':sh[0]['town'],'map':sh[0]['map'],'price':sh[0]['price']} if sh else None),'nshop':len(sh),
       'ic':'data:%s;base64,%s'%(mime,base64.b64encode(icon).decode()),'sources':it.get('sources')}
    cache[name]=d
    json.dump(cache,open(cache_p,'w'))
    return d
if __name__=='__main__':
    for n in sys.argv[1:]:
        d=fetch(n)
        if d: print(n,d['id'],d['sub'],'L',d['lv'],d['st'],d['spd'],d['shop'],d['nshop'],d['sources'],len(d['ic']))
