import { Check, ScrollText, Snowflake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import { todaysQuests } from "@/lib/progress/quests";
import { MAX_FREEZES, streakInfo } from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import { cn } from "@/lib/utils";

export function QuestsCard({ progress }: { progress: Progress }) {
  const quests = todaysQuests(progress);
  const done = quests.filter((q) => q.done).length;
  const { freezes } = streakInfo(progress);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-5 text-primary" aria-hidden /> Daily quests
          <span className="ml-auto text-sm font-extrabold text-muted">{done}/3</span>
        </CardTitle>
        <CardDescription>
          {done === 3 ? "All done for today, streak freeze earned. New quests tomorrow." : "Finish all 3 to earn a streak freeze. It saves your streak if you miss a day."}
        </CardDescription>
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-primary">
          <Snowflake className="size-3.5" aria-hidden /> {freezes} of {MAX_FREEZES} streak freezes saved up
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {quests.map(({ quest, have, done }) => (
            <li key={quest.id} className="flex items-center gap-3">
              <span
                className={cn("grid size-8 shrink-0 place-items-center rounded-full", done ? "bg-good text-white" : "bg-surface-2 text-muted")}
                aria-hidden
              >
                {done ? <Check className="size-4" /> : <ScrollText className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-bold", done && "text-muted line-through")}>{quest.label}</p>
                <ProgressBar value={have / quest.need} label={`${quest.label}: ${have} of ${quest.need}`} className="mt-1 h-2" barClassName={done ? "bg-good" : undefined} />
              </div>
              <span className="w-12 text-right text-xs font-bold tabular-nums text-muted">
                {have}/{quest.need}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
