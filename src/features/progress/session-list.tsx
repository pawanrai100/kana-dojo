import type { SessionLog } from "@/lib/progress/types";

const MODE_LABEL = { mixed: "Mixed", words: "Real words", random: "Random combos" } as const;

function when(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? `Today, ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

export function SessionList({ sessions, empty }: { sessions: SessionLog[]; empty: string }) {
  if (sessions.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {sessions.map((s) => {
        const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
        return (
          <li key={s.id} className="flex items-center gap-4 py-3">
            <div
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-sm font-extrabold text-primary"
              aria-label={`${acc}% accuracy`}
            >
              {acc}%
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{when(s.endedAt)}</p>
              <p className="text-xs text-muted">
                {MODE_LABEL[s.mode]}, {s.rounds} round{s.rounds === 1 ? "" : "s"}, {s.correct}/{s.answered} correct
              </p>
            </div>
            <div className="text-right text-xs text-muted">
              <p className="font-extrabold text-primary">+{s.xp} XP</p>
              {s.bestCombo > 1 && <p>combo ×{s.bestCombo}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
