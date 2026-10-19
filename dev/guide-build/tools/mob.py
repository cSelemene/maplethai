import re,json,sys,subprocess
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
out={}
for mid in sys.argv[1:]:
    h=subprocess.run(['curl','-sS','-m','40','-A',UA,f'https://meowdb.com/msclassic/monsters/{mid}'],capture_output=True,text=True).stdout
    chunks=re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)',h,re.S)
    t=''.join(json.loads('"'+c+'"') for c in chunks)
    open(f'/home/claude/dl/m{mid}.rsc','w').write(t)
    strs=re.findall(r'"children":"([^"]{1,120})"',t)
    i=t.find('"locations":[')
    locs=json.JSONDecoder().raw_decode(t[i+12:])[0] if i>=0 else []
    def after(k,n=1):
        try: i=strs.index(k); return strs[i+1:i+1+n]
        except: return None
    drops=[]
    for mm in re.finditer(r'"children":"([^"]+)"\}\]\]\}\]\}\],\["\$","td",null,\{"className":"text-right[^}]*\},?"children":\[\["\$","a",null,\{[^}]*"children":"([^"]+)"',t):
        drops.append((mm.group(1),mm.group(2)))
    out[mid]={'strs':strs[strs.index('Monster Database'):strs.index('Monster Database')+120] if 'Monster Database' in strs else strs[:150],'locs':[(l['mapName'],l['mapId'],l['count'],l['mapTotal'],l['mapTypes']) for l in locs],'drops':drops}
json.dump(out,open('/home/claude/dl/mobpages.json','w'),ensure_ascii=False)
for k,v in out.items():
    print('=====',k); print(v['strs'][:70]); print('LOCS',v['locs'][:12]); print('DROPS',v['drops'][:30])
