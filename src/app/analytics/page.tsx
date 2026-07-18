"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from "recharts";
import { BarChart3 } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { useAnalyticsData } from "@/features/analytics/use-analytics-data";
import { CompletionHeatmap } from "@/features/analytics/completion-heatmap";

export default function AnalyticsPage() {
  const { heatmap, proteinTrend, totals } = useAnalyticsData();

  return (
    <PageShell>
      <PageHeader eyebrow="Analytics" title="Consistency" />

      <Card className="mb-4">
        <CardHeader
          title="90-day heatmap"
          subtitle="Green ≥70% · Yellow 40–70% · Red <40%"
          right={<BarChart3 className="w-4 h-4 text-text-faint" />}
        />
        <CompletionHeatmap days={heatmap} />
      </Card>

      <Card className="mb-4">
        <CardHeader title="Protein — last 7 days" />
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={proteinTrend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text-faint)", fontSize: 10 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--text-muted)" }}
              />
              <Line
                type="monotone"
                dataKey="grams"
                stroke="var(--accent-energy)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--accent-energy)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col items-center py-4">
          <p className="font-mono-tab text-xl font-semibold text-text">{totals.problems}</p>
          <p className="text-[11px] text-text-muted mt-0.5 text-center">Problems solved</p>
        </Card>
        <Card className="flex flex-col items-center py-4">
          <p className="font-mono-tab text-xl font-semibold text-text">{totals.sessions}</p>
          <p className="text-[11px] text-text-muted mt-0.5 text-center">Workouts logged</p>
        </Card>
        <Card className="flex flex-col items-center py-4">
          <p className="font-mono-tab text-xl font-semibold text-text">{totals.notes}</p>
          <p className="text-[11px] text-text-muted mt-0.5 text-center">Notes written</p>
        </Card>
      </div>
    </PageShell>
  );
}
