"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartDataPoint {
  index: number;
  dateStr: string;
  overall: number;
  fullDate?: string;
}

interface BandProgressChartProps {
  data: ChartDataPoint[];
  targetOverall: number;
}

function chartDomain(data: ChartDataPoint[], target: number): [number, number] {
  if (data.length === 0) return [0, 9];
  const values = data.map((d) => d.overall);
  const min = Math.min(...values, target);
  const max = Math.max(...values, target);
  const pad = 0.5;
  return [Math.max(0, Math.floor((min - pad) * 2) / 2), Math.min(9, Math.ceil((max + pad) * 2) / 2)];
}

function domainTicks(domain: [number, number]) {
  const ticks: number[] = [];
  for (let v = domain[0]; v <= domain[1] + 0.001; v += 0.5) {
    ticks.push(Math.round(v * 2) / 2);
  }
  return ticks;
}

export default function BandProgressChart({ data, targetOverall }: BandProgressChartProps) {
  const domain = chartDomain(data, targetOverall);
  const ticks = domainTicks(domain);

  return (
    <section aria-labelledby="band-progress-title" className="border-y border-border py-6 sm:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-primary">Band trajectory</p>
          <h2 id="band-progress-title" className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Overall band over time
          </h2>
          <p className="max-w-lg text-xs leading-5 text-muted-foreground sm:text-sm">
            Rolling overall after each session once all four skills are logged
          </p>
        </div>
        {targetOverall > 0 && (
          <p className="shrink-0 border-l border-primary pl-3 text-xs font-medium text-muted-foreground tabular-nums">
            Target <span className="text-foreground">{targetOverall.toFixed(1)}</span>
          </p>
        )}
      </header>

      <div className="mt-6 border-t border-border pt-4 sm:mt-8 sm:pt-5">
        <div
          className="h-60 w-full min-w-0 sm:h-72"
          role={data.length > 0 ? "img" : undefined}
          aria-label={data.length > 0 ? `Overall IELTS band trend across ${data.length} recorded sessions` : undefined}
        >
          {data.length === 0 ? (
            <div className="flex h-full flex-col items-start justify-center border-b border-dashed border-border py-8">
              <p className="font-serif text-xl font-semibold text-foreground">No overall timeline yet</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                Log at least one score in each skill to unlock your overall band curve.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.75} />
                <XAxis
                  dataKey="dateStr"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                  dy={10}
                  minTickGap={28}
                />
                <YAxis
                  domain={domain}
                  ticks={ticks}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                  dx={-6}
                  width={32}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload as ChartDataPoint;
                    const gap = targetOverall - point.overall;
                    return (
                      <div className="border border-border bg-popover px-3 py-2.5 text-popover-foreground">
                        <p className="text-xs text-muted-foreground">{point.dateStr}</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                          Overall {point.overall.toFixed(1)}
                        </p>
                        {targetOverall > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {gap <= 0 ? (
                              <span className="font-medium text-foreground">Target achieved</span>
                            ) : (
                              <>
                                <span className="font-medium text-foreground">{gap.toFixed(1)}</span>
                                {" below target"}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                {targetOverall > 0 && (
                  <ReferenceLine
                    y={targetOverall}
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.65}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="overall"
                  stroke="var(--primary)"
                  strokeWidth={2.25}
                  isAnimationActive={false}
                  dot={{
                    r: 3.5,
                    stroke: "var(--primary)",
                    strokeWidth: 1.5,
                    fill: "var(--background)",
                  }}
                  activeDot={{
                    r: 5.5,
                    fill: "var(--primary)",
                    stroke: "var(--background)",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
