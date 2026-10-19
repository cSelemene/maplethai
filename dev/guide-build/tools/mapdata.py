import re,json,subprocess,os,sys
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
def mapdata(mid):
    f=f'/home/claude/dl/map{mid}.rsc'
    if not os.path.exists(f) or os.path.getsize(f)<1000:
        h=subprocess.run(['curl','-sS','-m','60','-A',UA,f'https://meowdb.com/msclassic/maps/{mid}'],capture_output=True,text=True).stdout
        chunks=re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)',h,re.S)
        open(f,'w').write(''.join(json.loads('"'+c+'"') for c in chunks))
    t=open(f).read()
    i=t.find('"portals":[')
    if i<0: return None
    # find enclosing object start: search backwards for '{"' that begins map obj containing "portals"
    j=t.rfind('"mapId":"'+mid+'"',0,i)
    portals=json.JSONDecoder().raw_decode(t[i+10:])[0]
    tail=t[i:i+60000]
    g=lambda k: (re.search(r'"%s":(-?[\d\.]+)'%k,tail) or [None,None])[1]
    name=re.search(r'"id":"'+mid+r'","name":"([^"]+)"',t) or re.search(r'"children":"([^"]+) - MapleStory Classic',t)
    npcs=[]
    k=t.find('"placedNpcs":')
    if k>0:
        try: npcs=json.JSONDecoder().raw_decode(t[k+13:])[0]
        except: pass
    return {'id':mid,'name':name.group(1) if name else None,'portals':portals,'w':float(g('minimapWidth') or 0),'h':float(g('minimapHeight') or 0),'cx':float(g('miniMapCenterX') or 0),'cy':float(g('miniMapCenterY') or 0),'npcs':npcs}
if __name__=='__main__':
    for m in sys.argv[1:]:
        d=mapdata(m); print(json.dumps(d,ensure_ascii=False)[:1500])
