import { describe, expect, it } from "vitest";
import { toRomaji } from "@/lib/kana/hiragana";
import { gradeRound } from "@/lib/quiz/grade";
import type { AnswerState, Question, Round } from "@/lib/quiz/types";
import { emptyProgress, type Progress } from "@/lib/progress/types";
import { applyGradedRound } from "@/lib/progress/update";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings/types";
import { SyncEngine } from "./engine";
import { hasProgress, mergeDiverged, mergeGuestInto } from "./merge";
import type { CloudRepo, CloudRow, LocalSide, SyncMeta } from "./types";

const DAY = 86_400_000;
let n = 0;

function q(kana: string): Question {
  return { id: kana + n, kind: "word", kana, romaji: toRomaji(kana), chars: Array.from(kana), wordId: kana, meaning: "x", difficulty: "easy", timeLimitSec: 10 };
}
const a = (v: string): AnswerState => ({ value: v, locked: true, timedOut: false, timeUsedMs: 1000 });

function play(p: Progress, pairs: [string, string][], at: number): Progress {
  const round: Round = { id: `r${n++}`, createdAt: at, mode: "words", questions: pairs.map(([k]) => q(k)) };
  return applyGradedRound(p, gradeRound(round, pairs.map(([, x]) => a(x)), { durationMs: 1000 }), p.gen, at);
}

const T0 = new Date(2026, 9, 10, 12).getTime();

describe("mergeGuestInto", () => {
  it("adds separate histories without losing anything", () => {
    const account = play(emptyProgress(), [["ねこ", "neko"], ["いぬ", "inu"]], T0);
    const guest = play(play(emptyProgress(), [["ねこ", "nako"]], T0 + 1000), [["やま", "yama"]], T0 + DAY);
    const m = mergeGuestInto(account, guest);
    expect(m.totalAnswered).toBe(4);
    expect(m.totalCorrect).toBe(3);
    expect(m.roundsCompleted).toBe(3);
    expect(m.xp).toBe(account.xp + guest.xp);
    expect(m.chars["ね"].seen).toBe(2);
    expect(m.chars["ね"].correct).toBe(1);
    expect(m.words["ねこ"].seen).toBe(2);
    expect(Object.keys(m.days)).toHaveLength(2);
    expect(m.sessions.length).toBe(account.sessions.length + guest.sessions.length);
  });

  it("is a no-op with an empty guest", () => {
    const account = play(emptyProgress(), [["ねこ", "neko"]], T0);
    expect(mergeGuestInto(account, emptyProgress())).toMatchObject({ totalAnswered: 1, xp: account.xp });
    expect(hasProgress(emptyProgress())).toBe(false);
    expect(hasProgress(account)).toBe(true);
  });
});

describe("mergeDiverged", () => {
  it("never double counts shared history", () => {
    const base = play(emptyProgress(), [["ねこ", "neko"]], T0);
    const phone = play(base, [["いぬ", "inu"]], T0 + DAY);
    const laptop = play(base, [["やま", "yama"], ["そら", "sora"]], T0 + 2 * DAY);
    const m = mergeDiverged(phone, laptop);
    expect(m.totalAnswered).toBe(4); // 1 shared + 1 phone + 2 laptop
    expect(m.roundsCompleted).toBe(3);
    expect(m.chars["ね"].seen).toBe(1);
    expect(m.chars["い"].seen).toBe(1);
    expect(m.chars["や"].seen).toBe(1);
    expect(Object.keys(m.days).length).toBe(3);
    // merging again changes nothing
    expect(mergeDiverged(m, laptop).totalAnswered).toBe(4);
    expect(mergeDiverged(m, m)).toEqual({ ...m, gen: m.gen });
  });
});

// in memory stand-in that follows the same rev rules as the sql table
function fakeCloud() {
  let row: (CloudRow & { rev: number }) | null = null;
  let writes = 0;
  let failNext = 0;
  const repo: CloudRepo = {
    async fetch() {
      if (failNext > 0) {
        failNext--;
        throw new Error("network down");
      }
      return row ? structuredClone(row) : null;
    },
    async insert(progress, settings) {
      if (row) return { ok: false, conflict: true };
      row = { progress: structuredClone(progress), settings: structuredClone(settings), rev: 1 };
      writes++;
      return { ok: true, rev: 1 };
    },
    async update(progress, settings, expected) {
      if (!row || row.rev !== expected) return { ok: false, conflict: true };
      row = { progress: structuredClone(progress), settings: structuredClone(settings), rev: expected + 1 };
      writes++;
      return { ok: true, rev: row.rev };
    },
  };
  return {
    repo,
    get row() {
      return row;
    },
    get writes() {
      return writes;
    },
    fail(times: number) {
      failNext = times;
    },
  };
}

function fakeDevice(progress = emptyProgress(), settings: Settings = DEFAULT_SETTINGS) {
  let state = { progress, settings };
  let meta: SyncMeta = { rev: null, dirty: false };
  let v = 0;
  const side: LocalSide = {
    read: () => state,
    meta: () => meta,
    setMeta: (m) => (meta = m),
    applyRemote: (p, s) => (state = { progress: p, settings: s }),
    version: () => v,
  };
  return {
    side,
    get state() {
      return state;
    },
    get meta() {
      return meta;
    },
    edit(fn: (p: Progress) => Progress, s?: Partial<Settings>) {
      state = { progress: fn(state.progress), settings: { ...state.settings, ...s } };
      meta = { ...meta, dirty: true };
      v++;
    },
  };
}

describe("SyncEngine", () => {
  it("creates the cloud row on first sync and pulls it on a second device", async () => {
    const cloud = fakeCloud();
    const laptop = fakeDevice();
    laptop.edit((p) => play(p, [["ねこ", "neko"]], T0), { theme: "dark" });
    await new SyncEngine(cloud.repo, laptop.side).sync();
    expect(cloud.row?.rev).toBe(1);
    expect(laptop.meta).toEqual({ rev: 1, dirty: false });

    const phone = fakeDevice();
    const eng = new SyncEngine(cloud.repo, phone.side);
    await eng.sync();
    expect(phone.state.progress.totalAnswered).toBe(1);
    expect(phone.state.settings.theme).toBe("dark");
    expect(eng.status).toBe("synced");
  });

  it("merges when two devices changed while offline, nothing lost or doubled", async () => {
    const cloud = fakeCloud();
    const laptop = fakeDevice();
    laptop.edit((p) => play(p, [["ねこ", "neko"]], T0));
    const le = new SyncEngine(cloud.repo, laptop.side);
    await le.sync();

    const phone = fakeDevice();
    const pe = new SyncEngine(cloud.repo, phone.side);
    await pe.sync();

    // both play offline
    laptop.edit((p) => play(p, [["やま", "yama"], ["そら", "sora"]], T0 + DAY));
    phone.edit((p) => play(p, [["いぬ", "inu"]], T0 + 2 * DAY));

    await pe.sync();
    await le.sync(); // laptop is now behind: must merge, not overwrite
    await pe.sync(); // phone picks up the merged copy

    for (const d of [laptop, phone]) {
      expect(d.state.progress.totalAnswered).toBe(4);
      expect(d.state.progress.roundsCompleted).toBe(3);
      expect(d.meta.dirty).toBe(false);
    }
    expect(cloud.row?.rev).toBe(laptop.meta.rev);
  });

  it("does nothing when already in sync", async () => {
    const cloud = fakeCloud();
    const dev = fakeDevice();
    const e = new SyncEngine(cloud.repo, dev.side);
    await e.sync();
    const writes = cloud.writes;
    await e.sync();
    await e.sync();
    expect(cloud.writes).toBe(writes);
  });

  it("keeps local data when the network fails and retries later", async () => {
    const cloud = fakeCloud();
    const dev = fakeDevice();
    dev.edit((p) => play(p, [["ねこ", "neko"]], T0));
    cloud.fail(1);
    const e = new SyncEngine(cloud.repo, dev.side, { isOnline: () => true });
    await e.sync();
    expect(e.status).toBe("error");
    expect(dev.meta.dirty).toBe(true);
    expect(dev.state.progress.totalAnswered).toBe(1);
    await e.sync();
    expect(e.status).toBe("synced");
    expect(cloud.row).not.toBeNull();
    e.stop();
  });

  it("reports offline without touching anything", async () => {
    const cloud = fakeCloud();
    const dev = fakeDevice();
    dev.edit((p) => play(p, [["ねこ", "neko"]], T0));
    const e = new SyncEngine(cloud.repo, dev.side, { isOnline: () => false });
    await e.sync();
    expect(e.status).toBe("offline");
    expect(cloud.writes).toBe(0);
    expect(dev.meta.dirty).toBe(true);
  });

  it("treats junk in the cloud row safely", async () => {
    const cloud = fakeCloud();
    await cloud.repo.insert({ totalAnswered: "lots" } as unknown as Progress, { theme: 7 } as unknown as Settings);
    const dev = fakeDevice();
    await new SyncEngine(cloud.repo, dev.side).sync();
    expect(dev.state.progress.totalAnswered).toBe(0);
    expect(dev.state.settings.theme).toBe("system");
  });
});
