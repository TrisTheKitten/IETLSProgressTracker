"use client";

import AnalyticsClient from "@/components/AnalyticsClient";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { getAnalyticsView } from "@/lib/local-store";

export default function AnalyticsPage() {
  const { data } = useLocalStore();
  const view = getAnalyticsView(data);

  return (
    <AnalyticsClient
      attempts={view.attempts}
      goals={view.goals}
      bestSetsBySkill={view.bestSetsBySkill}
      worstSetsBySkill={view.worstSetsBySkill}
      progressData={view.progressData}
      skillProgress={view.skillProgress}
    />
  );
}
