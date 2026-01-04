"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import {
  getPurchaseOrdersByStatus,
  downloadReportAsCsv,
  PurchaseOrdersByStatusItem,
  ReportFilters,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard, BarChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, XCircle, AlertTriangle, Package, ShoppingCart, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

// Status config
const statusConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<any>; chartColor: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock, chartColor: "#f59e0b" },
  approved: { bg: "bg-blue-100", text: "text-blue-700", icon: CheckCircle, chartColor: "#3b82f6" },
  ordered: { bg: "bg-purple-100", text: "text-purple-700", icon: ShoppingCart, chartColor: "#8b5cf6" },
  partial: { bg: "bg-orange-100", text: "text-orange-700", icon: AlertTriangle, chartColor: "#f97316" },
  received: { bg: "bg-green-100", text: "text-green-700", icon: Package, chartColor: "#22c55e" },
  shipped: { bg: "bg-indigo-100", text: "text-indigo-700", icon: Truck, chartColor: "#6366f1" },
  cancelled: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, chartColor: "#ef4444" },
};

// Table columns
const columns: ColumnDef<PurchaseOrdersByStatusItem>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status.toLowerCase();
      const config = statusConfig[status] || statusConfig.pending;
      const Icon = config.icon;
      return (
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg", config.bg)}>
            <Icon className={cn("h-4 w-4", config.text)} />
          </div>
          <span className="font-medium capitalize">{status}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "count",
    header: "Orders",
    cell: ({ row }) => formatNumber(row.original.count),
  },
  {
    accessorKey: "total_amount",
    header: "Total Amount",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.total_amount)}</span>
    ),
  },
  {
    accessorKey: "avg_amount",
    header: "Avg Order",
    cell: ({ row }) => {
      const avg = row.original.count > 0 ? row.original.total_amount / row.original.count : 0;
      return formatCurrency(avg);
    },
  },
  {
    accessorKey: "percentage",
    header: "Share",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 w-32">
        <Progress value={row.original.percentage || 0} className="h-2 flex-1" />
        <span className="text-sm text-muted-foreground">{(row.original.percentage || 0).toFixed(1)}%</span>
      </div>
    ),
  },
];

export default function PurchaseOrdersByStatusReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    per_page: 50,
    page: 1,
  });
  
  const [data, setData] = React.useState<PurchaseOrdersByStatusItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPurchaseOrdersByStatus(filters);
      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : response.data.data;
        // Calculate percentages
        const totalOrders = items.reduce((acc: number, s: any) => acc + s.count, 0);
        const itemsWithPercentage = items.map((item: any) => ({
          ...item,
          percentage: totalOrders > 0 ? (item.count / totalOrders) * 100 : 0,
        }));
        setData(itemsWithPercentage);
        setSummary(response.summary || null);
        setMeta(response.meta);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report");
      toast({
        title: "Error",
        description: err.message || "Failed to load report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle export
  const handleExport = async () => {
    setExportLoading(true);
    try {
      await downloadReportAsCsv("/purchase-orders/by-status", filters, "po_by_status.csv");
      toast({
        title: "Export successful",
        description: "The report has been downloaded as CSV",
      });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err.message || "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate totals
  const totalOrders = data.reduce((acc, s) => acc + s.count, 0);
  const totalAmount = data.reduce((acc, s) => acc + s.total_amount, 0);
  const pendingData = data.find(s => s.status.toLowerCase() === "pending");
  const receivedData = data.find(s => s.status.toLowerCase() === "received");

  // Chart data
  const pieChartData = data.map((s) => {
    const status = s.status.toLowerCase();
    const config = statusConfig[status] || statusConfig.pending;
    return {
      name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
      value: s.count,
      fill: config.chartColor,
    };
  });

  const barChartData = data.map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    orders: s.count,
    amount: s.total_amount,
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="PO by Status"
        description="Purchase orders by status"
        category="purchase-orders"
        categoryLabel="Purchase Orders"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Purchase Orders by Status"
      description="Analyze purchase order workflow and identify bottlenecks"
      category="purchase-orders"
      categoryLabel="Purchase Orders"
      loading={loading}
      generatedAt={meta?.generated_at}
      period={meta?.period}
      onExport={handleExport}
      onRefresh={fetchReport}
      exportLoading={exportLoading}
    >
      <div className="space-y-6">
        {/* Filters */}
        <ReportFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          showStoreFilter={false}
          showGroupBy={false}
          loading={loading}
        />

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Orders"
            value={totalOrders}
            icon="ShoppingCart"
            loading={loading}
          />
          <SummaryCard
            title="Total Value"
            value={formatCurrency(totalAmount)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Pending"
            value={pendingData?.count || 0}
            subtitle={formatCurrency(pendingData?.total_amount || 0)}
            icon="Clock"
            variant="warning"
            loading={loading}
          />
          <SummaryCard
            title="Received"
            value={receivedData?.count || 0}
            subtitle={formatCurrency(receivedData?.total_amount || 0)}
            icon="Package"
            variant="success"
            loading={loading}
          />
        </SummaryGrid>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Orders by Status"
            description="Distribution of purchase orders"
            data={pieChartData}
            loading={loading}
            height={320}
            showLegend
          />
          <BarChartCard
            title="Value by Status"
            description="Purchase amounts per status"
            data={barChartData}
            dataKeys={[
              { key: "orders", name: "Orders", color: "#3b82f6" },
              { key: "amount", name: "Amount", color: "#22c55e" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={320}
          />
        </div>

        {/* Status Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Status Overview</CardTitle>
            <CardDescription>Detailed breakdown of each order status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((item, index) => {
                const status = item.status.toLowerCase();
                const config = statusConfig[status] || statusConfig.pending;
                const Icon = config.icon;
                const avgOrder = item.count > 0 ? item.total_amount / item.count : 0;
                
                return (
                  <div 
                    key={index} 
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all hover:shadow-md",
                      "border-l-4",
                    )}
                    style={{ borderLeftColor: config.chartColor }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", config.bg)}>
                          <Icon className={cn("h-4 w-4", config.text)} />
                        </div>
                        <span className="font-medium capitalize">{item.status}</span>
                      </div>
                      <Badge variant="outline">{item.percentage?.toFixed(1)}%</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Orders</span>
                        <span className="font-bold">{item.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Total Value</span>
                        <span className="font-bold">{formatCurrency(item.total_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Avg Order</span>
                        <span className="font-medium">{formatCurrency(avgOrder)}</span>
                      </div>
                      <Progress 
                        value={item.percentage} 
                        className="h-2 mt-2" 
                        style={{ 
                          '--progress-background': config.chartColor 
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        {data.length === 0 && !loading ? (
          <ReportEmptyState />
        ) : (
          <ReportTable
            columns={columns}
            data={data}
            loading={loading}
            searchColumn="status"
            searchPlaceholder="Search status..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
