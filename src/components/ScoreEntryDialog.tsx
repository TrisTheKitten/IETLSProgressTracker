"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertRawToBand, calculateOverallBand } from "@/lib/ielts";
import { useLocalStore } from "@/components/LocalStoreProvider";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
  Headphones,
  MessageCircle,
  Minus,
  PenLine,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SKILLS, bandScoreSchema, skillSchema, type Skill, type TestType } from "@/lib/domain";

const scoreEntrySchema = z.object({
  skill: skillSchema,
  date: z.string().nonempty("Date is required"),
  rawScore: z.union([
    z.number().min(0, "Min mark is 0").max(40, "Max mark is 40"),
    z.null(),
  ]).optional(),
  bandScore: bandScoreSchema,
  duration: z.union([
    z.number().int().positive("Duration must be positive"),
    z.null(),
  ]).optional(),
  notes: z.string().optional(),
});

type ScoreEntryFormValues = z.infer<typeof scoreEntrySchema>;

interface PracticeSetRef {
  id: string;
  moduleSkill: Skill;
  bookTitle: string;
  testNumber: number;
}

interface EditAttemptRef {
  id: string;
  skill: Skill;
  date: string;
  rawScore: number | null;
  bandScore: number;
  duration: number | null;
  notes: string | null;
  practiceSetId: string | null;
}

interface ScoreEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceSet?: PracticeSetRef | null;
  editAttempt?: EditAttemptRef | null;
  currentScores?: { listening?: number | null; reading?: number | null; writing?: number | null; speaking?: number | null };
  targetOverall?: number;
  defaultTestType?: TestType;
}

const SKILL_ICONS: Record<Skill, typeof Headphones> = {
  Listening: Headphones,
  Reading: BookOpen,
  Writing: PenLine,
  Speaking: MessageCircle,
};

const DEFAULT_DURATIONS: Record<Skill, number> = {
  Listening: 30,
  Reading: 60,
  Writing: 60,
  Speaking: 15,
};

const DURATION_PRESETS = [15, 30, 45, 60, 90];

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function clampBand(v: number): number {
  const stepped = Math.round(v * 2) / 2;
  return Math.max(1.0, Math.min(9.0, stepped));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading text-lg font-semibold tracking-tight text-foreground">
      {children}
    </p>
  );
}

export default function ScoreEntryDialog({
  open,
  onOpenChange,
  practiceSet,
  editAttempt = null,
  currentScores,
  targetOverall,
  defaultTestType = "Academic",
}: ScoreEntryDialogProps) {
  const { saveAttempt } = useLocalStore();
  const [testType, setTestType] = useState<TestType>(defaultTestType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ScoreEntryFormValues>({
    resolver: zodResolver(scoreEntrySchema),
    defaultValues: {
      skill: "Listening",
      date: new Date().toISOString().substring(0, 16),
      rawScore: null,
      bandScore: 6.0,
      duration: 30,
      notes: "",
    },
  });

  const selectedSkill = useWatch({ control, name: "skill" });
  const rawScoreValue = useWatch({ control, name: "rawScore" });
  const bandScoreValue = useWatch({ control, name: "bandScore" });
  const durationValue = useWatch({ control, name: "duration" });

  const isEditMode = !!editAttempt;
  const SkillIcon = SKILL_ICONS[selectedSkill];

  useEffect(() => {
    if (!open) return;

    if (editAttempt) {
      setValue("skill", editAttempt.skill);
      setValue("date", toLocalDatetimeInput(editAttempt.date));
      setValue("rawScore", editAttempt.rawScore);
      setValue("bandScore", clampBand(editAttempt.bandScore));
      setValue("duration", editAttempt.duration);
      setValue("notes", editAttempt.notes ?? "");
    } else if (practiceSet) {
      setValue("skill", practiceSet.moduleSkill);
      setValue("date", new Date().toISOString().substring(0, 16));
      setValue("rawScore", null);
      setValue("bandScore", 6.0);
      setValue("duration", DEFAULT_DURATIONS[practiceSet.moduleSkill]);
      setValue("notes", "");
    } else {
      setValue("skill", "Listening");
      setValue("date", new Date().toISOString().substring(0, 16));
      setValue("rawScore", null);
      setValue("bandScore", 6.0);
      setValue("duration", DEFAULT_DURATIONS.Listening);
      setValue("notes", "");
    }
  }, [open, editAttempt, practiceSet, setValue]);

  useEffect(() => {
    if (!open || editAttempt || practiceSet) return;
    setValue("duration", DEFAULT_DURATIONS[selectedSkill]);
    setValue("rawScore", null);
  }, [selectedSkill, practiceSet, editAttempt, open, setValue]);

  useEffect(() => {
    if ((selectedSkill === "Listening" || selectedSkill === "Reading") && typeof rawScoreValue === "number") {
      const calculatedBand = convertRawToBand(selectedSkill, rawScoreValue, testType);
      if (calculatedBand > 0) {
        setValue("bandScore", calculatedBand, { shouldValidate: true });
      }
    }
  }, [rawScoreValue, selectedSkill, testType, setValue]);

  const preview = useMemo(() => {
    if (!currentScores || typeof bandScoreValue !== "number" || bandScoreValue < 1.0) return null;
    const projected = {
      listening: currentScores.listening ?? null,
      reading: currentScores.reading ?? null,
      writing: currentScores.writing ?? null,
      speaking: currentScores.speaking ?? null,
      [selectedSkill.toLowerCase()]: bandScoreValue,
    };
    const skillsPresent = [projected.listening, projected.reading, projected.writing, projected.speaking]
      .filter((s): s is number => s !== null && s !== undefined).length;
    const overall = calculateOverallBand(projected);
    return { overall, skillsPresent, isProvisional: skillsPresent < 4, projected };
  }, [currentScores, bandScoreValue, selectedSkill]);

  const showRawScore = selectedSkill === "Listening" || selectedSkill === "Reading";
  const showTestTypeToggle = selectedSkill === "Reading";
  const rawProgress = typeof rawScoreValue === "number" ? Math.min(100, (rawScoreValue / 40) * 100) : 0;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSubmitError(null);
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: ScoreEntryFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const practiceSetId = editAttempt?.practiceSetId ?? practiceSet?.id ?? null;
      await saveAttempt({
        id: editAttempt?.id,
        practiceSetId,
        skill: values.skill,
        date: new Date(values.date).toISOString(),
        rawScore: values.rawScore ?? null,
        bandScore: values.bandScore,
        notes: values.notes || null,
        duration: values.duration || null,
      });
      handleDialogOpenChange(false);
      reset();
    } catch (error) {
      console.error("Failed to save practice session:", error);
      setSubmitError("Could not save this session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = isEditMode
    ? "Edit practice session"
    : practiceSet
    ? "Log practice session"
    : "Log a custom session";

  const dialogDescription = isEditMode
    ? "Update the details of this logged session."
    : practiceSet
    ? "Saves to history and marks this checklist item complete."
    : "Record any practice — mock test, section drill, or tutor session.";

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[min(92vh,860px)] gap-0 overflow-hidden border-t-4 border-t-primary p-0 sm:max-w-[560px] !flex !flex-col">
        <div className="shrink-0 border-b border-border bg-card px-5 pb-5 pt-5 sm:px-7 sm:pt-6">
          <DialogHeader className="gap-2">
            <div className="flex items-start gap-3">
              <SkillIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="font-heading text-2xl font-semibold leading-tight tracking-tight">
                  {dialogTitle}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-6">
                  {dialogDescription}
                </DialogDescription>
              </div>
            </div>

            {practiceSet && (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3">
                <span className="text-sm font-semibold text-primary">
                  {selectedSkill}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {practiceSet.bookTitle} · Test {practiceSet.testNumber}
                </span>
              </div>
            )}
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="text-left flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-7">
            {!practiceSet && !isEditMode && (
              <div className="space-y-3">
                <SectionLabel>Skill</SectionLabel>
                <div className="grid grid-cols-2 border-y border-border sm:grid-cols-4" role="radiogroup" aria-label="Skill">
                  {SKILLS.map((skill, index) => {
                    const Icon = SKILL_ICONS[skill];
                    const isSelected = selectedSkill === skill;
                    return (
                      <button
                        key={skill}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setValue("skill", skill)}
                        className={cn(
                          "relative flex min-h-12 items-center justify-center gap-2 px-2 py-3 text-sm font-medium transition-colors cursor-pointer",
                          index % 2 === 1 && "border-l border-border",
                          index > 1 && "border-t border-border sm:border-t-0",
                          index > 0 && "sm:border-l sm:border-border",
                          isSelected
                            ? "bg-accent text-primary after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isEditMode && !practiceSet && (
              <p className="border-l-2 border-primary pl-3 text-sm font-semibold text-foreground">{selectedSkill}</p>
            )}

            <div className="space-y-5 border-t border-border pt-6">
              <SectionLabel>Score</SectionLabel>

              {showTestTypeToggle && (
                <div className="flex flex-col gap-3 border-y border-border py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Reading stream</span>
                    <span className="text-xs text-muted-foreground">Conversion tables differ</span>
                  </div>
                  <div className="flex gap-1" role="group" aria-label="Reading stream">
                    {(["Academic", "General Training"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTestType(type)}
                        aria-pressed={testType === type}
                        className={cn(
                          "min-h-10 border-b-2 px-3 text-xs font-semibold transition-colors cursor-pointer",
                          testType === type
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {type === "Academic" ? "Academic" : "General"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={cn("grid gap-7", showRawScore ? "grid-cols-1 sm:grid-cols-[0.75fr_1.25fr]" : "grid-cols-1")}>
                {showRawScore && (
                  <div className="space-y-2">
                    <Label htmlFor="rawScore">Correct answers</Label>
                    <Input
                      id="rawScore"
                      type="number"
                      min={0}
                      max={40}
                      placeholder="0–40"
                      className="min-h-12 text-center text-lg font-semibold tabular-nums"
                      {...register("rawScore", {
                        valueAsNumber: true,
                        setValueAs: (v) => (v === "" ? null : Number(v)),
                      })}
                    />
                    <div className="h-px w-full bg-border">
                      <div
                        className="h-[3px] bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                        style={{ width: `${rawProgress}%` }}
                      />
                    </div>
                    {errors.rawScore && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" /> {errors.rawScore.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>IELTS band</Label>
                  <div className="flex items-center gap-3 border-y border-border py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="min-h-11 min-w-11 shrink-0"
                      onClick={() => setValue("bandScore", clampBand((bandScoreValue ?? 6) - 0.5), { shouldValidate: true })}
                      aria-label="Decrease band by 0.5"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-1 flex-col items-center justify-center py-1">
                      <span className="font-heading text-5xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
                        {bandScoreValue?.toFixed(1)}
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground">out of 9.0</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="min-h-11 min-w-11 shrink-0"
                      onClick={() => setValue("bandScore", clampBand((bandScoreValue ?? 6) + 0.5), { shouldValidate: true })}
                      aria-label="Increase band by 0.5"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {showRawScore
                      ? "Auto-calculated from correct answers. Tap ± to override."
                      : "Enter the band from your tutor or self-assessment."}
                  </p>
                  {errors.bandScore && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {errors.bandScore.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {preview && (
              <div className="space-y-3 border-y border-border py-4" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Projected overall</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-3xl font-semibold tabular-nums">{preview.overall.toFixed(1)}</span>
                    {typeof targetOverall === "number" && targetOverall > 0 && (
                      <span className={cn(
                        "text-xs font-medium tabular-nums",
                        preview.overall >= targetOverall ? "text-emerald-600" : "text-amber-600"
                      )}>
                        / {targetOverall.toFixed(1)} goal
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {(["Listening", "Reading", "Writing", "Speaking"] as const).map((skill) => {
                    const val = preview.projected[skill.toLowerCase() as keyof typeof preview.projected] as number | null;
                    const isCurrent = skill === selectedSkill;
                    return (
                      <span
                        key={skill}
                        className={cn(
                          "inline-flex items-baseline gap-1",
                          isCurrent && "font-semibold text-primary"
                        )}
                      >
                        {skill.slice(0, 3)} <strong className="font-semibold tabular-nums">{val ? val.toFixed(1) : "—"}</strong>
                      </span>
                    );
                  })}
                </div>
                {preview.isProvisional && (
                  <p className="text-xs text-muted-foreground">
                    Provisional — {preview.skillsPresent}/4 skills logged
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4 border-t border-border pt-6">
              <SectionLabel>Session details</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Date and time
                  </Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    className="min-h-11 text-sm"
                    {...register("date")}
                  />
                  {errors.date && (
                    <p className="text-xs text-destructive">{errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="duration" className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Duration (min)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="e.g. 60"
                    className="min-h-11 tabular-nums"
                    {...register("duration", {
                      valueAsNumber: true,
                      setValueAs: (v) => (v === "" ? null : Number(v)),
                    })}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {DURATION_PRESETS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setValue("duration", mins)}
                        aria-pressed={durationValue === mins}
                        className={cn(
                          "min-h-9 border-b-2 px-2 text-xs font-medium transition-colors cursor-pointer",
                          durationValue === mins
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                  {errors.duration && (
                    <p className="text-xs text-destructive">{errors.duration.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Mistakes, topics to revisit, tutor feedback…"
                className="min-h-20 w-full resize-none rounded-sm border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                {...register("notes")}
              />
            </div>

            {submitError && (
              <p className="text-xs text-destructive flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {submitError}
              </p>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-card px-5 py-4 sm:px-7">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-h-11 min-w-[120px]">
              {isSubmitting ? "Saving…" : isEditMode ? "Save changes" : "Log session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
