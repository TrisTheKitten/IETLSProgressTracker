"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  buildActivityMatrix,
  type ActivityDay,
  type ActivityLog,
} from "@/lib/activity-matrix";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;
const LEVELS = [0, 1, 2, 3, 4] as const;

function formatFullDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sessionLabel(count: number) {
  if (count <= 0) return "No sessions";
  if (count === 1) return "1 session";
  return `${count} sessions`;
}

function streakLabel(days: number) {
  if (days <= 0) return "0 days";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function cellAriaLabel(day: ActivityDay) {
  if (day.future) return `${formatFullDate(day.dateKey)}, upcoming`;
  return `${sessionLabel(day.count)} on ${formatFullDate(day.dateKey)}`;
}

interface ActivityMatrixProps {
  attempts: readonly ActivityLog[];
}

export default function ActivityMatrix({ attempts }: ActivityMatrixProps) {
  const matrix = useMemo(() => buildActivityMatrix(attempts), [attempts]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    day: ActivityDay;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollLeft = scroller.scrollWidth;
  }, [matrix.weeks.length]);

  const selected = matrix.days.find((day) => day.dateKey === selectedKey);
  const activeDays = matrix.days.filter((day) => day.count > 0);

  const showTooltip = (day: ActivityDay, target: HTMLElement) => {
    if (day.future) return;
    const rect = target.getBoundingClientRect();
    setTooltip({
      day,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const toggleDay = (day: ActivityDay) => {
    if (day.future) return;
    setSelectedKey((current) => (current === day.dateKey ? null : day.dateKey));
  };

  return (
    <section
      aria-labelledby="practice-cadence-heading"
      className="border-y border-border"
    >
      <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-7 lg:px-10">
        <div className="space-y-1.5">
          <h2
            id="practice-cadence-heading"
            className="font-heading text-2xl font-semibold tracking-tight text-foreground"
          >
            Practice cadence
          </h2>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            Each square is a day. Darker ink means more sessions logged.
          </p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {matrix.totalSessions}{" "}
          {matrix.totalSessions === 1 ? "session" : "sessions"} this year
        </p>
      </div>

      <div className="grid border-t border-border sm:grid-cols-3">
        <CadenceStat
          label="Current streak"
          value={streakLabel(matrix.currentStreak)}
        />
        <CadenceStat
          label="Longest streak"
          value={streakLabel(matrix.longestStreak)}
          className="border-t border-border sm:border-t-0 sm:border-l"
        />
        <CadenceStat
          label="Active days"
          value={`${matrix.activeDays}`}
          className="border-t border-border sm:border-t-0 sm:border-l"
        />
      </div>

      <div className="border-t border-border px-5 py-6 sm:px-7 lg:px-10">
        <div className="flex gap-3">
          <div
            aria-hidden="true"
            className="flex shrink-0 flex-col gap-[var(--activity-gap)]"
            style={{ paddingTop: "calc(1rem + var(--activity-gap))" }}
          >
            {WEEKDAY_LABELS.map((label, index) => (
              <span
                key={index}
                className="flex h-[var(--activity-cell)] items-center text-[10px] leading-none text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>

          <div
            ref={scrollerRef}
            className="min-w-0 flex-1 overflow-x-auto pb-1"
          >
            <div className="flex w-max gap-[var(--activity-gap)]">
              {matrix.weeks.map((week, weekIndex) => (
                <div
                  key={week.days[0].dateKey}
                  className="flex flex-col gap-[var(--activity-gap)]"
                  style={{ "--week": weekIndex } as CSSProperties}
                >
                  <div className="relative h-4 text-[10px] leading-4 text-muted-foreground">
                    {week.monthLabel ? (
                      <span className="absolute left-0 whitespace-nowrap">
                        {week.monthLabel}
                      </span>
                    ) : null}
                  </div>
                  {week.days.map((day) => {
                    const isSelected = selectedKey === day.dateKey;
                    if (day.future) {
                      return (
                        <span
                          key={day.dateKey}
                          className="activity-cell"
                          data-level={0}
                          data-future="true"
                          title={cellAriaLabel(day)}
                        />
                      );
                    }

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        className="activity-cell activity-cell-button"
                        data-level={day.level}
                        data-ink={day.level > 0 ? "true" : undefined}
                        aria-label={cellAriaLabel(day)}
                        aria-pressed={isSelected}
                        tabIndex={day.count > 0 ? 0 : -1}
                        onClick={() => toggleDay(day)}
                        onMouseEnter={(event) =>
                          showTooltip(day, event.currentTarget)
                        }
                        onMouseLeave={hideTooltip}
                        onFocus={(event) =>
                          showTooltip(day, event.currentTarget)
                        }
                        onBlur={hideTooltip}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {selected
              ? `${sessionLabel(selected.count)} on ${formatFullDate(selected.dateKey)}`
              : tooltip
                ? `${sessionLabel(tooltip.day.count)} on ${formatFullDate(tooltip.day.dateKey)}`
                : "Select a day to inspect it. Click again to unpin."}
          </p>
          <div
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
            aria-hidden="true"
          >
            Less
            {LEVELS.map((level) => (
              <span key={level} className="activity-cell" data-level={level} />
            ))}
            More
          </div>
        </div>

        <ol className="sr-only">
          {activeDays.map((day) => (
            <li key={day.dateKey}>{cellAriaLabel(day)}</li>
          ))}
        </ol>
      </div>

      {selected && (
        <div className="border-t border-border px-5 py-5 sm:px-7 lg:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {formatFullDate(selected.dateKey)}
          </p>
          {selected.count === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No practice logged on this day.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {selected.sessions.map((session, index) => (
                <li
                  key={`${selected.dateKey}-${session.skill}-${index}`}
                  className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-foreground">
                    {session.skill}
                  </span>
                  {session.bandScore != null && (
                    <span className="font-heading text-lg font-semibold tabular-nums text-foreground">
                      {session.bandScore.toFixed(1)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tooltip &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+0.45rem)] rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p>
              {sessionLabel(tooltip.day.count)} on{" "}
              {formatFullDate(tooltip.day.dateKey)}
            </p>
            {tooltip.day.skills.length > 0 && (
              <p className="mt-0.5 font-normal text-background/75">
                {tooltip.day.skills.join(", ")}
              </p>
            )}
          </div>,
          document.body,
        )}
    </section>
  );
}

function CadenceStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("ui-hover-cell px-5 py-5 sm:px-7 lg:px-8", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}
