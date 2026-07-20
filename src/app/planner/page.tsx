"use client";

import PlannerClient from "@/components/PlannerClient";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { getPlannerView } from "@/lib/local-store";

export default function PlannerPage() {
  const { data } = useLocalStore();
  const view = getPlannerView(data);

  return (
    <PlannerClient
      practiceSets={view.practiceSets}
      booksList={view.booksList}
      currentScores={view.currentScores}
      targetOverall={view.targetOverall}
    />
  );
}
