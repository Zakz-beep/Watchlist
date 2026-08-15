// components/watchlist/SparklineChart.tsx
"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

interface SparklineChartProps {
  data: number[];
  positive?: boolean;
  height?: number;
}

export function SparklineChart({ data, positive = true, height = 40 }: SparklineChartProps) {
  if (!data || data.length < 2) {
    return <div className="skeleton" style={{ height, width: 80 }} />;
  }

  const chartData = data.map((value, i) => ({ i, value }));
  const color = positive ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)";

  return (
    <ResponsiveContainer width={80} height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ display: "none" }}
          cursor={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
