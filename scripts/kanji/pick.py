import json, re
raw=json.load(open('new_kanji_raw.json'))
words=json.load(open('common_words.json'))
old=json.load(open("n5_full.json"))
n5={k['k'] for k in old['kanji']}
rank={o['k']:i for i,o in enumerate(raw)}
oldwords={w['word'] for w in old['words']}
bad=('word usually written using kana alone','archaism','rare','vulgar','obsolete','derogatory','sensitive','obscure','abbreviation','yojijukugo','proverb')
han=re.compile(r'[一-鿿]')
words=[w for w in words if not any(p.startswith(('suffix','prefix','counter','expressions','conjunction','auxiliary')) for p in w['pos']) and not any(b in m for m in w['misc'] for b in bad) and '々' not in w['w'] and w['g']]
def h2k(s): return ''.join(chr(ord(ch)-0x60) if 'ァ'<=ch<='ン' else ch for ch in s)
def score(w,k):
    hs=han.findall(w['w'])
    others=[h for h in hs if h!=k]
    # easier if the other kanji are n5 or come earlier in the list
    hard=sum(0 if h in n5 else (1 if rank.get(h,999)<rank[k] else 2) for h in others)
    s=min(w['score'],50) + 12*hard + 3*len(w['w'])
    if len(hs)==1 and len(w['w'])>1: s-=25   # 同じ, 送る
    if len(w['w'])==1: s+=10
    return s
used=set(oldwords); picked={}
for o in raw:
    k=o['k']
    cands=sorted([w for w in words if k in w['w'] and len(w['w'])<=4], key=lambda w:score(w,k))
    sel=[]
    for w in cands:
        if w['w'] in used: continue
        if any(w['r']==x['r'] for x in sel): continue
        sel.append(w); used.add(w['w'])
        if len(sel)==3: break
    picked[k]=sel
def on_used(on, rs):
    hi=h2k(on); alts={hi}
    if len(hi)>=2 and hi[-1] in 'くつきち': alts.add(hi[:-1]+'っ')
    tr=str.maketrans('かきくけこさしすせそたちつてとはひふへほ','がぎぐげござじずぜぞだぢづでどばびぶべぼ')
    alts.add(hi.translate(tr)); alts.add(hi[0].translate(str.maketrans('はひふへほ','ぱぴぷぺぽ'))+hi[1:])
    return any(a in r for a in alts for r in rs)
res=[]
for o in raw:
    k=o['k']; rs=[w['r'] for w in words if k in w['w']]
    on=[r for r in o['on'] if on_used(r, rs)][:3] or o['on'][:1]
    kun=[r for r in o['kun'] if not r.startswith('-') and not r.endswith('-') and any(r.replace('.','') in x for x in rs)][:3]
    res.append(dict(k=k, m=o['meanings'][:4], on=on, kun=kun, freq=o['freq'], words=[[w['w'],w['r'],'; '.join(w['g'][:2])] for w in picked[k]]))
json.dump(res,open('new_kanji.json','w'),ensure_ascii=False)
