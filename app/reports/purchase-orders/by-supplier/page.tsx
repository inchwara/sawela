"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  getPurchasesBySupplier,
  downloadReportAsCsv,
  PurchaseBySupplierItem,
  ReportFilters,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2, ShoppingCart, TrendingUp, Star, CheckCircle } from "lucide-react";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// Table columns
const columns: ColumnDef<PurchaseBySupplierItem>[] = [
  {
    accessorKey: "supplier_name",
    header: "Supplier",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium">{row.original.supplier_name}</span>
      </div>
    ),
  },
  {
    accessorKey: "order_count",
    header: "Orders",
    cell: ({ row }) => formatNumber(row.original.order_count),
  },
  {
    accessorKey: "completed_count",
    header: "Completed",
    cell: ({ row }) => (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        {row.original.completed_count || 0}
      </Badge>
    ),
  },
  {
    accessorKey: "completion_rate",
    header: "Completion Rate",
    cell: ({ row }) => {
      const rate = row.original.order_count > 0
        ? (row.original.completed_count / row.original.order_count) * 100
        : 0;
      return (
        <div className="flex items-center gap-2 w-32">
          <Progress value={rate} className="h-2 flex-1" />
          <span className="text-sm text-muted-foreground">{rate.toFixed(0)}%</span>
        </div>
      );
    },
  },
];

export default function PurchaseBySupplierReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
  });

  const [data, setData] = React.useState<PurchaseBySupplierItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPurchasesBySupplier(filters);
      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : [];
        setData(items);
        setMeta(response.meta);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report");
      toast.error(err.message || "Failed to load report");
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
      await downloadReportAsCsv("/purchase/by-supplier", filters, "po_by_supplier.csv");
      toast.success("The report has been downloaded as CSV");
    } catch (err: any) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate totals
  const totalSuppliers = data.length;
  const totalOrders = data.reduce((acc, s) => acc + s.order_count, 0);
  const totalCompleted = data.reduce((acc, s) => acc + (s.completed_count || 0), 0);
  const completionRate = totalOrders > 0 ? ((totalCompleted / totalOrders) * 100).toFixed(1) : "0";

  // Sort by order count
  const topSuppliers = [...data].sort((a, b) => b.order_count - a.order_count).slice(0, 8);
  const topSupplier = topSuppliers[0];

  // Chart data
  const ordersChartData = topSuppliers.map((s, idx) => ({
    name: s.supplier_name.length > 12 ? s.supplier_name.slice(0, 12) + "..." : s.supplier_name,
    value: s.order_count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const completionChartData = topSuppliers.map((s) => ({
    name: s.supplier_name.length > 10 ? s.supplier_name.slice(0, 10) + "..." : s.supplier_name,
    orders: s.order_count,
    completed: s.completed_count || 0,
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
      description="Analyze purchase order distribution and completion across suppliers"
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
            title="Completed"
            value={formatNumber(totalCompleted)}
            icon="CheckCircle"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Completion Rate"
            value={`${completionRate}%`}
            subtitle="across all suppliers"
            icon="TrendingUp"
            variant={Number(completionRate) >= 80 ? "success" : "warning"}
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
                    <p className="text-sm text-muted-foreground">Most Active Supplier</p>
                    <h3 className="text-xl font-bold">{topSupplier.supplier_name}</h3>
                    <p className="text-sm text-muted-foreground">{topSupplier.order_count} purchase orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">
                    {topSupplier.completed_count || 0}
                  </p>
                  <p className="text-muted-foreground">completed orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Order Distribution"
            description="Purchase order count by supplier"
            data={ordersChartData}
            loading={loading}
            height={320}
            showLegend
          />
          <BarChartCard
            title="Orders vs Completed"
            description="Order count and completion per supplier"
            data={completionChartData}
            dataKeys={[
              { key: "orders", name: "Total Orders", color: "#3b82f6" },
              { key: "completed", name: "Completed", color: "#22c55e" },
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
              Supplier Analysis
            </CardTitle>
            <CardDescription>
              Detailed breakdown of ordering activity per supplier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSuppliers.map((supplier, index) => {
                const orderShare = totalOrders > 0 ? (supplier.order_count / totalOrders) * 100 : 0;
                const supplierCompletionRate = supplier.order_count > 0
                  ? (supplier.completed_count / supplier.order_count) * 100
                  : 0;

                return (
                  <div key={supplier.supplier_id || index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{supplier.supplier_name}</span>
                          {index === 0 && (
                            <Badge className="bg-blue-100 text-blue-700 border-0">
                              <Star className="h-3 w-3 mr-1" />
                              Top
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{supplier.order_count} orders</span>
                        <span className="text-muted-foreground ml-2">({orderShare.toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Order Share</p>
                        <Progress value={orderShare} className="h-2" />
                        <p className="mt-1 font-medium">{orderShare.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-bold text-lg">{supplier.completed_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Completion Rate</p>
                        <p className="font-bold text-lg">{supplierCompletionRate.toFixed(0)}%</p>
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
            searchColumn="supplier_name"
            searchPlaceholder="Search suppliers..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
