import re,sys,base64,os
S='/tmp/claude-0/-home-claude/eb92408c-1c0c-508b-8f96-18ac41698fec/scratchpad/artifact-files/'
SRC={'bandit':S+'dafc0106-5b8c-46f7-a32b-5749939c5604','assassin':S+'cecbb446-2f94-4f6e-8c64-1f3705ddfb20','sindit':S+'cecbb446-2f94-4f6e-8c64-1f3705ddfb20','mage':S+'6b1135f8-8793-4bfa-843a-e78b7b1a9a49'}
MIME={'png':'image/png','gif':'image/gif','webp':'image/webp','jpg':'image/jpeg','svg':'image/svg+xml'}
RX=re.compile(r'''(?<![\w/.-])((i|g)/[\w.-]+\.(png|webp|gif|jpg|svg))''')
for g in sys.argv[1:]:
    t=open(f'/home/claude/site/{g}.html').read(); cache={}; miss=set()
    def rep(m):
        p,kind,ext=m.group(1),m.group(2),m.group(3)
        if p not in cache:
            f=(SRC[g] if kind=='i' else '/home/claude/out')+'/'+p
            if not os.path.exists(f): miss.add(p); return p
            cache[p]='data:%s;base64,%s'%(MIME[ext],base64.b64encode(open(f,'rb').read()).decode())
        return cache[p]
    o=RX.sub(rep,t)
    left=RX.findall(o)
    open(f'/home/claude/web/{g}.html','w').write(o)
    print(g,len(t),'->',len(o),'images',len(cache),'missing',sorted(miss),'left',len(left))
