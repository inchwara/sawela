"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import {
  getPurchaseOrdersBySupplier,
  downloadReportAsCsv,
  PurchaseOrdersBySupplierItem,
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
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2, ShoppingCart, TrendingUp, Star } from "lucide-react";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// Table columns
const columns: ColumnDef<PurchaseOrdersBySupplierItem>[] = [
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium">{row.original.supplier.name}</p>
          {row.original.supplier.contact_person && (
            <p className="text-sm text-muted-foreground">{row.original.supplier.contact_person}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "order_count",
    header: "Orders",
    cell: ({ row }) => formatNumber(row.original.order_count),
  },
  {
    accessorKey: "total_amount",
    header: "Total Amount",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.total_amount)}</span>
    ),
  },
  {
    accessorKey: "avg_order_value",
    header: "Avg Order",
    cell: ({ row }) => {
      const avg = row.original.order_count > 0 
        ? row.original.total_amount / row.original.order_count 
        : 0;
      return formatCurrency(avg);
    },
  },
  {
    accessorKey: "pending_orders",
    header: "Pending",
    cell: ({ row }) => (
      <Badge variant={row.original.pending_orders > 0 ? "secondary" : "outline"}>
        {row.original.pending_orders || 0}
      </Badge>
    ),
  },
  {
    accessorKey: "received_orders",
    header: "Received",
    cell: ({ row }) => (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        {row.original.received_orders || 0}
      </Badge>
    ),
  },
  {
    accessorKey: "total_quantity",
    header: "Total Qty",
    cell: ({ row }) => (
      <span className="font-mono">{formatNumber(row.original.total_quantity || 0)}</span>
    ),
  },
];

export default function PurchaseOrdersBySupplierReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    per_page: 50,
    page: 1,
  });
  
  const [data, setData] = React.useState<PurchaseOrdersBySupplierItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPurchaseOrdersBySupplier(filters);
      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : response.data.data;
        setData(items);
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
      await downloadReportAsCsv("/purchase-orders/by-supplier", filters, "po_by_supplier.csv");
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
  const totalSuppliers = data.length;
  const totalOrders = data.reduce((acc, s) => acc + s.order_count, 0);
  const totalAmount = data.reduce((acc, s) => acc + s.total_amount, 0);
  const totalPending = data.reduce((acc, s) => acc + (s.pending_orders || 0), 0);

  // Sort by amount
  const topSuppliers = [...data].sort((a, b) => b.total_amount - a.total_amount).slice(0, 8);
  const topSupplier = topSuppliers[0];

  // Chart data
  const amountChartData = topSuppliers.map((s, idx) => ({
    name: s.supplier.name.length > 12 ? s.supplier.name.slice(0, 12) + "..." : s.supplier.name,
    value: s.total_amount,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const ordersChartData = topSuppliers.map((s) => ({
    name: s.supplier.name.length > 10 ? s.supplier.name.slice(0, 10) + "..." : s.supplier.name,
    orders: s.order_count,
    pending: s.pending_orders || 0,
    received: s.received_orders || 0,
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="PO by Supplier"
        description="Purchase orders breakdown by supplier"
        category="purchase-orders"
        categoryLabel="Purchase Orders"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Purchase Orders by Supplier"
      description="Analyze purchase order distribution and spending across suppliers"
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
            title="Suppliers"
            value={totalSuppliers}
            icon="Building2"
            loading={loading}
          />
          <SummaryCard
            title="Total Orders"
            value={formatNumber(totalOrders)}
            icon="ShoppingCart"
            loading={loading}
          />
          <SummaryCard
            title="Total Spend"
            value={formatCurrency(totalAmount)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Pending Orders"
            value={totalPending}
            subtitle="across all suppliers"
            icon="Clock"
            variant={totalPending > 0 ? "warning" : "default"}
            loading={loading}
          />
        </SummaryGrid>

        {/* Top Supplier Highlight */}
        {topSupplier && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500 text-white">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Highest Spend Supplier</p>
                    <h3 className="text-xl font-bold">{topSupplier.supplier.name}</h3>
                    <p className="text-sm text-muted-foreground">{topSupplier.order_count} purchase orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(topSupplier.total_amount)}</p>
                  <p className="text-muted-foreground">
                    {((topSupplier.total_amount / totalAmount) * 100).toFixed(1)}% of total spend
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Spend Distribution"
            description="Purchase amount by supplier"
            data={amountChartData}
            loading={loading}
            height={320}
            showLegend
          />
          <BarChartCard
            title="Orders by Supplier"
            description="Order count and status breakdown"
            data={ordersChartData}
            dataKeys={[
              { key: "orders", name: "Total Orders", color: "#3b82f6" },
              { key: "pending", name: "Pending", color: "#f59e0b" },
              { key: "received", name: "Received", color: "#22c55e" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={320}
          />
        </div>

        {/* Supplier Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Supplier Spend Analysis
            </CardTitle>
            <CardDescription>
              Detailed breakdown of purchasing activity per supplier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSuppliers.map((supplier, index) => {
                const spendShare = totalAmount > 0 ? (supplier.total_amount / totalAmount) * 100 : 0;
                const orderShare = totalOrders > 0 ? (supplier.order_count / totalOrders) * 100 : 0;
                const avgOrder = supplier.order_count > 0 ? supplier.total_amount / supplier.order_count : 0;
                
                return (
                  <div key={index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{supplier.supplier.name}</span>
                          {index === 0 && (
                            <Badge className="bg-blue-100 text-blue-700 border-0">
                              <Star className="h-3 w-3 mr-1" />
                              Top
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{formatCurrency(supplier.total_amount)}</span>
                        <span className="text-muted-foreground ml-2">({spendShare.toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Spend Share</p>
                        <Progress value={spendShare} className="h-2" />
                        <p className="mt-1 font-medium">{spendShare.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Orders</p>
                        <p className="font-bold text-lg">{supplier.order_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Order Value</p>
                        <p className="font-bold text-lg">{formatCurrency(avgOrder)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <div className="flex gap-2 mt-1">
                          {(supplier.pending_orders || 0) > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {supplier.pending_orders} pending
                            </Badge>
                          )}
                          {(supplier.received_orders || 0) > 0 && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              {supplier.received_orders} received
                            </Badge>
                          )}
                        </div>
                      </div>
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
            searchColumn="supplier"
            searchPlaceholder="Search suppliers..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
