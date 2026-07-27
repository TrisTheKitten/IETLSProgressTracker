"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePrefersReducedMotion } from "@/lib/hooks";

export type ChartDataPointInput = {
  index: number;
  dateStr: string;
  fullDate?: string;
} & ({ value: number } | { overall: number });

interface ChartDataPoint {
  index: number;
  dateStr: string;
  value: number;
  fullDate?: string;
}

interface BandProgressChartProps {
  data: ChartDataPointInput[];
  targetBand?: number;
  /** @deprecated Use targetBand */
  targetOverall?: number;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  valueLabel?: string;
  ariaLabel?: string;
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  value?: number;
  payload?: ChartDataPoint;
}

const DEFAULTS = {
  eyebrow: "Band trajectory",
  title: "Overall band over time",
  subtitle:
    "Rolling overall after each session once all four skills are logged",
  emptyTitle: "No overall timeline yet",
  emptyDescription:
    "Log at least one score in each skill to unlock your overall band curve.",
  valueLabel: "Overall",
} as const;

function normalizePoint(point: ChartDataPointInput): ChartDataPoint {
  const value = "value" in point ? point.value : point.overall;
  return {
    index: point.index,
    dateStr: point.dateStr,
    fullDate: point.fullDate,
    value,
  };
}

function chartDomain(data: ChartDataPoint[], target: number): [number, number] {
  if (data.length === 0) return [0, 9];
  const values = data.map((d) => d.value);
  const min = Math.min(...values, target);
  const max = Math.max(...values, target);
  const pad = 0.5;
  return [
    Math.max(0, Math.floor((min - pad) * 2) / 2),
    Math.min(9, Math.ceil((max + pad) * 2) / 2),
  ];
}

function domainTicks(domain: [number, number]) {
  const ticks: number[] = [];
  for (let v = domain[0]; v <= domain[1] + 0.001; v += 0.5) {
    ticks.push(Math.round(v * 2) / 2);
  }
  return ticks;
}

export default function BandProgressChart({
  data: rawData,
  targetBand,
  targetOverall,
  title = DEFAULTS.title,
  subtitle = DEFAULTS.subtitle,
  eyebrow = DEFAULTS.eyebrow,
  emptyTitle = DEFAULTS.emptyTitle,
  emptyDescription = DEFAULTS.emptyDescription,
  valueLabel = DEFAULTS.valueLabel,
  ariaLabel,
}: BandProgressChartProps) {
  const data = rawData.map(normalizePoint);
  const target = targetBand ?? targetOverall ?? 0;
  const domain = chartDomain(data, target);
  const ticks = domainTicks(domain);
  const reduceMotion = usePrefersReducedMotion();
  const gradientId = useId();
  const lastIndex = data.length - 1;
  const chartAriaLabel =
    ariaLabel ??
    (data.length > 0
      ? `${valueLabel} IELTS band trend across ${data.length} recorded sessions`
      : undefined);

  const renderDot = (props: DotProps) => {
    const { cx, cy, index, payload } = props;
    const num = typeof payload?.value === "number" ? payload.value : 0;
    if (cx == null || cy == null) return <g key={`dot-${index ?? 0}`} />;

    if (index === lastIndex) {
      const labelBelow = cy < 26;
      return (
        <g key={`dot-${index}`}>
          <circle cx={cx} cy={cy} r="8" fill="var(--primary)" opacity="0.14" />
          <circle
            cx={cx}
            cy={cy}
            r="4"
            fill="var(--primary)"
            stroke="var(--background)"
            strokeWidth="2"
          />
          <text
            x={cx}
            y={labelBelow ? cy + 20 : cy - 12}
            textAnchor="middle"
            style={{ fontSize: 11, fontWeight: 600, fill: "var(--foreground)" }}
          >
            {num.toFixed(1)}
          </text>
        </g>
      );
    }

    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r="3"
        fill="var(--background)"
        stroke="var(--primary)"
        strokeWidth="1.5"
      />
    );
  };

  return (
    <section
      aria-labelledby="band-progress-title"
      className="border-y border-border py-6 sm:py-8"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-primary">{eyebrow}</p>
          <h2
            id="band-progress-title"
            className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            {title}
          </h2>
          <p className="max-w-lg text-xs leading-5 text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="h-[2px] w-5 bg-primary" aria-hidden="true" />
            {valueLabel}
          </span>
          {target > 0 && (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span
                className="w-5 border-t-2 border-dashed"
                style={{ borderColor: "var(--primary)" }}
                aria-hidden="true"
              />
              Target{" "}
              <span className="tabular-nums text-foreground">
                {target.toFixed(1)}
              </span>
            </span>
          )}
        </div>
      </header>

      <div className="mt-6 border-t border-border pt-4 sm:mt-8 sm:pt-5">
        <div
          className="h-64 w-full min-w-0 sm:h-72"
          role={data.length > 0 ? "img" : undefined}
          aria-label={chartAriaLabel}
        >
          {data.length === 0 ? (
            <div className="ledger-graph-paper flex h-full flex-col justify-center border-b border-l border-border px-6 py-8">
              <p className="font-serif text-xl font-semibold text-foreground">
                {emptyTitle}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                {emptyDescription}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 24, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeOpacity={0.6}
                />
                <XAxis
                  dataKey="dateStr"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)", strokeWidth: 1 }}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                  dy={10}
                  minTickGap={28}
                />
                <YAxis
                  domain={domain}
                  ticks={ticks}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)", strokeWidth: 1 }}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                  dx={-6}
                  width={34}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip
                  cursor={{
                    stroke: "var(--border)",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload as ChartDataPoint;
                    const gap = target - point.value;
                    return (
                      <div className="border border-border bg-popover px-3 py-2.5 text-popover-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                          <p className="text-xs text-muted-foreground">
                            {point.fullDate ?? point.dateStr}
                          </p>
                        </div>
                        <p className="mt-1 font-serif text-base font-semibold tabular-nums text-foreground">
                          {valueLabel} {point.value.toFixed(1)}
                        </p>
                        {target > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {gap <= 0 ? (
                              <span className="font-medium text-foreground">
                                Target achieved
                              </span>
                            ) : (
                              <>
                                <span className="font-medium text-foreground">
                                  {gap.toFixed(1)}
                                </span>
                                {" below target"}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                {target > 0 && (
                  <ReferenceLine
                    y={target}
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2.25}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={!reduceMotion}
                  animationDuration={900}
                  animationEasing="ease-out"
                  dot={renderDot}
                  activeDot={{
                    r: 5,
                    fill: "var(--primary)",
                    stroke: "var(--background)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
