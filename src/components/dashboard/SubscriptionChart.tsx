"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface SubscriptionChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function SubscriptionChart({ data }: SubscriptionChartProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="p-6 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          Subscription Distribution
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Active, Paused, and Closed contracts
        </p>
      </div>

      <div className="h-64 w-full relative my-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0];
                  return (
                    <div className="p-2.5 bg-popover border border-border shadow-md rounded-lg text-xs">
                      <p className="font-semibold text-foreground">{entry.name}</p>
                      <p className="text-muted-foreground">
                        {entry.value} ({total > 0 ? Math.round(((entry.value as number) / total) * 100) : 0}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

