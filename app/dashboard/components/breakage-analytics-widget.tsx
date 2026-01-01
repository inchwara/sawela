"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  PieChart,
  Truck,
  AlertCircle,
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
import type { BreakageAnalytics } from "@/lib/dashboards";

// Color palette for charts
const CHART_COLORS = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ec4899", // pink
  "#84cc16", // lime
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
  resolved: "#3b82f6",
  dispatch_initiated: "#8b5cf6",
};

const CAUSE_COLORS: Record<string, string> = {
  equipment_malfunction: "#ef4444",
  handling_error: "#f59e0b",
  transport_damage: "#8b5cf6",
  storage_issue: "#06b6d4",
  quality_defect: "#ec4899",
  other: "#6b7280",
};

// Format currency
const formatKES = (amount: number) => `KES ${amount.toLocaleString()}`;

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
  variant?: "default" | "danger" | "warning" | "success";
  iconColor?: string;
  iconBg?: string;
}) {
  const variants = {
    default: "",
    danger: "border-red-200 bg-red-50/50 dark:bg-red-950/20",
    warning: "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20",
    success: "border-green-200 bg-green-50/50 dark:bg-green-950/20",
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

// Main Breakage Analytics Widget
interface BreakageAnalyticsWidgetProps {
  data: BreakageAnalytics | null;
  loading?: boolean;
  className?: string;
}

export function BreakageAnalyticsWidget({
  data,
  loading = false,
  className,
}: BreakageAnalyticsWidgetProps) {
  if (loading) {
    return (
      <Card className={cn("min-h-[400px]", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading breakage analytics...</span>
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
            <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No breakage analytics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { breakage_metrics, breakage_trend, breakage_by_status, breakage_by_cause, most_broken_products, breakage_cost_analysis } = data;

  // Prepare chart data
  const trendChartData = breakage_trend.map((item) => ({
    date: new Date(item.period).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    breakages: item.breakage_count,
  }));

  const statusChartData = Object.entries(breakage_by_status)
    .filter(([_, count]) => count !== undefined && count > 0)
    .map(([status, count]) => ({
      name: status.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      value: count as number,
      color: STATUS_COLORS[status] || CHART_COLORS[0],
    }));

  const causeChartData = breakage_by_cause.map((item, index) => ({
    name: item.cause.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    count: item.count,
    quantity: item.quantity,
    color: CAUSE_COLORS[item.cause] || CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Breakage Analytics
            </CardTitle>
            <CardDescription>Breakage reports and cost analysis</CardDescription>
          </div>
          <Badge 
            variant={breakage_metrics.resolution_rate > 50 ? "default" : "destructive"}
            className="font-mono"
          >
            {breakage_metrics.resolution_rate.toFixed(1)}% Resolved
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="causes">Causes</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4 mt-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                title="Total Breakages"
                value={breakage_metrics.total_breakages}
                icon={AlertTriangle}
                iconColor="text-red-600"
                iconBg="bg-red-500/10"
                variant="danger"
              />
              <MetricCard
                title="Broken Items"
                value={breakage_metrics.total_broken_items}
                icon={Package}
                iconColor="text-orange-600"
                iconBg="bg-orange-500/10"
                variant="warning"
              />
              <MetricCard
                title="Resolved"
                value={breakage_metrics.resolved}
                icon={CheckCircle2}
                iconColor="text-green-600"
                iconBg="bg-green-500/10"
                variant="success"
              />
              <MetricCard
                title="Pending"
                value={breakage_metrics.pending}
                icon={Clock}
                iconColor="text-yellow-600"
                iconBg="bg-yellow-500/10"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard
                title="Approved"
                value={breakage_metrics.approved}
                icon={CheckCircle2}
                iconColor="text-blue-600"
                iconBg="bg-blue-500/10"
              />
              <MetricCard
                title="Replacement Requested"
                value={breakage_metrics.replacement_requested}
                icon={Truck}
                iconColor="text-purple-600"
                iconBg="bg-purple-500/10"
              />
              <MetricCard
                title="Resolution Rate"
                value={`${breakage_metrics.resolution_rate.toFixed(1)}%`}
                icon={TrendingUp}
                iconColor="text-cyan-600"
                iconBg="bg-cyan-500/10"
              />
            </div>

            {/* Status Breakdown & Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Status Breakdown */}
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

              {/* Trend Chart */}
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Breakage Trend
                </h4>
                {trendChartData.length > 0 ? (
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendChartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="breakages"
                          name="Breakages"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ fill: "#ef4444" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Causes Tab */}
          <TabsContent value="causes" className="mt-4">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Breakages by Cause</h4>
              {causeChartData.length > 0 ? (
                <>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={causeChartData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Incidents" fill="#ef4444" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="quantity" name="Items Affected" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {causeChartData.map((cause) => (
                      <div
                        key={cause.name}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cause.color }}
                          />
                          <span className="font-medium text-sm">{cause.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {cause.count} incidents
                          </span>
                          <Badge variant="destructive">
                            {cause.quantity} items
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No cause data available
                </div>
              )}
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Most Broken Products</h4>
              {most_broken_products.length > 0 ? (
                <div className="space-y-2">
                  {most_broken_products.map((product, index) => (
                    <div
                      key={product.product_id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.breakage_count} breakage reports
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-red-600">{product.total_broken.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">items broken</p>
                      </div>
                      {product.estimated_loss > 0 && (
                        <div className="text-right pl-4 border-l">
                          <p className="font-bold text-sm">{formatKES(product.estimated_loss)}</p>
                          <p className="text-xs text-muted-foreground">est. loss</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No product data available
                </div>
              )}
            </div>
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="mt-4">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Cost Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    <span className="text-xs text-muted-foreground font-medium">Total Estimated Loss</span>
                  </div>
                  <p className="text-2xl font-bold">{formatKES(breakage_cost_analysis.total_estimated_loss)}</p>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-orange-600" />
                    <span className="text-xs text-muted-foreground font-medium">Total Items Lost</span>
                  </div>
                  <p className="text-2xl font-bold">{breakage_cost_analysis.total_items_lost.toLocaleString()}</p>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="text-xs text-muted-foreground font-medium">Avg Loss per Breakage</span>
                  </div>
                  <p className="text-2xl font-bold">{formatKES(breakage_cost_analysis.avg_loss_per_breakage)}</p>
                </Card>
              </div>

              {/* Cost Summary */}
              <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">Loss Summary</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Breakages</p>
                    <p className="font-bold">{breakage_metrics.total_breakages}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Items Affected</p>
                    <p className="font-bold">{breakage_metrics.total_broken_items}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resolution Rate</p>
                    <p className="font-bold">{breakage_metrics.resolution_rate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Financial Impact</p>
                    <p className="font-bold text-red-600">{formatKES(breakage_cost_analysis.total_estimated_loss)}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Compact Breakage Metrics Cards
export function BreakageMetricsCards({
  data,
  loading = false,
}: {
  data: BreakageAnalytics | null;
  loading?: boolean;
}) {
  if (loading || !data) return null;

  const metrics = data.breakage_metrics;
  const costs = data.breakage_cost_analysis;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="p-3 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-xs text-muted-foreground">Breakages</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.total_breakages}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-0">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-orange-600" />
          <span className="text-xs text-muted-foreground">Items Broken</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.total_broken_items}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-xs text-muted-foreground">Resolved</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.resolved}</p>
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
          <span className="text-xs text-muted-foreground">Resolution Rate</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.resolution_rate.toFixed(0)}%</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-red-500/10 to-pink-500/10 border-0">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-red-600" />
          <span className="text-xs text-muted-foreground">Est. Loss</span>
        </div>
        <p className="text-lg font-bold mt-1">{formatKES(costs.total_estimated_loss)}</p>
      </Card>
    </div>
  );
}
