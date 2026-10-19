import json,subprocess,sys
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
def get(u):
    return subprocess.run(['curl','-sS','-m','60','-A',UA,'-H','Accept: application/json',u],capture_output=True,text=True).stdout
allit=[]
for p in range(1,20):
    d=json.loads(get(f'https://meowdb.com/msclassic/api/items?category=equipment&limit=500&page={p}'))
    its=d.get('items',[]); allit+=its
    print(p,len(its),{k:v for k,v in d.items() if k!='items'})
    if len(its)<500: break
json.dump(allit,open('/home/claude/dl/equip.json','w'))
from collections import Counter
print(Counter(i['subtype'] for i in allit))
