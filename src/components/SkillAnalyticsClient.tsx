"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Headphones,
  MessageCircle,
  PenLine,
  Pencil,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BandProgressChart from "@/components/BandProgressChart";
import ScoreEntryDialog from "@/components/ScoreEntryDialog";
import { SetRankingCard, type SetSummary } from "@/components/analytics/AnalyticsCards";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { SKILLS, goalTargetForSkill, type GoalsInput, type Skill } from "@/lib/domain";

type SessionLogSort = "date" | "set";

interface AttemptData {
  id: string;
  skill: Skill;
  date: string;
  bandScore: number;
  rawScore: number | null;
  notes: string | null;
  duration: number | null;
  practiceSetId: string | null;
  bookTitle?: string;
  bookNumber?: number;
  testNumber?: number;
}

interface SkillPoint {
  index: number;
  dateStr: string;
  fullDate: string;
  band: number;
}

interface EditAttempt {
  id: string;
  skill: Skill;
  date: string;
  rawScore: number | null;
  bandScore: number;
  duration: number | null;
  notes: string | null;
  practiceSetId: string | null;
}

interface ScoreSnapshot {
  skill: Skill;
  date: string;
  bandScore: number;
}

interface SkillAnalyticsClientProps {
  skill: Skill;
  attempts: AttemptData[];
  goals: GoalsInput;
  bestSets: SetSummary[];
  worstSets: SetSummary[];
  skillProgress: SkillPoint[];
  allAttempts: ScoreSnapshot[];
}

const SKILL_ICONS: Record<Skill, typeof Headphones> = {
  Listening: Headphones,
  Reading: BookOpen,
  Writing: PenLine,
  Speaking: MessageCircle,
};

function roundHalf(n: number) {
  return Math.round(n * 2) / 2;
}

function formatDelta(delta: number | null) {
  if (delta === null) return null;
  if (delta === 0) return "Steady";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
}

/** Cambridge book numbers first; custom/unknown sets after; missing sets last. */
function setSortKey(attempt: AttemptData): [number, number, string] {
  if (!attempt.practiceSetId) {
    return [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, ""];
  }
  const bookNumber =
    attempt.bookNumber != null && attempt.bookNumber > 0
      ? attempt.bookNumber
      : Number.MAX_SAFE_INTEGER;
  const testNumber = attempt.testNumber ?? Number.MAX_SAFE_INTEGER;
  return [bookNumber, testNumber, attempt.bookTitle ?? ""];
}

function compareAttemptsBySet(a: AttemptData, b: AttemptData) {
  const [bookA, testA, titleA] = setSortKey(a);
  const [bookB, testB, titleB] = setSortKey(b);
  if (bookA !== bookB) return bookA - bookB;
  if (testA !== testB) return testA - testB;
  const titleCmp = titleA.localeCompare(titleB);
  if (titleCmp !== 0) return titleCmp;
  return b.date.localeCompare(a.date);
}

function getSkillStats(points: SkillPoint[], target: number) {
  const count = points.length;
  const sum = points.reduce((acc, p) => acc + p.band, 0);
  const average = count > 0 ? roundHalf(sum / count) : 0;
  const latest = count > 0 ? points[points.length - 1].band : 0;
  const first = count > 0 ? points[0].band : 0;
  const trend = count >= 2 ? latest - first : null;
  const gap = target - latest;

  return {
    average,
    latest,
    count,
    target,
    gap,
    trend,
    isTargetMet: latest >= target && count > 0,
  };
}

export default function SkillAnalyticsClient({
  skill,
  attempts,
  goals,
  bestSets,
  worstSets,
  skillProgress,
  allAttempts,
}: SkillAnalyticsClientProps) {
  const { deleteAttempt } = useLocalStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAttempt, setEditAttempt] = useState<EditAttempt | null>(null);
  const [sessionLogSort, setSessionLogSort] = useState<SessionLogSort>("date");

  const Icon = SKILL_ICONS[skill];
  const target = goalTargetForSkill(goals, skill);
  const stats = getSkillStats(skillProgress, target);

  const chartData = skillProgress.map((p) => ({
    index: p.index,
    dateStr: p.dateStr,
    fullDate: p.fullDate,
    value: p.band,
  }));

  const sortedAttempts = useMemo(() => {
    if (sessionLogSort === "date") {
      return [...attempts].sort((a, b) => b.date.localeCompare(a.date));
    }
    return [...attempts].sort(compareAttemptsBySet);
  }, [attempts, sessionLogSort]);

  const sessionLogSubtitle =
    sessionLogSort === "date"
      ? `All ${skill.toLowerCase()} sessions, newest first`
      : `All ${skill.toLowerCase()} sessions, by practice set`;

  const bestSetsBySkill = useMemo(() => {
    const bySkill = Object.fromEntries(SKILLS.map((s) => [s, [] as SetSummary[]])) as Record<Skill, SetSummary[]>;
    bySkill[skill] = bestSets;
    return bySkill;
  }, [skill, bestSets]);
  const worstSetsBySkill = useMemo(() => {
    const bySkill = Object.fromEntries(SKILLS.map((s) => [s, [] as SetSummary[]])) as Record<Skill, SetSummary[]>;
    bySkill[skill] = worstSets;
    return bySkill;
  }, [skill, worstSets]);

  const currentScores = useMemo(() => {
    const latestBySkill = new Map<Skill, { date: string; band: number }>();
    for (const a of allAttempts) {
      const prev = latestBySkill.get(a.skill);
      if (!prev || a.date > prev.date) {
        latestBySkill.set(a.skill, { date: a.date, band: a.bandScore });
      }
    }
    const pick = (s: Skill) => latestBySkill.get(s)?.band ?? null;
    return {
      listening: pick("Listening"),
      reading: pick("Reading"),
      writing: pick("Writing"),
      speaking: pick("Speaking"),
    };
  }, [allAttempts]);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditAttempt(null);
  };

  const handleEditAttemptClick = (attempt: AttemptData) => {
    setEditAttempt({
      id: attempt.id,
      skill: attempt.skill,
      date: attempt.date,
      rawScore: attempt.rawScore,
      bandScore: attempt.bandScore,
      duration: attempt.duration,
      notes: attempt.notes,
      practiceSetId: attempt.practiceSetId,
    });
    setDialogOpen(true);
  };

  const handleDeleteAttempt = async (id: string) => {
    if (confirm("Delete this practice session log? This cannot be undone.")) {
      await deleteAttempt(id);
    }
  };

  const hasBestSets = bestSets.length > 0;
  const hasWorstSets = worstSets.length > 0;
  const hasAttempts = attempts.length > 0;

  return (
    <div className="space-y-10 text-left">
      <header className="border-b border-border pb-7 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 motion-reduce:animate-none">
        <Link
          href="/analytics"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to analytics
        </Link>
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-xs font-medium text-primary">Skill detail</p>
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
            {skill}
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {hasAttempts
              ? `${stats.count} session${stats.count === 1 ? "" : "s"} logged · trajectory, set rankings, and full practice record`
              : "No sessions logged yet — add a score to start tracking this skill"}
          </p>
        </div>
      </header>

      {hasAttempts && (
        <>
          <section aria-label={`${skill} summary stats`}>
            <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
              <MiniStat label="Latest" value={stats.latest.toFixed(1)} />
              <MiniStat label="Average" value={stats.average.toFixed(1)} />
              <MiniStat label="Target" value={stats.target.toFixed(1)} />
              <MiniStat label="Trend" value={formatDelta(stats.trend) ?? "—"} />
            </dl>
          </section>

          <BandProgressChart
            data={chartData}
            targetBand={target}
            title={`${skill} band over time`}
            subtitle={`Band score after each ${skill.toLowerCase()} session`}
            emptyTitle={`No ${skill.toLowerCase()} timeline yet`}
            emptyDescription={`Log your first ${skill.toLowerCase()} score to see your band trajectory.`}
            valueLabel={skill}
          />

          {(hasBestSets || hasWorstSets) && (
            <section aria-labelledby="skill-rankings-title" className="space-y-5">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-primary">Session record</p>
                <h2 id="skill-rankings-title" className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Practice set rankings
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                <SetRankingCard
                  title="Best sessions"
                  setsBySkill={bestSetsBySkill}
                  hasSets={hasBestSets}
                  emptyIcon={Trophy}
                />
                <SetRankingCard
                  title="Needs attention"
                  setsBySkill={worstSetsBySkill}
                  hasSets={hasWorstSets}
                  emptyIcon={Target}
                />
              </div>
            </section>
          )}
        </>
      )}

      <section aria-labelledby="session-log-title">
        <div className="flex flex-col gap-4 border-b border-foreground pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 id="session-log-title" className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Session log
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{sessionLogSubtitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
            {hasAttempts && (
              <div className="min-w-0">
                <Label htmlFor="session-log-sort" className="sr-only">
                  Sort session log
                </Label>
                <Select
                  value={sessionLogSort}
                  onValueChange={(val) => {
                    if (val === "date" || val === "set") setSessionLogSort(val);
                  }}
                >
                  <SelectTrigger
                    id="session-log-sort"
                    aria-label="Sort session log"
                    className="h-9 w-full min-w-[11.5rem] bg-transparent sm:w-auto"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="date">By date recorded</SelectItem>
                    <SelectItem value="set">By practice set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <span className="text-sm text-muted-foreground tabular-nums">{attempts.length} logged</span>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="border-b border-border py-10">
            <p className="font-serif text-xl font-semibold text-foreground">No {skill.toLowerCase()} sessions yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Log a practice score to start your record.</p>
            <Button render={<Link href="/" />} nativeButton={false} className="mt-5" size="sm">
              Log a score
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        ) : (
          <div className="max-h-[34rem] overflow-y-auto pr-1">
            {sortedAttempts.map((attempt) => {
              const attemptDate = new Date(attempt.date);

              return (
                <article
                  key={attempt.id}
                  className="group ui-hover-row grid grid-cols-[3.75rem_minmax(0,1fr)_auto] gap-x-4 border-b border-border py-5 pl-1"
                >
                  <span className="font-serif text-3xl font-semibold leading-none text-foreground tabular-nums transition-colors group-hover:text-primary">
                    {attempt.bandScore.toFixed(1)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{attempt.skill}</h3>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {attempt.practiceSetId
                        ? `${attempt.bookTitle} · Test ${attempt.testNumber}`
                        : "Custom practice"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {attemptDate.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {attempt.notes && (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{attempt.notes}</p>
                    )}
                  </div>
                  <div className="ui-hover-actions flex shrink-0 items-start gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditAttemptClick(attempt)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Edit ${attempt.skill} practice from ${attemptDate.toLocaleDateString()}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttempt(attempt.id)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Delete ${attempt.skill} practice from ${attemptDate.toLocaleDateString()}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ScoreEntryDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        editAttempt={editAttempt}
        currentScores={currentScores}
        targetOverall={goals.targetOverall}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-hover-cell flex min-w-0 flex-col justify-end border-r border-border px-3 py-5 last:border-r-0 sm:px-5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums leading-none text-foreground sm:text-3xl">
        {value}
      </dd>
    </div>
  );
}
