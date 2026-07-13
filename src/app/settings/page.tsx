"use client";

import SettingsClient from "@/components/SettingsClient";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { getActiveGoals, getDefaultTestType } from "@/lib/local-store";

export default function SettingsPage() {
  const { data } = useLocalStore();
  const goals = getActiveGoals(data);
  const defaultTestType = getDefaultTestType(data);

  return (
    <SettingsClient
      goals={goals}
      defaultTestType={defaultTestType}
    />
  );
}
