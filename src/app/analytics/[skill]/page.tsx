"use client";

import { notFound, useParams } from "next/navigation";
import SkillAnalyticsClient from "@/components/SkillAnalyticsClient";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { SKILLS, type Skill } from "@/lib/domain";
import { getSkillAnalyticsView } from "@/lib/local-store";

function resolveSkill(slug: string): Skill | null {
  const normalized = slug.toLowerCase();
  return SKILLS.find((s) => s.toLowerCase() === normalized) ?? null;
}

export default function SkillAnalyticsPage() {
  const params = useParams();
  const { data } = useLocalStore();
  const slug = typeof params.skill === "string" ? params.skill : "";
  const skill = resolveSkill(slug);

  if (!skill) {
    notFound();
  }

  const view = getSkillAnalyticsView(data, skill);

  return (
    <SkillAnalyticsClient
      skill={view.skill}
      attempts={view.attempts}
      goals={view.goals}
      bestSets={view.bestSets}
      worstSets={view.worstSets}
      skillProgress={view.skillProgress}
      allAttempts={view.allAttempts}
    />
  );
}
