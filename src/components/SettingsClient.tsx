"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Save, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { goalsInputSchema, type GoalsInput, type TestType } from "@/lib/domain";
import { calculateOverallBand } from "@/lib/ielts";

interface SettingsClientProps {
  goals: GoalsInput;
  defaultTestType: TestType;
}

function finiteBand(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default function SettingsClient({ goals, defaultTestType }: SettingsClientProps) {
  const {
    saveStudyGoals,
    setDefaultTestType,
    exportData,
    importData,
    resetDatabase,
  } = useLocalStore();
  const [testType, setTestType] = useState<TestType>(defaultTestType);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [goalsMessage, setGoalsMessage] = useState<string | null>(null);
  const [prefMessage, setPrefMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<GoalsInput>({
    resolver: zodResolver(goalsInputSchema),
    defaultValues: {
      targetListening: goals.targetListening,
      targetReading: goals.targetReading,
      targetWriting: goals.targetWriting,
      targetSpeaking: goals.targetSpeaking,
      targetOverall: goals.targetOverall,
    },
  });

  // Controlled so setValue updates are visible (Base UI Input ignores uncontrolled setValue).
  const targetOverall = useWatch({ control, name: "targetOverall" });

  const syncOverallFromSkills = () => {
    const values = getValues();
    const overall = calculateOverallBand({
      listening: finiteBand(values.targetListening),
      reading: finiteBand(values.targetReading),
      writing: finiteBand(values.targetWriting),
      speaking: finiteBand(values.targetSpeaking),
    });
    if (overall >= 1) {
      setValue("targetOverall", overall, { shouldValidate: true, shouldDirty: true });
    }
  };

  const registerSkill = (name: "targetListening" | "targetReading" | "targetWriting" | "targetSpeaking") =>
    register(name, {
      valueAsNumber: true,
      onChange: () => {
        syncOverallFromSkills();
      },
    });

  const overallField = register("targetOverall", { valueAsNumber: true });

  const onSubmitGoals = async (values: GoalsInput) => {
    setIsSavingGoals(true);
    setGoalsMessage(null);
    try {
      await saveStudyGoals(values);
      setGoalsMessage("Goals saved.");
    } catch (err) {
      console.error(err);
      setGoalsMessage("Failed to update study goals.");
    } finally {
      setIsSavingGoals(false);
    }
  };

  const handleSavePref = async () => {
    setIsSavingPref(true);
    setPrefMessage(null);
    try {
      await setDefaultTestType(testType);
      setPrefMessage("Preferences saved.");
    } catch (err) {
      console.error(err);
      setPrefMessage("Failed to save preferences.");
    } finally {
      setIsSavingPref(false);
    }
  };

  const handleExport = async () => {
    try {
      const jsonStr = await exportData();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ielts_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Export failed.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (confirm("Importing this backup will completely overwrite your current local data. Do you wish to proceed?")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        try {
          await importData(text);
          alert("Data restored successfully!");
          window.location.reload();
        } catch (err) {
          console.error(err);
          const message = err instanceof Error ? err.message : "Import failed.";
          alert(`Import failed: ${message}`);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const handleReset = async () => {
    if (confirm("This deletes all sessions and custom sets. Cannot be undone.\n\nAre you sure?")) {
      setIsResetting(true);
      try {
        await resetDatabase();
        alert("Tracker data has been reset successfully!");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Failed to reset tracker data.");
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="w-full min-w-0 space-y-10">
      <header className="max-w-3xl space-y-2 border-b border-border pb-7">
        <h1 className="font-heading text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
          Make the tracker yours.
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Set the score you are working toward and keep your local study record portable.
        </p>
      </header>

      <div className="max-w-4xl border-b border-border">
        <section aria-labelledby="target-scores-heading" className="grid gap-6 border-t border-foreground py-8 md:grid-cols-[minmax(12rem,0.65fr)_minmax(0,1.35fr)] md:gap-12">
          <div>
            <h2 id="target-scores-heading" className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Target bands
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Goals shape the gap and progress cues shown throughout the tracker.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmitGoals)} className="space-y-6">
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="targetListening">Listening</Label>
                <Input
                  id="targetListening"
                  type="number"
                  step="0.5"
                  min="1.0"
                  max="9.0"
                  className="min-h-11 font-semibold tabular-nums"
                  aria-invalid={!!errors.targetListening}
                  {...registerSkill("targetListening")}
                />
                {errors.targetListening && <p className="text-xs text-destructive">{errors.targetListening.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetReading">Reading</Label>
                <Input
                  id="targetReading"
                  type="number"
                  step="0.5"
                  min="1.0"
                  max="9.0"
                  className="min-h-11 font-semibold tabular-nums"
                  aria-invalid={!!errors.targetReading}
                  {...registerSkill("targetReading")}
                />
                {errors.targetReading && <p className="text-xs text-destructive">{errors.targetReading.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetWriting">Writing</Label>
                <Input
                  id="targetWriting"
                  type="number"
                  step="0.5"
                  min="1.0"
                  max="9.0"
                  className="min-h-11 font-semibold tabular-nums"
                  aria-invalid={!!errors.targetWriting}
                  {...registerSkill("targetWriting")}
                />
                {errors.targetWriting && <p className="text-xs text-destructive">{errors.targetWriting.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetSpeaking">Speaking</Label>
                <Input
                  id="targetSpeaking"
                  type="number"
                  step="0.5"
                  min="1.0"
                  max="9.0"
                  className="min-h-11 font-semibold tabular-nums"
                  aria-invalid={!!errors.targetSpeaking}
                  {...registerSkill("targetSpeaking")}
                />
                {errors.targetSpeaking && <p className="text-xs text-destructive">{errors.targetSpeaking.message}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="targetOverall">Overall band</Label>
                <Input
                  id="targetOverall"
                  type="number"
                  step="0.5"
                  min="1.0"
                  max="9.0"
                  className="min-h-11 font-semibold tabular-nums sm:max-w-[calc(50%-0.625rem)]"
                  aria-invalid={!!errors.targetOverall}
                  aria-describedby="targetOverall-hint"
                  name={overallField.name}
                  ref={overallField.ref}
                  onBlur={overallField.onBlur}
                  value={finiteBand(targetOverall) ?? ""}
                  onChange={(event) => {
                    void overallField.onChange(event);
                  }}
                />
                <p id="targetOverall-hint" className="text-xs text-muted-foreground">
                  Updates automatically from the four skill targets. You can still override it.
                </p>
                {errors.targetOverall && <p className="text-xs text-destructive">{errors.targetOverall.message}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" disabled={isSavingGoals} className="min-h-11 cursor-pointer">
                <Save data-icon="inline-start" />
                <span>{isSavingGoals ? "Saving…" : "Save target bands"}</span>
              </Button>
              <p aria-live="polite" className="text-sm text-muted-foreground">{goalsMessage}</p>
            </div>
          </form>
        </section>

        <section aria-labelledby="exam-stream-heading" className="grid gap-6 border-t border-border py-8 md:grid-cols-[minmax(12rem,0.65fr)_minmax(0,1.35fr)] md:gap-12">
          <div>
            <h2 id="exam-stream-heading" className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Exam stream
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              This default controls the Reading conversion table used for new sessions.
            </p>
          </div>
          <div className="space-y-5">
            <div className="max-w-md space-y-2">
              <Label htmlFor="defaultTestType">Default test type</Label>
              <Select value={testType} onValueChange={(val) => setTestType(val || "Academic")}>
                <SelectTrigger id="defaultTestType" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="General Training">General Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={handleSavePref} disabled={isSavingPref} variant="outline" className="min-h-11 cursor-pointer">
                <Save data-icon="inline-start" />
                <span>{isSavingPref ? "Saving…" : "Save preference"}</span>
              </Button>
              <p aria-live="polite" className="text-sm text-muted-foreground">{prefMessage}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="backup-heading" className="grid gap-6 border-t border-border py-8 md:grid-cols-[minmax(12rem,0.65fr)_minmax(0,1.35fr)] md:gap-12">
          <div>
            <h2 id="backup-heading" className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Backup and restore
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Export the complete local browser data to JSON, or restore a previous snapshot.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Button onClick={handleExport} variant="outline" className="min-h-11 cursor-pointer">
              <Download data-icon="inline-start" />
              Export JSON
            </Button>
            <input
              type="file"
              accept=".json"
              id="import-file"
              onChange={handleImport}
              className="sr-only"
            />
            <Button
              type="button"
              onClick={() => document.getElementById("import-file")?.click()}
              variant="ghost"
              className="min-h-11 cursor-pointer"
            >
              <Upload data-icon="inline-start" />
              Restore from JSON
            </Button>
          </div>
        </section>

        <section aria-labelledby="reset-heading" className="grid gap-6 border-t border-destructive/50 py-8 md:grid-cols-[minmax(12rem,0.65fr)_minmax(0,1.35fr)] md:gap-12">
          <div>
            <h2 id="reset-heading" className="font-heading text-2xl font-semibold tracking-tight text-destructive">
              Reset local data
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Deletes every session and custom set from this tracker. This cannot be undone.
            </p>
          </div>
          <div className="flex items-start">
            <Button
              onClick={handleReset}
              disabled={isResetting}
              variant="destructive"
              className="min-h-11 cursor-pointer"
            >
              <RefreshCw data-icon="inline-start" className={isResetting ? "animate-spin motion-reduce:animate-none" : undefined} />
              <span>{isResetting ? "Resetting…" : "Reset tracker data"}</span>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
