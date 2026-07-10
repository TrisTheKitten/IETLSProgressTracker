import SettingsClient from "@/components/SettingsClient";
import { getActiveGoals, getDefaultTestType } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const goals = getActiveGoals();
  const defaultTestType = getDefaultTestType();

  return (
    <SettingsClient 
      goals={goals} 
      defaultTestType={defaultTestType} 
    />
  );
}
