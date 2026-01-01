"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  StockAnalytics, 
  StockItem,
  StockVelocity,
  StockAging,
  ABCAnalysis,
  StockMovementSummary
} from "@/lib/dashboards";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  BarChart3,
  Clock,
  DollarSign,
  Activity,
  Zap,
  Snail,
  Skull
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StockAnalyticsWidgetProps {
  data: StockAnalytics | null;
  loading?: boolean;
}

interface StockMetricsCardsProps {
  data: StockAnalytics | null;
  loading?: boolean;
}

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];
const VELOCITY_COLORS = {
  fast_moving: "#22c55e",
  medium_moving: "#3b82f6", 
  slow_moving: "#f59e0b",
  dead_stock: "#ef4444"
};

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format number with commas
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// Metrics Cards Component
export function StockMetricsCards({ data, loading }: StockMetricsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data?.stock_overview) return null;

  const overview = data.stock_overview;

  const metricCards = [
    {
      title: "Total Products",
      value: formatNumber(overview.total_products),
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Units",
      value: formatNumber(overview.total_units),
      icon: Boxes,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Stock Health",
      value: `${overview.stock_health_percentage}%`,
      icon: overview.stock_health_percentage >= 70 ? CheckCircle2 : AlertTriangle,
      color: overview.stock_health_percentage >= 70 ? "text-green-600" : "text-amber-600",
      bgColor: overview.stock_health_percentage >= 70 ? "bg-green-50" : "bg-amber-50",
    },
    {
      title: "Retail Value",
      value: formatCurrency(overview.total_retail_value),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metricCards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Main Widget Component
export function StockAnalyticsWidget({ data, loading }: StockAnalyticsWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { 
    stock_overview, 
    fast_moving_stock,
    slow_moving_stock,
    stock_velocity,
    stock_aging,
    stock_value_analysis,
    abc_analysis,
    stock_movement_summary,
    reorder_recommendations
  } = data;

  // Transform velocity data for chart
  const velocityData = [
    { name: "Fast Moving", value: stock_velocity.fast_moving.count, units: stock_velocity.fast_moving.total_units, fill: VELOCITY_COLORS.fast_moving },
    { name: "Medium Moving", value: stock_velocity.medium_moving.count, units: stock_velocity.medium_moving.total_units, fill: VELOCITY_COLORS.medium_moving },
    { name: "Slow Moving", value: stock_velocity.slow_moving.count, units: stock_velocity.slow_moving.total_units, fill: VELOCITY_COLORS.slow_moving },
    { name: "Dead Stock", value: stock_velocity.dead_stock.count, units: stock_velocity.dead_stock.total_units, fill: VELOCITY_COLORS.dead_stock },
  ].filter(item => item.value > 0);

  // Transform aging data for chart
  const agingData = [
    { name: "0-30 days", count: stock_aging["0_30_days"].count, units: stock_aging["0_30_days"].units, value: stock_aging["0_30_days"].value },
    { name: "31-60 days", count: stock_aging["31_60_days"].count, units: stock_aging["31_60_days"].units, value: stock_aging["31_60_days"].value },
    { name: "61-90 days", count: stock_aging["61_90_days"].count, units: stock_aging["61_90_days"].units, value: stock_aging["61_90_days"].value },
    { name: "91-180 days", count: stock_aging["91_180_days"].count, units: stock_aging["91_180_days"].units, value: stock_aging["91_180_days"].value },
    { name: "180+ days", count: stock_aging["over_180_days"].count, units: stock_aging["over_180_days"].units, value: stock_aging["over_180_days"].value },
  ];

  // ABC Analysis data for chart
  const abcData = [
    { name: "Class A", value: abc_analysis.class_a.product_count, percentage: abc_analysis.class_a.percentage_of_products, fill: "#22c55e" },
    { name: "Class B", value: abc_analysis.class_b.product_count, percentage: abc_analysis.class_b.percentage_of_products, fill: "#3b82f6" },
    { name: "Class C", value: abc_analysis.class_c.product_count, percentage: abc_analysis.class_c.percentage_of_products, fill: "#f59e0b" },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          Stock Analytics
        </CardTitle>
        <CardDescription>
          Comprehensive stock analysis, velocity, aging, and movement insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="velocity">Velocity</TabsTrigger>
            <TabsTrigger value="aging">Aging</TabsTrigger>
            <TabsTrigger value="abc">ABC</TabsTrigger>
            <TabsTrigger value="movement">Movement</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Stock Health */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Stock Health Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Healthy Stock</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {stock_overview.healthy_stock_count}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm">Low Stock</span>
                      </div>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        {stock_overview.low_stock_count}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Out of Stock</span>
                      </div>
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        {stock_overview.out_of_stock_count}
                      </Badge>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Overall Health</span>
                        <span className="text-sm font-medium">{stock_overview.stock_health_percentage}%</span>
                      </div>
                      <Progress value={stock_overview.stock_health_percentage} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Value Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Value Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cost Value</span>
                    <span className="font-medium">{formatCurrency(stock_overview.total_cost_value)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Retail Value</span>
                    <span className="font-medium">{formatCurrency(stock_overview.total_retail_value)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Potential Profit</span>
                    <span className="font-medium text-green-600">{formatCurrency(stock_overview.potential_profit)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Stock/Product</span>
                      <span className="font-medium">{formatNumber(stock_overview.avg_stock_per_product)} units</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            {stock_value_analysis.by_category.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Stock by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stock_value_analysis.by_category.map((cat, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{cat.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {cat.product_count} products • {formatNumber(cat.total_units)} units
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(cat.retail_value)}</p>
                          <p className="text-xs text-muted-foreground">retail value</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Velocity Tab */}
          <TabsContent value="velocity" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Velocity Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Stock Velocity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {velocityData.length > 0 ? (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={velocityData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {velocityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No velocity data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Velocity Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Velocity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-green-50">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Fast Moving</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{stock_velocity.fast_moving.count} products</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(stock_velocity.fast_moving.total_units)} units</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Medium Moving</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{stock_velocity.medium_moving.count} products</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(stock_velocity.medium_moving.total_units)} units</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50">
                      <div className="flex items-center gap-2">
                        <Snail className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">Slow Moving</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{stock_velocity.slow_moving.count} products</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(stock_velocity.slow_moving.total_units)} units</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-red-50">
                      <div className="flex items-center gap-2">
                        <Skull className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">Dead Stock</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{stock_velocity.dead_stock.count} products</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(stock_velocity.dead_stock.total_units)} units</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Slow Moving Stock List */}
            {slow_moving_stock.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Slow Moving & Dead Stock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {slow_moving_stock.slice(0, 5).map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(item.current_stock)} units • {item.days_in_inventory} days in inventory
                          </p>
                          <p className="text-xs text-amber-600 mt-1">{item.recommendation}</p>
                        </div>
                        <Badge variant={item.velocity_category === "dead" ? "destructive" : "secondary"}>
                          {item.velocity_category}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aging Tab */}
          <TabsContent value="aging">
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Stock Aging Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === "units") return [formatNumber(value), "Units"];
                          if (name === "count") return [value, "Products"];
                          return [formatCurrency(value), "Value"];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="units" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Units" />
                      <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Products" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Aging Summary Cards */}
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {agingData.map((bucket, index) => (
                    <div key={index} className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium">{bucket.name}</p>
                      <p className="text-lg font-bold">{bucket.count}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(bucket.units)} units</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABC Analysis Tab */}
          <TabsContent value="abc" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* ABC Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">ABC Classification</CardTitle>
                </CardHeader>
                <CardContent>
                  {abcData.length > 0 ? (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={abcData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percentage }) => `${name}: ${percentage}%`}
                          >
                            {abcData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No ABC data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ABC Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Classification Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg border-l-4 border-green-500 bg-green-50/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-green-700">Class A</span>
                        <Badge variant="secondary">{abc_analysis.class_a.product_count} products</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{abc_analysis.class_a.description}</p>
                      <p className="text-sm mt-2">Revenue: {formatCurrency(abc_analysis.class_a.revenue)}</p>
                    </div>
                    <div className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-700">Class B</span>
                        <Badge variant="secondary">{abc_analysis.class_b.product_count} products</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{abc_analysis.class_b.description}</p>
                      <p className="text-sm mt-2">Revenue: {formatCurrency(abc_analysis.class_b.revenue)}</p>
                    </div>
                    <div className="p-3 rounded-lg border-l-4 border-amber-500 bg-amber-50/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-700">Class C</span>
                        <Badge variant="secondary">{abc_analysis.class_c.product_count} products</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{abc_analysis.class_c.description}</p>
                      <p className="text-sm mt-2">Revenue: {formatCurrency(abc_analysis.class_c.revenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Movement Tab */}
          <TabsContent value="movement">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Stock In */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                    Stock In
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      +{formatNumber(stock_movement_summary.stock_in.total)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">units received</p>
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">From Purchase Orders</span>
                      <span>{formatNumber(stock_movement_summary.stock_in.from_purchase_orders)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Out */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                    Stock Out
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-600">
                      -{formatNumber(stock_movement_summary.stock_out.total)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">units out</p>
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">From Sales</span>
                      <span>{formatNumber(stock_movement_summary.stock_out.from_sales)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">From Dispatches</span>
                      <span>{formatNumber(stock_movement_summary.stock_out.from_dispatches)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">From Breakages</span>
                      <span>{formatNumber(stock_movement_summary.stock_out.from_breakages)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Net Movement */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Net Movement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${stock_movement_summary.net_movement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stock_movement_summary.net_movement >= 0 ? '+' : ''}{formatNumber(stock_movement_summary.net_movement)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">units net change</p>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-center gap-2">
                      {stock_movement_summary.net_movement >= 0 ? (
                        <Badge className="bg-green-100 text-green-700">Stock Increasing</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">Stock Decreasing</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <div className="space-y-4 mt-4">
              {/* Reorder Recommendations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Reorder Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reorder_recommendations && reorder_recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {reorder_recommendations.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Current: {formatNumber(item.current_stock)} • Reorder Point: {formatNumber(item.reorder_point)}
                            </p>
                            <p className="text-xs text-amber-600 mt-1">{item.reason}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="bg-amber-100">
                              Order {formatNumber(item.suggested_quantity)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>No reorder recommendations at this time</p>
                      <p className="text-sm">All stock levels are healthy</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stock Alerts Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Stock Alerts Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className={`text-center p-4 rounded-lg ${stock_overview.out_of_stock_count > 0 ? 'bg-red-50 border border-red-200' : 'bg-muted/50'}`}>
                      <XCircle className={`h-8 w-8 mx-auto mb-2 ${stock_overview.out_of_stock_count > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                      <p className="text-2xl font-bold">{stock_overview.out_of_stock_count}</p>
                      <p className="text-sm text-muted-foreground">Out of Stock</p>
                    </div>
                    <div className={`text-center p-4 rounded-lg ${stock_overview.low_stock_count > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-muted/50'}`}>
                      <AlertTriangle className={`h-8 w-8 mx-auto mb-2 ${stock_overview.low_stock_count > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <p className="text-2xl font-bold">{stock_overview.low_stock_count}</p>
                      <p className="text-sm text-muted-foreground">Low Stock</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">{stock_overview.healthy_stock_count}</p>
                      <p className="text-sm text-muted-foreground">Healthy Stock</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
