"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wrench,
  Package,
  CheckCircle2,
  Clock,
  Loader2 as LoaderIcon,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  PieChart,
  Target,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import type { RepairAnalytics } from "@/lib/dashboards";

// Color palette for charts
const CHART_COLORS = [
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ef4444", // red
  "#3b82f6", // blue
  "#ec4899", // pink
  "#84cc16", // lime
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  completed: "#10b981",
  cancelled: "#ef4444",
};

// Metric card component
function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  variant?: "default" | "success" | "warning" | "info";
  iconColor?: string;
  iconBg?: string;
}) {
  const variants = {
    default: "",
    success: "border-green-200 bg-green-50/50 dark:bg-green-950/20",
    warning: "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20",
    info: "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20",
  };

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors",
      variants[variant]
    )}>
      <div className={cn("p-2.5 rounded-lg", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        <p className="text-xl font-bold mt-1">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

// Progress Ring Component
function ProgressRing({
  value,
  label,
  size = 120,
  strokeWidth = 10,
  color = "#10b981",
}: {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{value.toFixed(0)}%</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

// Main Repair Analytics Widget
interface RepairAnalyticsWidgetProps {
  data: RepairAnalytics | null;
  loading?: boolean;
  className?: string;
}

export function RepairAnalyticsWidget({
  data,
  loading = false,
  className,
}: RepairAnalyticsWidgetProps) {
  if (loading) {
    return (
      <Card className={cn("min-h-[400px]", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading repair analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={cn("min-h-[400px]", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No repair analytics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { repair_metrics, repair_trend, repair_by_status, repair_success_rate, most_repaired_products } = data;

  // Prepare chart data
  const trendChartData = repair_trend.map((item) => ({
    date: new Date(item.period).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    repairs: item.repair_count,
  }));

  const statusChartData = Object.entries(repair_by_status)
    .filter(([_, count]) => count !== undefined && count > 0)
    .map(([status, count]) => ({
      name: status.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      value: count as number,
      color: STATUS_COLORS[status] || CHART_COLORS[0],
    }));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-green-600" />
              Repair Analytics
            </CardTitle>
            <CardDescription>Repair tracking and success rates</CardDescription>
          </div>
          <Badge 
            variant={repair_metrics.completion_rate >= 80 ? "default" : "secondary"}
            className={cn(
              "font-mono",
              repair_metrics.completion_rate >= 80 && "bg-green-600"
            )}
          >
            {repair_metrics.completion_rate.toFixed(0)}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="success">Success Rate</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4 mt-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                title="Total Repairs"
                value={repair_metrics.total_repairs}
                icon={Wrench}
                iconColor="text-green-600"
                iconBg="bg-green-500/10"
              />
              <MetricCard
                title="Items for Repair"
                value={repair_metrics.total_items_for_repair}
                icon={Package}
                iconColor="text-blue-600"
                iconBg="bg-blue-500/10"
              />
              <MetricCard
                title="Repaired Items"
                value={repair_metrics.repaired_items}
                icon={CheckCircle2}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-500/10"
                variant="success"
              />
              <MetricCard
                title="Completion Rate"
                value={`${repair_metrics.completion_rate.toFixed(0)}%`}
                icon={TrendingUp}
                iconColor="text-cyan-600"
                iconBg="bg-cyan-500/10"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                title="Completed"
                value={repair_metrics.completed}
                icon={CheckCircle2}
                iconColor="text-green-600"
                iconBg="bg-green-500/10"
                variant="success"
              />
              <MetricCard
                title="In Progress"
                value={repair_metrics.in_progress}
                icon={LoaderIcon}
                iconColor="text-blue-600"
                iconBg="bg-blue-500/10"
                variant="info"
              />
              <MetricCard
                title="Pending"
                value={repair_metrics.pending}
                icon={Clock}
                iconColor="text-yellow-600"
                iconBg="bg-yellow-500/10"
                variant="warning"
              />
              <MetricCard
                title="Approved"
                value={repair_metrics.approved}
                icon={CheckCircle2}
                iconColor="text-purple-600"
                iconBg="bg-purple-500/10"
              />
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                  Status Breakdown
                </h4>
                {statusChartData.length > 0 ? (
                  <>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                      {statusChartData.map((item) => (
                        <Badge
                          key={item.name}
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: item.color, color: item.color }}
                        >
                          {item.name}: {item.value}
                        </Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                    No status data available
                  </div>
                )}
              </div>

              {/* Completion Progress */}
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Completion Progress
                </h4>
                <div className="flex items-center justify-center h-[180px]">
                  <ProgressRing
                    value={repair_metrics.completion_rate}
                    label="Completion Rate"
                    color="#10b981"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Success Rate Tab */}
          <TabsContent value="success" className="mt-4">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Repair Success Analysis</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground font-medium">Total Items</span>
                  </div>
                  <p className="text-2xl font-bold">{repair_success_rate.total_items.toLocaleString()}</p>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <span className="text-xs text-muted-foreground font-medium">Repairable Items</span>
                  </div>
                  <p className="text-2xl font-bold">{repair_success_rate.repairable_items.toLocaleString()}</p>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-muted-foreground font-medium">Repaired Items</span>
                  </div>
                  <p className="text-2xl font-bold">{repair_success_rate.repaired_items.toLocaleString()}</p>
                </Card>
              </div>

              {/* Success Rate Visualization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <h4 className="font-semibold text-sm mb-4 text-center">Repairability Rate</h4>
                  <div className="flex justify-center">
                    <ProgressRing
                      value={repair_success_rate.repairability_rate}
                      label="Items that can be repaired"
                      color="#8b5cf6"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border">
                  <h4 className="font-semibold text-sm mb-4 text-center">Repair Success Rate</h4>
                  <div className="flex justify-center">
                    <ProgressRing
                      value={repair_success_rate.repair_success_rate}
                      label="Successfully repaired"
                      color="#10b981"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-sm text-green-700 dark:text-green-400">Repair Summary</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Repairs</p>
                    <p className="font-bold">{repair_metrics.total_repairs}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Items Repaired</p>
                    <p className="font-bold text-green-600">{repair_success_rate.repaired_items}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Repairability</p>
                    <p className="font-bold">{repair_success_rate.repairability_rate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Success Rate</p>
                    <p className="font-bold">{repair_success_rate.repair_success_rate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="mt-4">
            <div className="p-4 rounded-lg bg-muted/30 border">
              <h4 className="font-semibold text-sm mb-3">Repair Trend</h4>
              {trendChartData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendChartData}>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="repairs"
                        name="Repairs"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Most Repaired Products</h4>
              {most_repaired_products.length > 0 ? (
                <div className="space-y-2">
                  {most_repaired_products.map((product, index) => {
                    const repairRate = product.total_for_repair > 0 
                      ? (product.total_repaired / product.total_for_repair) * 100 
                      : 0;
                    
                    return (
                      <div
                        key={product.product_id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.repair_count} repair requests
                          </p>
                        </div>
                        <div className="text-center px-3">
                          <p className="text-sm font-bold">{product.total_for_repair}</p>
                          <p className="text-xs text-muted-foreground">for repair</p>
                        </div>
                        <div className="text-center px-3">
                          <p className="text-sm font-bold text-green-600">{product.total_repaired}</p>
                          <p className="text-xs text-muted-foreground">repaired</p>
                        </div>
                        <div className="w-20">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Rate</span>
                            <span className="font-medium">{repairRate.toFixed(0)}%</span>
                          </div>
                          <Progress value={repairRate} className="h-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No product data available
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Compact Repair Metrics Cards
export function RepairMetricsCards({
  data,
  loading = false,
}: {
  data: RepairAnalytics | null;
  loading?: boolean;
}) {
  if (loading || !data) return null;

  const metrics = data.repair_metrics;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-0">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-green-600" />
          <span className="text-xs text-muted-foreground">Repairs</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.total_repairs}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-0">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600" />
          <span className="text-xs text-muted-foreground">For Repair</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.total_items_for_repair}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-xs text-muted-foreground">Repaired</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.repaired_items}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-green-500/10 to-lime-500/10 border-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.completed}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.pending}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-cyan-500/10 to-sky-500/10 border-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-600" />
          <span className="text-xs text-muted-foreground">Completion</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.completion_rate.toFixed(0)}%</p>
      </Card>
    </div>
  );
}
