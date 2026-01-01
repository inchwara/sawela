"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RequisitionAnalytics, 
  RequisitionMetrics, 
  TopRequestedProduct, 
  TopRequester 
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
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Package,
  TrendingUp,
  Users,
  FileCheck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RequisitionAnalyticsWidgetProps {
  data: RequisitionAnalytics | null;
  loading?: boolean;
}

interface RequisitionMetricsCardsProps {
  data: RequisitionAnalytics | null;
  loading?: boolean;
}

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

// Metrics Cards Component
export function RequisitionMetricsCards({ data, loading }: RequisitionMetricsCardsProps) {
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

  if (!data?.requisition_metrics) return null;

  const metrics = data.requisition_metrics;

  const metricCards = [
    {
      title: "Total Requisitions",
      value: metrics.total_requisitions,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Items Requested",
      value: metrics.total_items_requested,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Approval Rate",
      value: `${metrics.approval_rate}%`,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Fulfillment Rate",
      value: `${metrics.fulfillment_rate}%`,
      icon: FileCheck,
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
export function RequisitionAnalyticsWidget({ data, loading }: RequisitionAnalyticsWidgetProps) {
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
    requisition_metrics, 
    requisition_trend, 
    requisition_by_status,
    requisition_by_approval,
    top_requested_products, 
    top_requesters 
  } = data;

  // Transform status data for pie chart
  const statusData = Object.entries(requisition_by_status || {}).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value,
  }));

  // Transform approval data for pie chart
  const approvalData = Object.entries(requisition_by_approval || {}).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-indigo-600" />
          Requisition Analytics
        </CardTitle>
        <CardDescription>
          Detailed requisition trends, status breakdown, and top requesters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="requesters">Requesters</TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Status Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Approved</span>
                      </div>
                      <Badge variant="secondary">{requisition_metrics.approved}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <Badge variant="secondary">{requisition_metrics.pending}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Rejected</span>
                      </div>
                      <Badge variant="secondary">{requisition_metrics.rejected}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Fulfilled</span>
                      </div>
                      <Badge variant="secondary">{requisition_metrics.fulfilled}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rates Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Performance Rates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Approval Rate</span>
                      <span className="text-sm font-medium">{requisition_metrics.approval_rate}%</span>
                    </div>
                    <Progress value={requisition_metrics.approval_rate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Fulfillment Rate</span>
                      <span className="text-sm font-medium">{requisition_metrics.fulfillment_rate}%</span>
                    </div>
                    <Progress value={requisition_metrics.fulfillment_rate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Pie Charts */}
            {(statusData.length > 0 || approvalData.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statusData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">By Dispatch Status</CardTitle>
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
                {approvalData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">By Approval Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={approvalData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {approvalData.map((_, index) => (
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
              </div>
            )}
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Requisition Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requisition_trend && requisition_trend.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={requisition_trend}>
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
                          dataKey="requisition_count" 
                          fill="#6366f1" 
                          radius={[4, 4, 0, 0]}
                          name="Requisitions"
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

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Top Requested Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {top_requested_products && top_requested_products.length > 0 ? (
                  <div className="space-y-3">
                    {top_requested_products.map((product, index) => (
                      <div 
                        key={product.product_id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{product.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.requisition_count} requisition{product.requisition_count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-indigo-600">{product.total_requested}</p>
                          <p className="text-xs text-muted-foreground">items requested</p>
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

          {/* Requesters Tab */}
          <TabsContent value="requesters">
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Top Requesters
                </CardTitle>
              </CardHeader>
              <CardContent>
                {top_requesters && top_requesters.length > 0 ? (
                  <div className="space-y-3">
                    {top_requesters.map((requester, index) => (
                      <div 
                        key={requester.user_id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{requester.user_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {requester.requisition_count} requisition{requester.requisition_count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600">
                              {requester.approved_count} approved
                            </Badge>
                            <Badge variant="secondary">
                              {requester.approval_rate}% rate
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No requester data available
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
