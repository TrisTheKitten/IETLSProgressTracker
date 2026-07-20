"use client";

import DashboardClient from "@/components/DashboardClient";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { getDashboardView } from "@/lib/local-store";

export default function DashboardPage() {
  const { data } = useLocalStore();
  const view = getDashboardView(data);

  return (
    <DashboardClient
      recentAttempts={view.recentAttempts}
      stats={view.stats}
      upcomingSets={view.upcomingSets}
      goals={view.goals}
    />
  );
}
