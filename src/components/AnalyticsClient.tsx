"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Headphones,
  Layers,
  MessageCircle,
  Minus,
  PenLine,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import BandProgressChart from "@/components/BandProgressChart";
import { cn } from "@/lib/utils";
import {
  SKILLS,
  goalTargetForSkill,
  type GoalsInput,
  type Skill,
} from "@/lib/domain";
import {
  SetRankingCard,
  type SetSummary,
} from "@/components/analytics/AnalyticsCards";
import { useCountUp, usePrefersReducedMotion } from "@/lib/hooks";

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
      count >= 2
        ? points[points.length - 1].band - points[points.length - 2].band
        : null;

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

  const hasBestSets = SKILL_NAMES.some(
    (skill) => bestSetsBySkill[skill].length > 0,
  );
  const hasWorstSets = SKILL_NAMES.some(
    (skill) => worstSetsBySkill[skill].length > 0,
  );

  const totalSessions = attempts.length;
  const skillsTracked = trackedSkills.length;
  const latestOverall =
    progressData.length > 0
      ? progressData[progressData.length - 1].overall
      : null;
  const peakOverall =
    progressData.length > 0
      ? Math.max(...progressData.map((p) => p.overall))
      : null;
  const trendDelta =
    progressData.length >= 2
      ? progressData[progressData.length - 1].overall - progressData[0].overall
      : null;
  const isOverallTargetMet =
    latestOverall !== null && latestOverall >= goals.targetOverall;
  const overallGap =
    latestOverall !== null
      ? Math.max(0, goals.targetOverall - latestOverall)
      : null;
  const hasProgress = progressData.length > 0;
  const hasAttempts = attempts.length > 0;

  const reduceMotion = usePrefersReducedMotion();
  const animatedOverall = useCountUp(latestOverall ?? 0, {
    enabled: !reduceMotion && latestOverall !== null,
  });
  const trendIcon =
    trendDelta === null
      ? Minus
      : trendDelta > 0
        ? ArrowUpRight
        : ArrowDownRight;
  const trendValue = formatDelta(trendDelta) ?? "—";
  const trendSub =
    trendDelta === null ? "needs 2+ sessions" : "since first overall";

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
            See where you stand, which skills are moving, and what to practice
            next.
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
              <span
                className="font-serif text-7xl leading-none tracking-[-0.06em] text-primary"
                aria-hidden="true"
              >
                0.0
              </span>
              <BarChart2
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
            </div>
            <div className="max-w-xl space-y-5">
              <div className="space-y-2">
                <h2
                  id="empty-report-title"
                  className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                  Your first score starts the report
                </h2>
                <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                  Log a few practice sessions and this page will trace your band
                  trajectory, strongest skill, and next area to practise.
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
              <div className="border-y border-border">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem]">
                  <div className="min-w-0 space-y-6 px-5 py-7 sm:px-8 sm:py-9 lg:pr-10">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <h2
                        id="overall-summary-title"
                        className="text-xs font-medium uppercase tracking-[0.09em] text-muted-foreground"
                      >
                        Current overall
                      </h2>
                      <span className="inline-flex items-center gap-1.5 border-l border-primary pl-3 text-xs font-medium text-foreground">
                        {isOverallTargetMet ? (
                          <>
                            <Check
                              className="h-3.5 w-3.5 text-primary"
                              aria-hidden="true"
                            />
                            Target met
                          </>
                        ) : (
                          <>
                            <span className="tabular-nums">
                              {overallGap?.toFixed(1)}
                            </span>
                            <span className="font-normal text-muted-foreground">
                              to target
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
                      <div className="flex items-end gap-x-4 gap-y-1">
                        <span
                          className="font-serif text-7xl font-semibold leading-[0.82] tracking-[-0.065em] text-foreground tabular-nums sm:text-8xl"
                          aria-hidden="true"
                        >
                          {animatedOverall.toFixed(1)}
                        </span>
                        <span className="sr-only">
                          {latestOverall.toFixed(1)} band out of a{" "}
                          {goals.targetOverall.toFixed(1)} target.
                        </span>
                        <p className="mb-1.5 text-sm text-muted-foreground">
                          of{" "}
                          <span className="font-medium tabular-nums text-foreground">
                            {goals.targetOverall.toFixed(1)}
                          </span>{" "}
                          target
                        </p>
                      </div>
                      <RadialGauge
                        value={latestOverall}
                        target={goals.targetOverall}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Peak{" "}
                      <span className="tabular-nums text-foreground">
                        {peakOverall?.toFixed(1)}
                      </span>
                      <span className="mx-1.5 text-border">·</span>
                      last {lastSessionDate}
                    </p>
                  </div>

                  <div className="flex flex-col divide-y divide-border border-t border-border lg:border-l lg:border-t-0">
                    <StatCell
                      icon={CalendarDays}
                      label="Sessions"
                      value={String(totalSessions)}
                      sub="logged"
                    />
                    <StatCell
                      icon={Layers}
                      label="Skills"
                      value={`${skillsTracked}/4`}
                      sub={
                        skillsTracked === 4
                          ? "all tracked"
                          : `${4 - skillsTracked} to add`
                      }
                    />
                    <StatCell
                      icon={trendIcon}
                      label="Trend"
                      value={trendValue}
                      sub={trendSub}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-7 border-y border-border py-7 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] md:py-9">
                <div className="md:border-r md:border-border md:pr-8">
                  <div className="space-y-2">
                    <h2
                      id="overall-summary-title"
                      className="font-serif text-2xl font-semibold tracking-tight text-foreground"
                    >
                      Complete the picture
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Your overall timeline appears after every skill has at
                      least one score.
                    </p>
                  </div>
                </div>
                <div className="min-w-0 space-y-5">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Unlock your overall band timeline
                    </p>
                    <p className="text-xs text-muted-foreground max-w-[480px] leading-relaxed">
                      You have {totalSessions} session
                      {totalSessions === 1 ? "" : "s"} logged. Add the missing
                      skills below to see a true overall band curve.
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
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              tracked
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground">
                              {skill.name}
                            </p>
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
                  <Button
                    render={<Link href="/" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                  >
                    Log missing skill
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            )}
          </section>

          {hasProgress && (
            <div>
              <BandProgressChart
                data={progressData}
                targetOverall={goals.targetOverall}
              />
            </div>
          )}

          <section aria-label="Skills at a glance">
            <div className="grid grid-cols-1 gap-x-10 border-t border-border sm:grid-cols-2">
              {skills.map((skill) => {
                const Icon = SKILL_ICONS[skill.name];
                const hasData = skill.stats.count > 0;
                const progressPct = hasData
                  ? Math.min(
                      100,
                      (skill.stats.latest / skill.stats.target) * 100,
                    )
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
                          <Icon
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {skill.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {hasData
                                ? `${skill.stats.count} session${skill.stats.count === 1 ? "" : "s"}`
                                : "No sessions yet"}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {hasData && skill.stats.recentTrend !== null ? (
                            <TrendBadge
                              delta={skill.stats.recentTrend}
                              compact
                            />
                          ) : (
                            <span className="invisible text-xs">Steady</span>
                          )}
                          <ChevronRight
                            className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <div className="flex flex-1 items-end justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Latest
                          </p>
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
                          <div
                            className="h-9 w-24 shrink-0 border-b border-dashed border-border"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="mt-auto space-y-1.5">
                        <div className="h-px w-full bg-border">
                          <div
                            className={cn(
                              "h-[3px] -translate-y-px transition-[width] duration-500 motion-reduce:transition-none",
                              hasData ? "bg-primary" : "bg-transparent",
                            )}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex min-h-4 items-center justify-between gap-2 text-xs font-medium">
                          {hasData ? (
                            <>
                              <span className="truncate text-muted-foreground">
                                {skill.stats.trend !== null &&
                                skill.stats.trend !== 0
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

          <section aria-label="Practice set rankings">
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

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
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
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
        compact && "text-xs",
      )}
    >
      <Icon
        className={cn(
          compact ? "h-3 w-3" : "h-3.5 w-3.5",
          down && "text-muted-foreground",
        )}
      />
      {formatDelta(delta)}
      {label && !compact && (
        <span className="ml-1 font-normal text-muted-foreground">{label}</span>
      )}
    </span>
  );
}

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function RadialGauge({ value, target }: { value: number; target: number }) {
  const reduceMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pct = target > 0 ? value / target : 0;
  const frac = Math.max(0, Math.min(1, pct));
  const R = 46;
  const C = 2 * Math.PI * R;
  const trackLen = C * 0.75;
  const progressLen = trackLen * frac;
  const startAngle = 135;
  const head = polarPoint(60, 60, R, startAngle + 270 * frac);
  const tickOuter = polarPoint(60, 60, R + 5, 45);
  const tickInner = polarPoint(60, 60, R - 5, 45);
  const percent = Math.round(pct * 100);

  return (
    <div
      className="relative shrink-0"
      role="progressbar"
      aria-label="Progress toward overall target"
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={Math.min(value, target)}
      aria-valuetext={`${value.toFixed(1)} band against a ${target.toFixed(1)} target, ${percent} percent of goal`}
    >
      <svg
        viewBox="0 0 120 120"
        className="h-28 w-28 sm:h-[8.5rem] sm:w-[8.5rem]"
        aria-hidden="true"
      >
        <g transform="rotate(135 60 60)">
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${trackLen} ${C - trackLen}`}
          />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={
              mounted ? `${progressLen} ${C - progressLen}` : `0 ${C}`
            }
            style={{
              transition: reduceMotion
                ? "none"
                : "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </g>
        <line
          x1={tickInner.x}
          y1={tickInner.y}
          x2={tickOuter.x}
          y2={tickOuter.y}
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        {mounted && frac > 0.01 && (
          <circle cx={head.x} cy={head.y} r="3.4" fill="var(--primary)" />
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-xl font-semibold tabular-nums leading-none text-foreground">
          {percent}%
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          of target
        </span>
      </div>
    </div>
  );
}

function StatCell({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 px-4 py-4 sm:px-6">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center border border-border text-muted-foreground"
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-serif text-2xl font-semibold leading-none tabular-nums text-foreground sm:text-[1.7rem]">
          {value}
        </p>
        {sub && (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
