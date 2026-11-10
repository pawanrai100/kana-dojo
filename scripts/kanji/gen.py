import json, re
r=json.load(open('new_kanji.json'))
tr={}
for f in ['tricks1.txt','tricks2.txt','tricks3.txt','tricks4.txt']:
    for line in open(f,encoding='utf-8'):
        line=line.rstrip('\n')
        if line: k,m,t=line.split('\t'); tr[k]=(m,t)
def esc(s): return json.dumps(s, ensure_ascii=False)
def gloss(g):
    g=re.sub(r'\s+',' ',g).strip()
    parts=[p.strip() for p in g.split(';')]
    out=parts[0]
    if len(parts)>1 and len(out)+len(parts[1])<40: out+=', '+parts[1]
    return out[:60]
lessons=[r[i:i+25] for i in range(0,len(r),25)]
L=['// the most used kanji after n5, ranked by how often they show up in',
'// newspapers (kanjidic frequency). readings and words come from jmdict,',
'// meanings and tricks are ours. regenerate with scripts/kanji, not by hand','',
'import type { Row } from "./data";','',
'export const COMMON_LESSONS: { id: number; name: string; blurb: string }[] = [']
for li,ls in enumerate(lessons):
    L.append(f'  {{ id: {10+li}, name: "Common set {li+1}", blurb: "Starts with {"、".join(x["k"] for x in ls[:4])} and more." }},')
L+=['];','','export const COMMON_RAW: Record<number, Row[]> = {']
for li,ls in enumerate(lessons):
    L.append(f'  {10+li}: [')
    for x in ls:
        m,t=tr[x['k']]
        L.append(f'    [{esc(x["k"])}, {esc("|".join(s.strip() for s in m.split(",")))}, {esc("|".join(x["on"]))}, {esc("|".join(x["kun"]))}, {esc(t)}],')
    L.append('  ],')
L+=['};','','// [word, reading, meaning]','export const COMMON_WORDS: [string, string, string][] = [']
for x in r:
    for w,rd,g in x['words']: L.append(f'  [{esc(w)}, {esc(rd)}, {esc(gloss(g))}],')
L.append('];')
open('../../src/lib/kanji/common.ts','w').write('\n'.join(L)+'\n')
