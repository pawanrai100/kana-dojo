# pulls the top kanji + common words out of jamdict-data's jamdict.db
# (pip download jamdict-data, unzip the .xz). run from this folder with the db next to it.
# n5.json = the n5 kanji list, n5_full.json = {"kanji": [...], "words": [...]} for the n5 lessons
# (dump them from src/lib/kanji/data.ts with tsx). then: extract.py, pick.py, gen.py
# meanings and tricks live in tricks*.txt (kanji, meanings, trick, tab separated)
import sqlite3, json, re, collections

c = sqlite3.connect("jamdict.db")
n5 = json.load(open("n5.json"))  # list of the n5 kanji already in data.ts
rows = c.execute("select ID, literal, freq from character where freq != '' order by cast(freq as integer)").fetchall()
new = [r for r in rows if r[1] not in n5][: 500 - len(n5)]
allset = set(n5) | {r[1] for r in new}

out = []
for cid, lit, freq in new:
    rd = c.execute("select r.r_type, r.value from reading r join rm_group g on r.gid=g.ID where g.cid=?", (cid,)).fetchall()
    mn = [m for (m,) in c.execute("select m.value from meaning m join rm_group g on m.gid=g.ID where g.cid=? and (m.m_lang='' or m.m_lang='en' or m.m_lang is null)", (cid,))]
    out.append(dict(k=lit, freq=int(freq), on=[v for t, v in rd if t == "ja_on"], kun=[v for t, v in rd if t == "ja_kun"], meanings=mn))
json.dump(out, open("new_kanji_raw.json", "w"), ensure_ascii=False)

# common words (ichi1/news1/spec) written only with kanji from the 500
han = re.compile(r"[一-鿿々]")
okkana = re.compile(r"^[ぁ-んァ-ンー]+$")
pri = collections.defaultdict(list)
for kid, t in c.execute("select kid,text from KJP"):
    pri[kid].append(t)
words = []
for kid, idseq, text in c.execute("select ID,idseq,text from Kanji"):
    p = pri.get(kid, [])
    if not any(x in ("ichi1", "news1", "spec1", "spec2") for x in p):
        continue
    hs = han.findall(text)
    if not hs or any(h not in allset for h in hs):
        continue
    rest = han.sub("", text)
    if rest and not okkana.match(rest):
        continue
    nf = min([int(x[2:]) for x in p if x.startswith("nf")] or [60])
    score = nf - (10 if "ichi1" in p else 0) - (5 if "spec1" in p else 0)
    kanas = c.execute("select ID,text,nokanji from Kana where idseq=? order by ID", (idseq,)).fetchall()
    rd = None
    for knid, kt, nok in kanas:
        if nok:
            continue
        restr = [r for (r,) in c.execute("select text from KNR where kid=?", (knid,))]
        if restr and text not in restr:
            continue
        rd = kt
        break
    if not rd or not re.match(r"^[ぁ-んー]+$", rd):
        continue
    sid = c.execute("select ID from Sense where idseq=? order by ID limit 1", (idseq,)).fetchone()[0]
    gl = [g for (g,) in c.execute("select text from SenseGloss where sid=? and (lang='eng' or lang is null or lang='')", (sid,))]
    pos = [x for (x,) in c.execute("select text from pos where sid=?", (sid,))]
    misc = [m for (m,) in c.execute("select text from misc where sid=?", (sid,))]
    words.append(dict(w=text, r=rd, g=gl[:3], score=score, pos=pos, misc=misc))
json.dump(words, open("common_words.json", "w"), ensure_ascii=False)
