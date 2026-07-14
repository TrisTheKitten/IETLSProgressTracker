"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  ChevronRight,
  Headphones,
  MessageCircle,
  Minus,
  PenLine,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BandProgressChart from "@/components/BandProgressChart";
import { cn } from "@/lib/utils";
import { SKILLS, goalTargetForSkill, type GoalsInput, type Skill } from "@/lib/domain";
import { InsightCard, SetRankingCard, type SetSummary } from "@/components/analytics/AnalyticsCards";

interface AttemptData {
  id: string;
  skill: string;
  date: string;
  bandScore: number;
  rawScore: number | null;
  bookTitle?: string;
  testNumber?: number;
}

interface SkillPoint {
  index: number;
  dateStr: string;
  fullDate: string;
  band: number;
}

interface ProgressPoint {
  index: number;
  dateStr: string;
  overall: number;
  fullDate?: string;
}

interface AnalyticsClientProps {
  attempts: AttemptData[];
  goals: GoalsInput;
  bestSetsBySkill: Record<Skill, SetSummary[]>;
  worstSetsBySkill: Record<Skill, SetSummary[]>;
  progressData: ProgressPoint[];
  skillProgress: Record<Skill, SkillPoint[]>;
}

const SKILL_ICONS: Record<Skill, typeof Headphones> = {
  Listening: Headphones,
  Reading: BookOpen,
  Writing: PenLine,
  Speaking: MessageCircle,
};

const SKILL_NAMES = SKILLS;

function roundHalf(n: number) {
  return Math.round(n * 2) / 2;
}

function formatDelta(delta: number | null) {
  if (delta === null) return null;
  if (delta === 0) return "Steady";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
}

export default function AnalyticsClient({
  attempts,
  goals,
  bestSetsBySkill,
  worstSetsBySkill,
  progressData,
  skillProgress,
}: AnalyticsClientProps) {
  const getSkillStats = (skillName: Skill) => {
    const points = skillProgress[skillName] ?? [];
    const count = points.length;
    const sum = points.reduce((acc, p) => acc + p.band, 0);
    const average = count > 0 ? roundHalf(sum / count) : 0;
    const latest = count > 0 ? points[points.length - 1].band : 0;
    const first = count > 0 ? points[0].band : 0;
    const trend = count >= 2 ? latest - first : null;
    const recentTrend =
      count >= 2 ? points[points.length - 1].band - points[points.length - 2].band : null;

    const target = goalTargetForSkill(goals, skillName);

    const gap = target - latest;

    return {
      average,
      latest,
      count,
      target,
      gap,
      trend,
      recentTrend,
      isTargetMet: latest >= target && count > 0,
      points,
    };
  };

  const skills = SKILL_NAMES.map((name) => ({
    name,
    stats: getSkillStats(name),
  }));

  const trackedSkills = skills.filter((s) => s.stats.count > 0);
  const strongest =
    trackedSkills.length > 0
      ? [...trackedSkills].sort((a, b) => b.stats.latest - a.stats.latest)[0]
      : null;
  const belowTarget = trackedSkills
    .filter((s) => s.stats.gap > 0)
    .sort((a, b) => b.stats.gap - a.stats.gap);
  const focusSkill =
    belowTarget.find((s) => s.name !== strongest?.name) ?? belowTarget[0] ?? null;
  const focusIsDistinct = Boolean(focusSkill && strongest && focusSkill.name !== strongest.name);

  const hasBestSets = SKILL_NAMES.some((skill) => bestSetsBySkill[skill].length > 0);
  const hasWorstSets = SKILL_NAMES.some((skill) => worstSetsBySkill[skill].length > 0);

  const totalSessions = attempts.length;
  const skillsTracked = trackedSkills.length;
  const latestOverall = progressData.length > 0 ? progressData[progressData.length - 1].overall : null;
  const peakOverall = progressData.length > 0 ? Math.max(...progressData.map((p) => p.overall)) : null;
  const trendDelta =
    progressData.length >= 2
      ? progressData[progressData.length - 1].overall - progressData[0].overall
      : null;
  const isOverallTargetMet = latestOverall !== null && latestOverall >= goals.targetOverall;
  const overallGap =
    latestOverall !== null ? Math.max(0, goals.targetOverall - latestOverall) : null;
  const overallProgressPct =
    latestOverall !== null
      ? Math.min(100, Math.max(0, (latestOverall / goals.targetOverall) * 100))
      : 0;
  const hasProgress = progressData.length > 0;
  const hasAttempts = attempts.length > 0;

  const lastSessionDate =
    attempts.length > 0
      ? new Date(attempts[0].date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return (
    <div className="space-y-10 text-left">
      <header className="border-b border-border pb-7 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 motion-reduce:animate-none">
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary">Progress report</p>
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
            Analytics
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            See where you stand, which skills are moving, and what to practice next.
          </p>
        </div>
      </header>

      {!hasAttempts && (
        <section
          aria-labelledby="empty-report-title"
          className="border-y border-border py-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-reduce:animate-none sm:py-14"
        >
          <div className="grid gap-8 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] md:items-center">
            <div className="flex items-center gap-5 border-b border-border pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8">
              <span className="font-serif text-7xl leading-none tracking-[-0.06em] text-primary" aria-hidden="true">
                0.0
              </span>
              <BarChart2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            </div>
            <div className="max-w-xl space-y-5">
              <div className="space-y-2">
                <h2 id="empty-report-title" className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Your first score starts the report
                </h2>
                <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                  Log a few practice sessions and this page will trace your band trajectory, strongest skill, and next area to practise.
                </p>
              </div>
              <Button render={<Link href="/" />} nativeButton={false}>
                Log your first score
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {hasAttempts && (
        <>
          <section
            aria-labelledby="overall-summary-title"
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none"
          >
            {hasProgress && latestOverall !== null ? (
              <div className="border-y border-border bg-card">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_21rem]">
                  <div className="min-w-0 space-y-6 px-1 py-7 sm:px-3 sm:py-9 lg:pr-10 ui-hover-cell">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 id="overall-summary-title" className="text-xs font-medium text-muted-foreground">
                          Current overall
                        </h2>
                        {isOverallTargetMet ? (
                          <span className="border-l border-primary pl-2 text-xs font-medium text-foreground">
                            Target met
                          </span>
                        ) : (
                          <span className="border-l border-primary pl-2 text-xs font-medium text-muted-foreground">
                            {overallGap?.toFixed(1)} to target
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                        <span className="font-serif text-7xl font-semibold leading-[0.82] tracking-[-0.065em] text-foreground tabular-nums sm:text-8xl">
                          {latestOverall.toFixed(1)}
                        </span>
                        <div className="mb-1 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            of {goals.targetOverall.toFixed(1)} target
                          </p>
                          {trendDelta !== null && (
                            <TrendBadge delta={trendDelta} label="since first overall" />
                          )}
                        </div>
                      </div>

                      <div className="max-w-xl space-y-2.5">
                        <div
                          className="h-px w-full bg-border"
                          role="progressbar"
                          aria-label="Progress toward overall target"
                          aria-valuemin={0}
                          aria-valuemax={goals.targetOverall}
                          aria-valuenow={Math.min(latestOverall, goals.targetOverall)}
                          aria-valuetext={`${latestOverall.toFixed(1)} against a ${goals.targetOverall.toFixed(1)} target`}
                        >
                          <div
                            className="h-[3px] -translate-y-px bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
                            style={{ width: `${overallProgressPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Peak {peakOverall?.toFixed(1)} · {totalSessions} sessions · last{" "}
                          {lastSessionDate}
                        </p>
                      </div>
                  </div>

                  <dl className="grid grid-cols-3 border-t border-border lg:border-l lg:border-t-0">
                      <MiniStat label="Sessions" value={String(totalSessions)} />
                      <MiniStat label="Skills" value={`${skillsTracked}/4`} />
                      <MiniStat
                        label="Trend"
                        value={formatDelta(trendDelta) ?? "—"}
                      />
                  </dl>
                </div>
              </div>
            ) : (
              <div className="grid gap-7 border-y border-border py-7 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] md:py-9">
                <div className="md:border-r md:border-border md:pr-8">
                  <div className="space-y-2">
                    <h2 id="overall-summary-title" className="font-serif text-2xl font-semibold tracking-tight text-foreground">
                      Complete the picture
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Your overall timeline appears after every skill has at least one score.
                    </p>
                  </div>
                </div>
                <div className="min-w-0 space-y-5">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        Unlock your overall band timeline
                      </p>
                      <p className="text-xs text-muted-foreground max-w-[480px] leading-relaxed">
                        You have {totalSessions} session{totalSessions === 1 ? "" : "s"} logged.
                        Add the missing skills below to see a true overall band curve.
                      </p>
                    </div>
                    <div className="grid border-t border-border sm:grid-cols-2">
                      {skills.map((skill) => {
                        const Icon = SKILL_ICONS[skill.name];
                        const tracked = skill.stats.count > 0;
                        return (
                          <article
                            key={skill.name}
                            className="ui-hover-cell flex items-center gap-3 border-b border-border py-3 sm:odd:pr-4 sm:even:border-l sm:even:pl-4"
                          >
                            <Icon className={cn("h-4 w-4 shrink-0", tracked ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground">{skill.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {tracked
                                  ? `${skill.stats.count} session${skill.stats.count === 1 ? "" : "s"} · latest ${skill.stats.latest.toFixed(1)}`
                                  : "Not logged yet"}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {tracked ? "Ready" : "Needed"}
                            </span>
                          </article>
                        );
                      })}
                    </div>
                    <Button render={<Link href="/" />} nativeButton={false} variant="outline" size="sm">
                      Log missing skill
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                </div>
              </div>
            )}
          </section>

          {hasProgress && (
            <div>
              <BandProgressChart data={progressData} targetOverall={goals.targetOverall} />
            </div>
          )}

          {trackedSkills.length > 0 && strongest && (
            <section
              aria-label="Key insights"
              className="grid divide-y divide-border border-y border-border md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:divide-x md:divide-y-0"
            >
              <InsightCard
                label="Strongest right now"
                skill={strongest.name}
                score={strongest.stats.latest}
                detail={`Avg ${strongest.stats.average.toFixed(1)} · ${strongest.stats.count} session${strongest.stats.count === 1 ? "" : "s"}`}
              />
              {focusIsDistinct && focusSkill ? (
                <InsightCard
                  label="Best place to focus"
                  skill={focusSkill.name}
                  score={focusSkill.stats.latest}
                  detail={`${focusSkill.stats.gap.toFixed(1)} below ${focusSkill.stats.target.toFixed(1)} target`}
                />
              ) : skillsTracked < 4 ? (
                <InsightCard
                  label="Next unlock"
                  value="Log remaining skills"
                  detail="Add all four skills to unlock your overall band curve and richer insights."
                />
              ) : focusSkill ? (
                <InsightCard
                  label="Keep pushing"
                  skill={focusSkill.name}
                  score={focusSkill.stats.latest}
                  detail={`Still ${focusSkill.stats.gap.toFixed(1)} below ${focusSkill.stats.target.toFixed(1)} — your top skill has room to grow`}
                />
              ) : (
                <InsightCard
                  label="Targets looking good"
                  value="All skills on target"
                  detail="Keep practicing to hold your scores and push the overall higher."
                />
              )}
            </section>
          )}

          <section
            aria-labelledby="skills-title"
            className="space-y-5"
          >
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-medium text-primary">Four papers</p>
                <h2 id="skills-title" className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Skills at a glance
                </h2>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {totalSessions} sessions
              </span>
            </div>

            <div className="grid grid-cols-1 gap-x-10 border-t border-border sm:grid-cols-2">
              {skills.map((skill) => {
                const Icon = SKILL_ICONS[skill.name];
                const hasData = skill.stats.count > 0;
                const progressPct = hasData
                  ? Math.min(100, (skill.stats.latest / skill.stats.target) * 100)
                  : 0;

                return (
                  <Link
                    key={skill.name}
                    href={`/analytics/${skill.name.toLowerCase()}`}
                    className="ui-hover-cell group flex min-w-0 flex-col gap-5 border-b border-border py-5 sm:py-6"
                  >
                    <article className="flex min-w-0 flex-1 flex-col gap-5">
                        <div className="flex min-h-9 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{skill.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {hasData
                                ? `${skill.stats.count} session${skill.stats.count === 1 ? "" : "s"}`
                                : "No sessions yet"}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {hasData && skill.stats.recentTrend !== null ? (
                            <TrendBadge delta={skill.stats.recentTrend} compact />
                          ) : (
                            <span className="invisible text-xs">Steady</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="flex flex-1 items-end justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Latest</p>
                          <div className="flex min-h-8 items-baseline gap-1.5">
                            <p className="font-serif text-4xl font-semibold tabular-nums tracking-tight leading-none text-foreground">
                              {hasData ? skill.stats.latest.toFixed(1) : "—"}
                            </p>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              / {skill.stats.target.toFixed(1)}
                            </span>
                          </div>
                          <p className="mt-1.5 min-h-4 truncate text-xs text-muted-foreground tabular-nums">
                            {hasData ? (
                              <>
                                Avg {skill.stats.average.toFixed(1)}
                                <span className="mx-1.5 text-border">·</span>
                                {skill.stats.isTargetMet
                                  ? "On target"
                                  : `${skill.stats.gap.toFixed(1)} below target`}
                              </>
                            ) : (
                              "No average yet"
                            )}
                          </p>
                        </div>
                        {hasData && skill.stats.points.length >= 2 ? (
                          <SkillSparkline
                            points={skill.stats.points}
                            color="var(--primary)"
                            target={skill.stats.target}
                          />
                        ) : (
                          <div className="h-9 w-24 shrink-0 border-b border-dashed border-border" aria-hidden="true" />
                        )}
                      </div>

                      <div className="mt-auto space-y-1.5">
                        <div className="h-px w-full bg-border">
                          <div
                            className={cn("h-[3px] -translate-y-px transition-[width] duration-500 motion-reduce:transition-none", hasData ? "bg-primary" : "bg-transparent")}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex min-h-4 items-center justify-between gap-2 text-xs font-medium">
                          {hasData ? (
                            <>
                              <span className="truncate text-muted-foreground">
                                {skill.stats.trend !== null && skill.stats.trend !== 0
                                  ? `${formatDelta(skill.stats.trend)} overall`
                                  : "Steady"}
                              </span>
                              <span className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary">
                                View detail
                              </span>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-primary">
                              View detail
                              <ArrowRight className="ui-hover-link-icon h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="rankings-title"
            className="space-y-5"
          >
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-medium text-primary">Session record</p>
                <h2 id="rankings-title" className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Practice set rankings
                </h2>
              </div>
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
        </>
      )}
    </div>
  );
}

function SkillSparkline({
  points,
  color,
  target,
}: {
  points: SkillPoint[];
  color: string;
  target: number;
}) {
  const w = 96;
  const h = 36;
  const padY = 3;
  const values = points.map((p) => p.band);
  const min = Math.min(...values, target) - 0.25;
  const max = Math.max(...values, target) + 0.25;
  const range = Math.max(0.5, max - min);

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * w;
    const y = h - padY - ((p.band - min) / range) * (h - padY * 2);
    return { x, y };
  });

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const targetY = h - padY - ((target - min) / range) * (h - padY * 2);
  const last = coords[coords.length - 1];

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      <line
        x1={0}
        x2={w}
        y1={targetY}
        y2={targetY}
        stroke="var(--muted-foreground)"
        strokeWidth={1}
        strokeDasharray="2 2"
        opacity={0.35}
      />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={2.5} fill={color} />
    </svg>
  );
}

function TrendBadge({
  delta,
  label,
  compact = false,
}: {
  delta: number;
  label?: string;
  compact?: boolean;
}) {
  const up = delta > 0;
  const down = delta < 0;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums text-foreground",
        compact && "text-xs"
      )}
    >
      <Icon className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5", down && "text-muted-foreground")} />
      {formatDelta(delta)}
      {label && !compact && <span className="ml-1 font-normal text-muted-foreground">{label}</span>}
    </span>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="ui-hover-cell flex min-w-0 flex-col justify-end border-r border-border px-3 py-5 last:border-r-0 sm:px-5 lg:py-7">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-serif text-2xl font-semibold tabular-nums leading-none text-foreground sm:text-3xl">
        {value}
      </dd>
    </div>
  );
}
