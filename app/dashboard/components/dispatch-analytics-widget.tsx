"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  Package,
  Users,
  CheckCircle2,
  Clock,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  PieChart,
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
} from "recharts";
import type { DispatchAnalytics } from "@/lib/dashboards";

// Color palette for charts
const CHART_COLORS = [
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#ec4899", // pink
  "#84cc16", // lime
];

const STATUS_COLORS: Record<string, string> = {
  acknowledged: "#10b981",
  pending: "#f59e0b",
  in_transit: "#3b82f6",
  cancelled: "#ef4444",
};

// Metric card component
function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className={cn("p-2.5 rounded-lg", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl font-bold">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {trend && (
            <span
              className={cn(
                "flex items-center text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

// Main Dispatch Analytics Widget
interface DispatchAnalyticsWidgetProps {
  data: DispatchAnalytics | null;
  loading?: boolean;
  className?: string;
}

export function DispatchAnalyticsWidget({
  data,
  loading = false,
  className,
}: DispatchAnalyticsWidgetProps) {
  if (loading) {
    return (
      <Card className={cn("min-h-[400px]", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading dispatch analytics...</span>
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
            <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No dispatch analytics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { dispatch_metrics, dispatch_trend, dispatch_by_status, dispatch_by_type, top_dispatched_products, dispatch_recipients } = data;

  // Prepare chart data
  const trendChartData = dispatch_trend.map((item) => ({
    date: new Date(item.period).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    dispatches: item.dispatch_count,
    items: item.item_count,
  }));

  const statusChartData = Object.entries(dispatch_by_status).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: STATUS_COLORS[status] || CHART_COLORS[0],
  }));

  const typeChartData = Object.entries(dispatch_by_type)
    .filter(([_, count]) => count !== undefined)
    .map(([type, count], index) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count as number,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              Dispatch Analytics
            </CardTitle>
            <CardDescription>Metrics and trends for dispatch operations</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono">
            {dispatch_metrics.acknowledgment_rate.toFixed(1)}% Ack Rate
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4 mt-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard
                title="Total Dispatches"
                value={dispatch_metrics.total_dispatches}
                icon={Truck}
                iconColor="text-purple-600"
                iconBg="bg-purple-500/10"
              />
              <MetricCard
                title="Items Dispatched"
                value={dispatch_metrics.total_items_dispatched}
                icon={Package}
                iconColor="text-blue-600"
                iconBg="bg-blue-500/10"
              />
              <MetricCard
                title="Unique Recipients"
                value={dispatch_metrics.unique_recipients}
                icon={Users}
                iconColor="text-green-600"
                iconBg="bg-green-500/10"
              />
              <MetricCard
                title="Acknowledged"
                value={dispatch_metrics.acknowledged_dispatches}
                icon={CheckCircle2}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-500/10"
              />
              <MetricCard
                title="Returned Items"
                value={dispatch_metrics.returned_items}
                icon={RotateCcw}
                iconColor="text-orange-600"
                iconBg="bg-orange-500/10"
              />
              <MetricCard
                title="Acknowledgment Rate"
                value={`${dispatch_metrics.acknowledgment_rate.toFixed(1)}%`}
                icon={TrendingUp}
                iconColor="text-cyan-600"
                iconBg="bg-cyan-500/10"
              />
            </div>

            {/* Status & Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Status Breakdown */}
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                  Status Breakdown
                </h4>
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
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
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
              </div>

              {/* Type Breakdown */}
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Dispatch Types
                </h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeChartData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {typeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="mt-4">
            <div className="p-4 rounded-lg bg-muted/30 border">
              <h4 className="font-semibold text-sm mb-3">Dispatch Trend</h4>
              {trendChartData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendChartData}>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="dispatches"
                        name="Dispatches"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="items"
                        name="Items"
                        fill="#06b6d4"
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
              <h4 className="font-semibold text-sm">Top Dispatched Products</h4>
              {top_dispatched_products.length > 0 ? (
                <div className="space-y-2">
                  {top_dispatched_products.map((product, index) => (
                    <div
                      key={product.product_id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.dispatch_count} dispatches
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{product.total_dispatched.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">items</p>
                      </div>
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

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Dispatch Recipients</h4>
              {dispatch_recipients.length > 0 ? (
                <div className="space-y-2">
                  {dispatch_recipients.map((recipient, index) => (
                    <div
                      key={recipient.user_id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm">
                        {recipient.user_name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{recipient.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {recipient.dispatch_count} dispatches received
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{recipient.total_items_received.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">total items</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recipient data available
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Compact Dispatch Metrics Cards
export function DispatchMetricsCards({
  data,
  loading = false,
}: {
  data: DispatchAnalytics | null;
  loading?: boolean;
}) {
  if (loading || !data) return null;

  const metrics = data.dispatch_metrics;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-0">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-purple-600" />
          <span className="text-xs text-muted-foreground">Dispatches</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.total_dispatches}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-0">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600" />
          <span className="text-xs text-muted-foreground">Items</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.total_items_dispatched}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-0">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-green-600" />
          <span className="text-xs text-muted-foreground">Recipients</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.unique_recipients}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-xs text-muted-foreground">Acknowledged</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.acknowledged_dispatches}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-0">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-orange-600" />
          <span className="text-xs text-muted-foreground">Returned</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.returned_items}</p>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-cyan-500/10 to-sky-500/10 border-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-600" />
          <span className="text-xs text-muted-foreground">Ack Rate</span>
        </div>
        <p className="text-xl font-bold mt-1">{metrics.acknowledgment_rate.toFixed(1)}%</p>
      </Card>
    </div>
  );
}
