"use client";

import { useState } from "react";
import {
  Search,
  Calendar as CalendarIcon,
  Plus,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  transitionPracticeSetStatus,
  updatePracticeSetDetails,
  createCustomPracticeSet,
} from "@/app/actions";
import ScoreEntryDialog from "@/components/ScoreEntryDialog";
import { cn } from "@/lib/utils";
import type { PracticeSetStatus, Skill, TestType } from "@/lib/domain";

interface PracticeSet {
  id: string;
  bookId: number | null;
  bookTitle: string;
  bookNumber: number;
  bookVersion: TestType;
  testNumber: number;
  moduleSkill: Skill;
  status: PracticeSetStatus;
  targetDate: string | null;
  isCustom: boolean;
}

interface PlannerClientProps {
  practiceSets: PracticeSet[];
  booksList: { id: number; title: string; number: number }[];
  currentScores?: { listening?: number | null; reading?: number | null; writing?: number | null; speaking?: number | null };
  targetOverall?: number;
}

interface PracticeSetGroup {
  key: string;
  bookLabel: string;
  bookNumber: number;
  bookVersion: PracticeSet["bookVersion"];
  isCustom: boolean;
  sets: PracticeSet[];
}

function getStatusLabel(status: PracticeSet["status"]): string {
  switch (status) {
    case "Completed": return "Completed";
    case "In Progress": return "In Progress";
    case "To Practice": return "Planned";
    default: return "Unstarted";
  }
}

function isOverdue(targetDate: string | null, status: PracticeSet["status"]): boolean {
  if (!targetDate || status === "Completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(targetDate + "T00:00:00");
  return due < today;
}

function formatLocalDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function groupPracticeSets(sets: PracticeSet[]): PracticeSetGroup[] {
  const groups = new Map<string, PracticeSetGroup>();

  for (const set of sets) {
    const key = `${set.bookNumber}:${set.bookTitle}`;
    const existing = groups.get(key);

    if (existing) {
      existing.sets.push(set);
      continue;
    }

    groups.set(key, {
      key,
      bookLabel: set.bookTitle.split(" (")[0],
      bookNumber: set.bookNumber,
      bookVersion: set.bookVersion,
      isCustom: set.isCustom,
      sets: [set],
    });
  }

  return Array.from(groups.values());
}

function PracticeSetLedgerRow({
  set,
  datePickerOpen,
  onDatePickerOpenChange,
  onPickDate,
  onClearDate,
  onToggleFocus,
  onLogScore,
}: {
  set: PracticeSet;
  datePickerOpen: boolean;
  onDatePickerOpenChange: (open: boolean) => void;
  onPickDate: (set: PracticeSet, date: Date | undefined) => Promise<void>;
  onClearDate: (set: PracticeSet) => Promise<void>;
  onToggleFocus: (setId: string, currentStatus: string) => Promise<void>;
  onLogScore: (set: PracticeSet) => void;
}) {
  const isPlanned = set.status !== "Unstarted";
  const isCompleted = set.status === "Completed";
  const overdue = isOverdue(set.targetDate, set.status);
  const bookLabel = set.bookTitle.split(" (")[0];
  const setName = `${bookLabel}, Test ${set.testNumber}, ${set.moduleSkill}`;
  const statusUsesAccent = set.status === "To Practice" || set.status === "In Progress";

  return (
    <article className="border-b border-border last:border-b-0">
      <div className="grid min-w-0 gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[5rem_minmax(7rem,0.9fr)_minmax(9rem,1fr)_minmax(13rem,auto)] lg:items-center lg:gap-4">
        <div className="flex min-w-0 items-center justify-between gap-3 lg:block">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            Test {set.testNumber}
          </span>
          <span
            className={cn(
              "text-sm lg:hidden",
              statusUsesAccent ? "font-medium text-primary" : "text-muted-foreground"
            )}
          >
            {getStatusLabel(set.status)}
          </span>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{set.moduleSkill}</p>
          <p
            className={cn(
              "mt-0.5 hidden text-xs lg:block",
              statusUsesAccent ? "font-medium text-primary" : "text-muted-foreground"
            )}
          >
            {getStatusLabel(set.status)}
          </p>
        </div>

        <div className="min-w-0">
          {isPlanned ? (
            <Popover open={datePickerOpen} onOpenChange={onDatePickerOpenChange}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    aria-label={`${set.targetDate ? "Change" : "Set"} planned date for ${setName}`}
                    className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-sm text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-auto"
                  >
                    <CalendarIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {set.targetDate ? formatLocalDate(set.targetDate) : "Set a date"}
                    </span>
                    {overdue && (
                      <span className="shrink-0 font-medium text-primary">Overdue</span>
                    )}
                  </button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={set.targetDate ? new Date(set.targetDate + "T00:00:00") : undefined}
                  onSelect={(date) => onPickDate(set, date)}
                />
                {set.targetDate && (
                  <div className="flex justify-end border-t border-border p-2">
                    <button
                      type="button"
                      onClick={() => onClearDate(set)}
                      className="min-h-11 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Clear date
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          ) : (
            <span className="flex min-h-11 items-center text-sm text-muted-foreground">
              Not scheduled
            </span>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 lg:flex lg:justify-end">
          {!isPlanned ? (
            <Button
              variant="outline"
              onClick={() => onToggleFocus(set.id, set.status)}
              aria-label={`Add ${setName} to study list`}
              className="col-span-2 h-11 w-full cursor-pointer px-4 lg:w-auto"
            >
              Add to study list
            </Button>
          ) : isCompleted ? (
            <div className="col-span-2 flex h-11 w-full items-center justify-center gap-2 border border-border bg-secondary px-4 text-sm font-medium text-foreground lg:w-auto">
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>Completed</span>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onToggleFocus(set.id, set.status)}
                aria-label={`Remove ${setName} from study list`}
                className="h-11 min-w-0 cursor-pointer px-4"
              >
                Remove
              </Button>
              <Button
                onClick={() => onLogScore(set)}
                aria-label={`Log score for ${setName}`}
                className="h-11 min-w-0 cursor-pointer px-4"
              >
                Log score
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PlannerClient({ practiceSets, booksList, currentScores, targetOverall }: PlannerClientProps) {
  const [filterSkill, setFilterSkill] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("Active");
  const [filterBook, setFilterBook] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<{
    id: string;
    moduleSkill: Skill;
    bookTitle: string;
    testNumber: number;
  } | null>(null);

  const [datePickerSetId, setDatePickerSetId] = useState<string | null>(null);

  const [customBookName, setCustomBookName] = useState("");
  const [customTestNumber, setCustomTestNumber] = useState(1);
  const [customSkill, setCustomSkill] = useState<Skill>("Listening");
  const [customTargetDate, setCustomTargetDate] = useState("");

  const filteredSets = practiceSets.filter((set) => {
    const matchesSkill = filterSkill === "All" || set.moduleSkill === filterSkill;
    const matchesStatus =
      filterStatus === "All" ||
      (filterStatus === "Active" && (set.status === "To Practice" || set.status === "In Progress")) ||
      set.status === filterStatus;
    const matchesBook =
      filterBook === "All" ||
      (filterBook === "Custom" && set.isCustom) ||
      (filterBook !== "Custom" && set.bookId === Number(filterBook));
    const matchesSearch =
      set.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `test ${set.testNumber}`.includes(searchQuery.toLowerCase()) ||
      set.moduleSkill.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSkill && matchesStatus && matchesBook && matchesSearch;
  });

  const handleToggleFocus = async (setId: string, currentStatus: string) => {
    await transitionPracticeSetStatus(setId, currentStatus === "Unstarted" ? "plan" : "unplan");
  };

  const handlePickDate = async (set: PracticeSet, date: Date | undefined) => {
    if (!date) {
      await handleClearDate(set);
      return;
    }
    await updatePracticeSetDetails(set.id, { targetDate: toDateString(date) });
    setDatePickerSetId(null);
  };

  const handleClearDate = async (set: PracticeSet) => {
    await updatePracticeSetDetails(set.id, { targetDate: null });
    setDatePickerSetId(null);
  };

  const resetFilters = () => {
    setFilterSkill("All");
    setFilterStatus("All");
    setFilterBook("All");
    setSearchQuery("");
  };

  const handleCreateCustomSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBookName.trim()) return;

    await createCustomPracticeSet({
      bookName: customBookName,
      testNumber: customTestNumber,
      moduleSkill: customSkill,
      targetDate: customTargetDate || null,
    });

    setCustomDialogOpen(false);
    setCustomBookName("");
    setCustomTestNumber(1);
    setCustomSkill("Listening");
    setCustomTargetDate("");
  };

  const handleLogScoreClick = (set: PracticeSet) => {
    setSelectedSet({
      id: set.id,
      moduleSkill: set.moduleSkill,
      bookTitle: set.bookTitle,
      testNumber: set.testNumber,
    });
    setScoreDialogOpen(true);
  };

  const activeCount = practiceSets.filter((s) => s.status === "To Practice" || s.status === "In Progress").length;
  const groupedSets = groupPracticeSets(filteredSets);

  return (
    <div className="w-full min-w-0 space-y-7 text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Study checklist
          </h1>
        </div>
        <Button
          onClick={() => setCustomDialogOpen(true)}
          className="h-11 w-full shrink-0 px-4 sm:w-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add custom practice set
        </Button>
      </div>

      <section aria-labelledby="catalogue-filters-heading" className="border-y border-border py-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="catalogue-filters-heading" className="text-sm font-semibold text-foreground">
            Find practice sets
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums" role="status" aria-live="polite">
            {filteredSets.length} {filteredSets.length === 1 ? "set" : "sets"}
            {filterStatus === "Active" && ` · ${activeCount} planned`}
          </p>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-3 xl:grid-cols-[minmax(14rem,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="min-w-0 md:col-span-3 xl:col-span-1">
            <Label htmlFor="search" className="sr-only">
              Search practice sets
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="search"
                type="text"
                placeholder="Search practice sets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full bg-card pl-9"
              />
            </div>
          </div>

          <div className="min-w-0">
            <Label htmlFor="book-filter" className="sr-only">Cambridge book</Label>
            <Select value={filterBook} onValueChange={(val) => setFilterBook(val || "All")}>
              <SelectTrigger id="book-filter" aria-label="Filter by Cambridge book" className="h-11 w-full min-w-0 bg-card">
                <SelectValue placeholder="All books" className="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All books</SelectItem>
                {booksList.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.title.split(" (")[0]}
                  </SelectItem>
                ))}
                <SelectItem value="Custom">Custom sets</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label htmlFor="skill-filter" className="sr-only">Module skill</Label>
            <Select value={filterSkill} onValueChange={(val) => setFilterSkill(val || "All")}>
              <SelectTrigger id="skill-filter" aria-label="Filter by module skill" className="h-11 w-full min-w-0 bg-card">
                <SelectValue placeholder="All skills" className="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All skills</SelectItem>
                <SelectItem value="Listening">Listening</SelectItem>
                <SelectItem value="Reading">Reading</SelectItem>
                <SelectItem value="Writing">Writing</SelectItem>
                <SelectItem value="Speaking">Speaking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label htmlFor="status-filter" className="sr-only">Status</Label>
            <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "All")}>
              <SelectTrigger id="status-filter" aria-label="Filter by status" className="h-11 w-full min-w-0 bg-card">
                <SelectValue placeholder="All statuses" className="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active (planned)</SelectItem>
                <SelectItem value="All">All statuses</SelectItem>
                <SelectItem value="Unstarted">Unstarted</SelectItem>
                <SelectItem value="To Practice">Planned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="min-w-0">
        {filteredSets.length === 0 ? (
          <section className="border-y border-border py-12 sm:py-16" aria-labelledby="planner-empty-title">
            <div className="max-w-lg space-y-4">
              {filterStatus === "Active" ? (
                <>
                  <div className="space-y-1.5">
                    <h2 id="planner-empty-title" className="text-xl font-semibold tracking-tight text-foreground">
                      Nothing planned yet
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Browse the catalogue and add the Cambridge sets you want to practise next.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setFilterStatus("All")}
                    className="h-11 cursor-pointer px-4"
                  >
                    Browse the catalogue
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <h2 id="planner-empty-title" className="text-xl font-semibold tracking-tight text-foreground">
                      No sets match these filters
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Try a broader search or reset every filter to see the full catalogue.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="h-11 cursor-pointer px-4"
                  >
                    Reset filters
                  </Button>
                </>
              )}
            </div>
          </section>
        ) : (
          <div className="space-y-6">
            {groupedSets.map((group, groupIndex) => {
              const completedCount = group.sets.filter((set) => set.status === "Completed").length;
              const headingId = `book-group-${groupIndex}`;

              return (
                <section
                  key={group.key}
                  aria-labelledby={headingId}
                  className="overflow-hidden border border-border bg-card"
                >
                  <header className="flex flex-col gap-2 border-b border-border bg-secondary/40 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 id={headingId} className="truncate text-base font-semibold text-foreground">
                          {group.bookLabel}
                        </h2>
                        {!group.isCustom && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {group.bookVersion === "Academic" ? "Academic" : "General Training"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {group.isCustom ? "Custom source" : `Cambridge volume ${group.bookNumber}`}
                        {` · ${group.sets.length} ${group.sets.length === 1 ? "set" : "sets"}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                      {completedCount}/{group.sets.length} completed
                    </span>
                  </header>

                  <div className="hidden border-b border-border bg-background px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid lg:grid-cols-[5rem_minmax(7rem,0.9fr)_minmax(9rem,1fr)_minmax(13rem,auto)] lg:gap-4">
                    <span>Test</span>
                    <span>Module</span>
                    <span>Schedule</span>
                    <span className="text-right">Action</span>
                  </div>

                  <div>
                    {group.sets.map((set) => (
                      <PracticeSetLedgerRow
                        key={set.id}
                        set={set}
                        datePickerOpen={datePickerSetId === set.id}
                        onDatePickerOpenChange={(open) => setDatePickerSetId(open ? set.id : null)}
                        onPickDate={handlePickDate}
                        onClearDate={handleClearDate}
                        onToggleFocus={handleToggleFocus}
                        onLogScore={handleLogScoreClick}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add custom practice set</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-relaxed">
              Create a practice item for online tests or non-Cambridge mock exams.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCustomSet} className="space-y-4 py-2 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="customSource">Source name</Label>
              <Input
                id="customSource"
                type="text"
                placeholder="e.g. IELTS Online Mock"
                value={customBookName}
                onChange={(e) => setCustomBookName(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customTest">Test number</Label>
                <Input
                  id="customTest"
                  type="number"
                  min={1}
                  max={50}
                  value={customTestNumber}
                  onChange={(e) => setCustomTestNumber(Number(e.target.value))}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customSkill">Skill module</Label>
                <Select
                  value={customSkill}
                  onValueChange={(val) => val && setCustomSkill(val as typeof customSkill)}
                >
                  <SelectTrigger id="customSkill" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Listening">Listening</SelectItem>
                    <SelectItem value="Reading">Reading</SelectItem>
                    <SelectItem value="Writing">Writing</SelectItem>
                    <SelectItem value="Speaking">Speaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="customDate">Planned date</Label>
              <Input
                id="customDate"
                type="date"
                value={customTargetDate}
                onChange={(e) => setCustomTargetDate(e.target.value)}
                className="h-11 text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCustomDialogOpen(false)} className="h-11">
                Cancel
              </Button>
              <Button type="submit" className="h-11 cursor-pointer">
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ScoreEntryDialog
        open={scoreDialogOpen}
        onOpenChange={setScoreDialogOpen}
        practiceSet={selectedSet}
        currentScores={currentScores}
        targetOverall={targetOverall}
      />
    </div>
  );
}
