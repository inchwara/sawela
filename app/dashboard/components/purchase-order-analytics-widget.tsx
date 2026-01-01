"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PurchaseOrderAnalytics, 
  TopSupplier, 
  TopOrderedProduct,
  ReceivingEfficiency
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
  Cell
} from "recharts";
import { 
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Building2,
  PackageCheck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PurchaseOrderAnalyticsWidgetProps {
  data: PurchaseOrderAnalytics | null;
  loading?: boolean;
}

interface PurchaseOrderMetricsCardsProps {
  data: PurchaseOrderAnalytics | null;
  loading?: boolean;
}

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Metrics Cards Component
export function PurchaseOrderMetricsCards({ data, loading }: PurchaseOrderMetricsCardsProps) {
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

  if (!data?.purchase_order_metrics) return null;

  const metrics = data.purchase_order_metrics;

  const metricCards = [
    {
      title: "Total Orders",
      value: metrics.total_orders,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Value",
      value: formatCurrency(metrics.total_value),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Items Ordered",
      value: metrics.total_items_ordered,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Fulfillment Rate",
      value: `${metrics.fulfillment_rate}%`,
      icon: PackageCheck,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
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
export function PurchaseOrderAnalyticsWidget({ data, loading }: PurchaseOrderAnalyticsWidgetProps) {
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
    purchase_order_metrics, 
    purchase_order_trend, 
    purchase_order_by_status,
    top_suppliers, 
    top_ordered_products,
    receiving_efficiency
  } = data;

  // Transform status data for pie chart
  const statusData = Object.entries(purchase_order_by_status || {}).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-teal-600" />
          Purchase Order Analytics
        </CardTitle>
        <CardDescription>
          Order trends, supplier performance, and receiving efficiency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Status Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Received</span>
                      </div>
                      <Badge variant="secondary">{purchase_order_metrics.received}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <Badge variant="secondary">{purchase_order_metrics.pending}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Partial</span>
                      </div>
                      <Badge variant="secondary">{purchase_order_metrics.partial}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Cancelled</span>
                      </div>
                      <Badge variant="secondary">{purchase_order_metrics.cancelled}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Items Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Items Ordered</span>
                      <span className="text-sm font-medium">{purchase_order_metrics.total_items_ordered}</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Items Received</span>
                      <span className="text-sm font-medium">{purchase_order_metrics.total_items_received}</span>
                    </div>
                    <Progress 
                      value={purchase_order_metrics.total_items_ordered > 0 
                        ? (purchase_order_metrics.total_items_received / purchase_order_metrics.total_items_ordered) * 100 
                        : 0} 
                      className="h-2" 
                    />
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Value</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(purchase_order_metrics.total_value)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Pie Chart */}
            {statusData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Order Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {statusData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Purchase Order Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {purchase_order_trend && purchase_order_trend.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={purchase_order_trend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="period" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            });
                          }}
                        />
                        <Bar 
                          dataKey="order_count" 
                          fill="#14b8a6" 
                          radius={[4, 4, 0, 0]}
                          name="Orders"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers">
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Top Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {top_suppliers && top_suppliers.length > 0 ? (
                  <div className="space-y-3">
                    {top_suppliers.map((supplier, index) => (
                      <div 
                        key={supplier.supplier_id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-600 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{supplier.supplier_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {supplier.order_count} order{supplier.order_count !== 1 ? 's' : ''} • {supplier.total_items} items
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatCurrency(supplier.total_value)}</p>
                          <p className="text-xs text-muted-foreground">total value</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No supplier data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Top Ordered Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {top_ordered_products && top_ordered_products.length > 0 ? (
                  <div className="space-y-3">
                    {top_ordered_products.map((product, index) => (
                      <div 
                        key={product.product_id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{product.product_name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{product.total_ordered} ordered</span>
                              <span>•</span>
                              <span className={product.total_received > 0 ? "text-green-600" : "text-amber-600"}>
                                {product.total_received} received
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatCurrency(product.total_value)}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.total_ordered > 0 
                              ? `${Math.round((product.total_received / product.total_ordered) * 100)}% received`
                              : '0% received'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No product data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Efficiency Tab */}
          <TabsContent value="efficiency">
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PackageCheck className="h-4 w-4" />
                  Receiving Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {receiving_efficiency ? (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{receiving_efficiency.total_orders}</p>
                        <p className="text-xs text-muted-foreground">Total Orders</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-green-600">{receiving_efficiency.fully_received_orders}</p>
                        <p className="text-xs text-muted-foreground">Fully Received</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{receiving_efficiency.total_ordered}</p>
                        <p className="text-xs text-muted-foreground">Items Ordered</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-green-600">{receiving_efficiency.total_received}</p>
                        <p className="text-xs text-muted-foreground">Items Received</p>
                      </div>
                    </div>

                    {/* Rates */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Item Fulfillment Rate</span>
                          </div>
                          <span className="text-sm font-bold">{receiving_efficiency.item_fulfillment_rate}%</span>
                        </div>
                        <Progress value={receiving_efficiency.item_fulfillment_rate} className="h-3" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {receiving_efficiency.total_received} of {receiving_efficiency.total_ordered} items received
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Order Completion Rate</span>
                          </div>
                          <span className="text-sm font-bold">{receiving_efficiency.order_completion_rate}%</span>
                        </div>
                        <Progress value={receiving_efficiency.order_completion_rate} className="h-3" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {receiving_efficiency.fully_received_orders} of {receiving_efficiency.total_orders} orders fully received
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No efficiency data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
