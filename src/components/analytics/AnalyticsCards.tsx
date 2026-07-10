"use client";

import Link from "next/link";
import { BookOpen, Headphones, MessageCircle, PenLine, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SKILLS, type Skill } from "@/lib/domain";

export interface SetSummary {
  setId: string;
  bookTitle: string;
  testNumber: number;
  skill: Skill;
  averageScore: number;
  attemptsCount: number;
}

const SKILL_ICONS: Record<Skill, typeof Headphones> = {
  Listening: Headphones,
  Reading: BookOpen,
  Writing: PenLine,
  Speaking: MessageCircle,
};

export function SetRankingCard({
  title,
  setsBySkill,
  hasSets,
  emptyIcon: EmptyIcon,
}: {
  title: string;
  setsBySkill: Record<Skill, SetSummary[]>;
  hasSets: boolean;
  emptyIcon: typeof Trophy;
}) {
  const titleId = `ranking-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <article className="flex min-w-0 flex-col border-y border-border" aria-labelledby={titleId}>
      <header className="flex items-center justify-between border-b border-border py-3">
        <h3 id={titleId} className="font-serif text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      </header>
      <div className="flex flex-1 flex-col py-5">
        {!hasSets ? (
          <div className="flex min-h-[170px] flex-1 flex-col items-start justify-center gap-3 py-8">
            <EmptyIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No linked practice sets yet</p>
              <p className="max-w-xs text-xs leading-5 text-muted-foreground">Link a Cambridge set when logging a score to see rankings here.</p>
            </div>
            <Button render={<Link href="/" />} nativeButton={false} variant="outline" size="xs" className="mt-1">Log a linked score</Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-7">
            {SKILLS.map((skill) => {
              const sets = setsBySkill[skill];
              if (sets.length === 0) return null;
              const Icon = SKILL_ICONS[skill];
              return (
                <section key={skill} className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-xs font-semibold text-foreground">{skill}</span>
                  </div>
                  <ol className="divide-y divide-border border-t border-border">
                    {sets.map((set, rank) => (
                      <li key={set.setId} className="flex items-center gap-3 py-2.5 transition-colors hover:bg-secondary/50 motion-reduce:transition-none">
                        <span className="w-5 shrink-0 font-serif text-sm font-semibold tabular-nums text-primary">{String(rank + 1).padStart(2, "0")}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">{set.bookTitle}<span className="text-muted-foreground"> · Test {set.testNumber}</span></p>
                          {set.attemptsCount > 1 && <p className="text-xs text-muted-foreground">{set.attemptsCount} attempts</p>}
                        </div>
                        <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{set.averageScore.toFixed(1)}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

export function InsightCard({ label, value, skill, score, detail }: {
  label: string;
  value?: string;
  skill?: Skill;
  score?: number;
  detail: string;
}) {
  const SkillIcon = skill ? SKILL_ICONS[skill] : null;
  const displayValue = skill ?? value ?? "";
  return (
    <article className="flex min-w-0 items-start gap-4 py-6 first:md:pr-8 last:md:pl-8">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex min-h-8 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {SkillIcon && <SkillIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />}
            <p className="truncate font-serif text-xl font-semibold text-foreground">{displayValue}</p>
          </div>
          {score !== undefined && <span className="w-12 shrink-0 text-right font-serif text-3xl font-semibold tabular-nums leading-none text-foreground">{score.toFixed(1)}</span>}
        </div>
        <p className="max-w-md text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </article>
  );
}
