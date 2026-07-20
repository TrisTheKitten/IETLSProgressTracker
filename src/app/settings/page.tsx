"use client";

import SettingsClient from "@/components/SettingsClient";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { getSettingsView } from "@/lib/local-store";

export default function SettingsPage() {
  const { data } = useLocalStore();
  const view = getSettingsView(data);

  return (
    <SettingsClient
      goals={view.goals}
      defaultTestType={view.defaultTestType}
    />
  );
}
