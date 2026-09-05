import type { Skill } from "@/lib/domain";

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export type ActivitySession = {
  skill: Skill;
  bandScore?: number;
};

export type ActivityDay = {
  dateKey: string;
  weekday: number;
  count: number;
  level: ActivityLevel;
  skills: Skill[];
  sessions: ActivitySession[];
  future: boolean;
  monthLabel: string | null;
};

export type ActivityWeek = {
  days: ActivityDay[];
  monthLabel: string | null;
};

export type ActivityMatrix = {
  weeks: ActivityWeek[];
  days: ActivityDay[];
  totalSessions: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
};

export type ActivityLog = {
  date: string;
  skill: Skill;
  bandScore?: number;
};

const MS_PER_DAY = 86_400_000;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function activityLevel(count: number): ActivityLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateKeyFromIso(iso: string): string {
  return localDateKey(new Date(iso));
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfSundayWeek(date: Date): Date {
  const start = startOfLocalDay(date);
  return addLocalDays(start, -start.getDay());
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function previousDateKey(dateKey: string): string {
  return localDateKey(addLocalDays(parseDateKey(dateKey), -1));
}

function uniqueDateKeys(attempts: readonly ActivityLog[]): string[] {
  const keys = new Set<string>();
  for (const attempt of attempts) {
    const parsed = new Date(attempt.date);
    if (Number.isNaN(parsed.getTime())) continue;
    keys.add(localDateKey(parsed));
  }
  return [...keys].sort();
}

function dayCount(fromKey: string, toKey: string): number {
  return Math.round(
    (parseDateKey(toKey).getTime() - parseDateKey(fromKey).getTime()) /
      MS_PER_DAY,
  );
}

function longestConsecutive(keys: readonly string[]): number {
  if (keys.length === 0) return 0;

  let longest = 1;
  let run = 1;
  for (let index = 1; index < keys.length; index++) {
    if (dayCount(keys[index - 1], keys[index]) === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return longest;
}

function currentStreak(
  activeKeys: ReadonlySet<string>,
  todayKey: string,
): number {
  const yesterdayKey = previousDateKey(todayKey);
  let cursor = activeKeys.has(todayKey) ? todayKey : yesterdayKey;
  if (!activeKeys.has(cursor)) return 0;

  let streak = 0;
  while (activeKeys.has(cursor)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }
  return streak;
}

function groupSessions(attempts: readonly ActivityLog[]) {
  const byDay = new Map<string, ActivitySession[]>();

  for (const attempt of attempts) {
    const parsed = new Date(attempt.date);
    if (Number.isNaN(parsed.getTime())) continue;
    const dateKey = localDateKey(parsed);
    const sessions = byDay.get(dateKey) ?? [];
    sessions.push({
      skill: attempt.skill,
      bandScore: attempt.bandScore,
    });
    byDay.set(dateKey, sessions);
  }

  return byDay;
}

function uniqueSkills(sessions: readonly ActivitySession[]): Skill[] {
  const seen = new Set<Skill>();
  const skills: Skill[] = [];
  for (const session of sessions) {
    if (seen.has(session.skill)) continue;
    seen.add(session.skill);
    skills.push(session.skill);
  }
  return skills;
}

export function buildActivityMatrix(
  attempts: readonly ActivityLog[],
  now: Date = new Date(),
): ActivityMatrix {
  const today = startOfLocalDay(now);
  const todayKey = localDateKey(today);
  const yearAgo = new Date(
    today.getFullYear() - 1,
    today.getMonth(),
    today.getDate(),
  );
  const gridStart = startOfSundayWeek(yearAgo);
  const gridEnd = addLocalDays(startOfSundayWeek(today), 6);

  const sessionsByDay = groupSessions(attempts);
  const allActiveKeys = new Set(uniqueDateKeys(attempts));

  const weeks: ActivityWeek[] = [];
  let cursor = gridStart;
  let lastMonth = -1;

  while (cursor.getTime() <= gridEnd.getTime()) {
    const days: ActivityDay[] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      const dateKey = localDateKey(cursor);
      const future = cursor.getTime() > today.getTime();
      const sessions = future ? [] : (sessionsByDay.get(dateKey) ?? []);
      const count = sessions.length;
      const isMonthStart = cursor.getDate() === 1;

      days.push({
        dateKey,
        weekday,
        count,
        level: activityLevel(count),
        skills: uniqueSkills(sessions),
        sessions,
        future,
        monthLabel: isMonthStart ? MONTH_LABELS[cursor.getMonth()] : null,
      });
      cursor = addLocalDays(cursor, 1);
    }

    const monthAnchor =
      days.find((day) => day.monthLabel)?.monthLabel ??
      (weeks.length === 0
        ? MONTH_LABELS[parseDateKey(days[0].dateKey).getMonth()]
        : null);
    const monthIndex = monthAnchor
      ? MONTH_LABELS.indexOf(monthAnchor as (typeof MONTH_LABELS)[number])
      : -1;
    const monthLabel =
      monthAnchor && monthIndex !== lastMonth ? monthAnchor : null;
    if (monthLabel) lastMonth = monthIndex;

    weeks.push({ days, monthLabel });
  }

  const days = weeks.flatMap((week) => week.days);
  const visibleDays = days.filter((day) => !day.future);
  const totalSessions = visibleDays.reduce((sum, day) => sum + day.count, 0);
  const activeDays = visibleDays.filter((day) => day.count > 0).length;

  return {
    weeks,
    days,
    totalSessions,
    activeDays,
    currentStreak: currentStreak(allActiveKeys, todayKey),
    longestStreak: longestConsecutive([...allActiveKeys].sort()),
  };
}
