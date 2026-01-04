"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Color palette
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#00C49F",
];

const STATIC_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

// Custom tooltip component
function CustomTooltip({ active, payload, label, formatter }: TooltipProps<number, string> & { formatter?: (value: number) => string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[150px]">
      <p className="text-sm font-medium mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
          <span className="font-medium">
            {formatter ? formatter(entry.value as number) : entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// Area Chart Component
interface AreaChartCardProps {
  title: string;
  description?: string;
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  loading?: boolean;
  height?: number;
  gradient?: boolean;
  color?: string;
  formatter?: (value: number) => string;
  className?: string;
}

export function AreaChartCard({
  title,
  description,
  data,
  dataKey,
  xAxisKey = "name",
  loading = false,
  height = 300,
  gradient = true,
  color = STATIC_COLORS[0],
  formatter,
  className,
}: AreaChartCardProps) {
  const gradientId = React.useId();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              {gradient && (
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
              )}
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={xAxisKey}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => (formatter ? formatter(value) : value.toLocaleString())}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip formatter={formatter} />} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={gradient ? `url(#${gradientId})` : color}
                fillOpacity={gradient ? 1 : 0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Bar Chart Component
interface BarChartCardProps {
  title: string;
  description?: string;
  data: any[];
  dataKeys: { key: string; name: string; color?: string }[];
  xAxisKey?: string;
  loading?: boolean;
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
  formatter?: (value: number) => string;
  className?: string;
}

export function BarChartCard({
  title,
  description,
  data,
  dataKeys,
  xAxisKey = "name",
  loading = false,
  height = 300,
  stacked = false,
  horizontal = false,
  formatter,
  className,
}: BarChartCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              layout={horizontal ? "vertical" : "horizontal"}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              {horizontal ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey={xAxisKey} type="category" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={100} />
                </>
              ) : (
                <>
                  <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => (formatter ? formatter(value) : value.toLocaleString())} />
                </>
              )}
              <Tooltip content={<CustomTooltip formatter={formatter} />} />
              <Legend />
              {dataKeys.map((dk, index) => (
                <Bar
                  key={dk.key}
                  dataKey={dk.key}
                  name={dk.name}
                  fill={dk.color || STATIC_COLORS[index % STATIC_COLORS.length]}
                  stackId={stacked ? "stack" : undefined}
                  radius={stacked ? 0 : [4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Pie Chart Component
interface PieChartCardProps {
  title: string;
  description?: string;
  data: { name: string; value: number; color?: string }[];
  loading?: boolean;
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function PieChartCard({
  title,
  description,
  data,
  loading = false,
  height = 300,
  showLegend = true,
  innerRadius = 0,
  formatter,
  className,
}: PieChartCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-full max-w-[300px] mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={height / 3}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || STATIC_COLORS[index % STATIC_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatter ? formatter(value) : value.toLocaleString(), ""]}
              />
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
          
          {/* Legend with values */}
          <div className="mt-4 space-y-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color || STATIC_COLORS[index % STATIC_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatter ? formatter(item.value) : item.value.toLocaleString()}</span>
                  <span className="text-muted-foreground text-xs">
                    ({((item.value / total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Line Chart Component
interface LineChartCardProps {
  title: string;
  description?: string;
  data: any[];
  dataKeys: { key: string; name: string; color?: string }[];
  xAxisKey?: string;
  loading?: boolean;
  height?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function LineChartCard({
  title,
  description,
  data,
  dataKeys,
  xAxisKey = "name",
  loading = false,
  height = 300,
  formatter,
  className,
}: LineChartCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={xAxisKey}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => (formatter ? formatter(value) : value.toLocaleString())}
              />
              <Tooltip content={<CustomTooltip formatter={formatter} />} />
              <Legend />
              {dataKeys.map((dk, index) => (
                <Line
                  key={dk.key}
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.name}
                  stroke={dk.color || STATIC_COLORS[index % STATIC_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Simple stat display for charts
interface ChartStatProps {
  label: string;
  value: string | number;
  color?: string;
}

export function ChartStat({ label, value, color }: ChartStatProps) {
  return (
    <div className="flex items-center gap-2">
      {color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />}
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium">{typeof value === "number" ? value.toLocaleString() : value}</span>
    </div>
  );
}
