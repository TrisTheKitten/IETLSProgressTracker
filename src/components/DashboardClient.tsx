"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  ArrowUpRight,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ScoreEntryDialog from "@/components/ScoreEntryDialog";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { cn } from "@/lib/utils";
import type { GoalsInput, Skill } from "@/lib/domain";

interface Attempt {
  id: string;
  skill: Skill;
  date: string;
  bandScore: number;
  rawScore: number | null;
  duration: number | null;
  notes: string | null;
  practiceSetId: string | null;
  bookTitle?: string;
  testNumber?: number;
}

interface PracticeSet {
  id: string;
  moduleSkill: Skill;
  bookTitle: string;
  testNumber: number;
  targetDate: string | null;
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

interface DashboardClientProps {
  recentAttempts: Attempt[];
  stats: {
    overallBand: number;
    completionRatio: string;
    completionPct: number;
    skills: {
      name: Skill;
      latest: number;
      average: number;
      target: number;
      completedSets: number;
    }[];
  };
  upcomingSets: PracticeSet[];
  goals: GoalsInput;
}

export default function DashboardClient({
  recentAttempts,
  stats,
  upcomingSets,
  goals,
}: DashboardClientProps) {
  const { deleteAttempt, transitionPracticeSetStatus } = useLocalStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<{
    id: string;
    moduleSkill: Skill;
    bookTitle: string;
    testNumber: number;
  } | null>(null);
  const [editAttempt, setEditAttempt] = useState<EditAttempt | null>(null);

  const currentScores = useMemo(() => {
    const byName = Object.fromEntries(stats.skills.map((s) => [s.name, s.latest])) as Record<string, number>;
    const pick = (n: string) => {
      const v = byName[n];
      return v && v > 0 ? v : null;
    };
    return {
      listening: pick("Listening"),
      reading: pick("Reading"),
      writing: pick("Writing"),
      speaking: pick("Speaking"),
    };
  }, [stats.skills]);

  const skillsWithScore = stats.skills.filter((s) => s.latest && s.latest > 0).length;
  const isProvisional = skillsWithScore > 0 && skillsWithScore < 4;
  const isTargetMet = stats.overallBand > 0 && stats.overallBand >= goals.targetOverall;

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditAttempt(null);
      setSelectedSet(null);
    }
  };

  const handleLogScoreClick = (set?: PracticeSet) => {
    setEditAttempt(null);
    if (set) {
      setSelectedSet({
        id: set.id,
        moduleSkill: set.moduleSkill,
        bookTitle: set.bookTitle,
        testNumber: set.testNumber,
      });
    } else {
      setSelectedSet(null);
    }
    setDialogOpen(true);
  };

  const handleEditAttemptClick = (attempt: Attempt) => {
    setSelectedSet(null);
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

  const handleToggleStatus = async (setId: string, checked: boolean) => {
    await transitionPracticeSetStatus(setId, checked ? "start" : "plan");
  };

  const handleDeleteAttempt = async (id: string) => {
    if (confirm("Delete this practice session log? This cannot be undone.")) {
      await deleteAttempt(id);
    }
  };

  const overallPosition = stats.overallBand > 0
    ? Math.min(100, (stats.overallBand / 9) * 100)
    : 0;

  return (
    <div className="space-y-10 text-left">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Your study desk</p>
          <h1 className="font-heading text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
            Progress, at a glance.
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Keep the next session clear and the long-term band goal in view.
          </p>
        </div>
        <Button onClick={() => handleLogScoreClick()} className="min-h-11 w-full shrink-0 sm:w-auto">
          <Plus data-icon="inline-start" />
          Log practice score
        </Button>
      </header>

      <section aria-labelledby="current-band-heading" className="border-y border-border">
        <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(16rem,0.7fr)]">
          <div className="px-5 py-7 sm:px-7 sm:py-9 lg:border-r lg:border-border lg:px-10 ui-hover-cell">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="current-band-heading" className="text-sm font-semibold text-foreground">
                Estimated overall band
              </h2>
              <span className={cn("text-sm", isProvisional ? "text-amber-700" : "text-muted-foreground")}>
                {skillsWithScore === 0
                  ? "Waiting for your first score"
                  : isProvisional
                    ? `Provisional · ${skillsWithScore} of 4 skills`
                    : "All skills represented"}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-end gap-x-6 gap-y-3">
              <span className="font-heading text-7xl font-semibold leading-[0.8] tracking-[-0.06em] text-foreground tabular-nums sm:text-8xl">
                {stats.overallBand > 0 ? stats.overallBand.toFixed(1) : "—"}
              </span>
              <div className="pb-1 text-sm leading-6 text-muted-foreground">
                <p>Target band {goals.targetOverall.toFixed(1)}</p>
                {stats.overallBand > 0 && (
                  <p className={isTargetMet ? "font-medium text-emerald-700" : "font-medium text-primary"}>
                    {isTargetMet
                      ? "Target reached"
                      : `${(goals.targetOverall - stats.overallBand).toFixed(1)} band to close`}
                  </p>
                )}
              </div>
            </div>

            <div
              className="mt-8"
              role="progressbar"
              aria-label="Current overall band on the IELTS scale"
              aria-valuemin={0}
              aria-valuemax={9}
              aria-valuenow={stats.overallBand}
            >
              <div className="relative h-px bg-border">
                <div
                  className="absolute inset-y-[-1px] left-0 h-[3px] bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${overallPosition}%` }}
                />
                <span
                  className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-foreground/60"
                  style={{ left: `${Math.min(100, (goals.targetOverall / 9) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
                <span>0.0</span>
                <span>IELTS band scale</span>
                <span>9.0</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-border lg:grid-cols-1 lg:border-t-0">
            <div className="ui-hover-cell px-5 py-6 sm:px-7 lg:px-8 lg:py-8">
              <p className="text-sm text-muted-foreground">Catalogue completed</p>
              <p className="mt-2 font-heading text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {stats.completionPct}%
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stats.completionRatio} sets</p>
            </div>
            <div className="ui-hover-cell border-l border-border px-5 py-6 sm:px-7 lg:border-l-0 lg:border-t lg:px-8 lg:py-8">
              <p className="text-sm text-muted-foreground">Current evidence</p>
              <p className="mt-2 font-heading text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {recentAttempts.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">logged sessions</p>
            </div>
          </div>
        </div>

        <div className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {stats.skills.map((skill, index) => (
            <div
              key={skill.name}
              className={cn(
                "ui-hover-cell flex items-baseline justify-between gap-4 px-5 py-4 sm:px-6",
                index % 2 === 1 && "sm:border-l sm:border-border",
                index > 1 && "border-t border-border lg:border-t-0",
                index > 0 && "lg:border-l lg:border-border"
              )}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{skill.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Target {skill.target.toFixed(1)}</p>
              </div>
              <span className="font-heading text-2xl font-semibold text-foreground tabular-nums">
                {skill.latest > 0 ? skill.latest.toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.35fr)] lg:gap-14">
        <section aria-labelledby="next-study-heading">
          <div className="flex items-end justify-between gap-4 border-b border-foreground pb-3">
            <div>
              <h2 id="next-study-heading" className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                Next practice
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">All planned sets</p>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">{upcomingSets.length} planned</span>
          </div>

          {upcomingSets.length === 0 ? (
            <div className="border-b border-border py-10">
              <p className="font-heading text-xl font-medium text-foreground">Nothing planned yet.</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Choose a Cambridge set from the study checklist to give your next session a clear starting point.
              </p>
              <Link
                href="/planner"
                className="group/link mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Browse the catalogue{" "}
                <ArrowUpRight className="ui-hover-link-icon h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div>
              {upcomingSets.map((set) => (
                <div
                  key={set.id}
                  className="group ui-hover-row flex items-start gap-3 border-b border-border py-4 pl-1"
                >
                  <Checkbox
                    id={`set-${set.id}`}
                    className="mt-0.5"
                    onCheckedChange={(checked) => handleToggleStatus(set.id, !!checked)}
                    aria-label={`Mark ${set.bookTitle}, test ${set.testNumber} in progress`}
                  />
                  <label htmlFor={`set-${set.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-primary">
                      {set.bookTitle}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Test {set.testNumber} · {set.moduleSkill}
                    </span>
                    {set.targetDate && (
                      <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        Due {new Date(set.targetDate).toLocaleDateString()}
                      </span>
                    )}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleLogScoreClick(set)}
                    aria-label={`Log score for ${set.bookTitle}, test ${set.testNumber}`}
                    className="ui-hover-actions min-h-11 min-w-11 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="practice-history-heading">
          <div className="flex items-end justify-between gap-4 border-b border-foreground pb-3">
            <div>
              <h2 id="practice-history-heading" className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                Practice record
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Most recent sessions first</p>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">{recentAttempts.length} logged</span>
          </div>

          {recentAttempts.length === 0 ? (
            <div className="border-b border-border py-10">
              <p className="font-heading text-xl font-medium text-foreground">No sessions recorded.</p>
              <p className="mt-2 text-sm text-muted-foreground">Log a practice score to start your record.</p>
            </div>
          ) : (
            <div className="max-h-[34rem] overflow-y-auto pr-1">
              {recentAttempts.map((attempt) => {
                const attemptDate = new Date(attempt.date);

                return (
                  <article
                    key={attempt.id}
                    className="group ui-hover-row grid grid-cols-[3.75rem_minmax(0,1fr)_auto] gap-x-4 border-b border-border py-5 pl-1"
                  >
                    <span className="font-heading text-3xl font-semibold leading-none text-foreground tabular-nums transition-colors group-hover:text-primary">
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
      </div>

      <ScoreEntryDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        practiceSet={selectedSet}
        editAttempt={editAttempt}
        currentScores={currentScores}
        targetOverall={goals.targetOverall}
      />
    </div>
  );
}
