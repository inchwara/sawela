"use client";

import * as React from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  getPurchaseSummary,
  downloadReportAsCsv,
  PurchaseSummaryData,
  ReportFilters,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard, AreaChartCard } from "../../components/report-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Clock, CheckCircle, XCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "../../components/report-table";

// Status badge config
const statusConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<any>; chartColor: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock, chartColor: "#f59e0b" },
  approved: { bg: "bg-blue-100", text: "text-blue-700", icon: CheckCircle, chartColor: "#3b82f6" },
  ordered: { bg: "bg-purple-100", text: "text-purple-700", icon: ShoppingCart, chartColor: "#8b5cf6" },
  completed: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle, chartColor: "#22c55e" },
  cancelled: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, chartColor: "#ef4444" },
};

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function PurchaseSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    group_by: "day",
  });

  const [data, setData] = React.useState<PurchaseSummaryData | null>(null);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch stores
  React.useEffect(() => {
    getStores().then(setStores).catch(console.error);
  }, []);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPurchaseSummary(filters);
      if (response.success) {
        setData(response.data);
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
      await downloadReportAsCsv("/purchase/summary", filters, "purchase_summary.csv");
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

  // Extract summary data
  const summary = data?.summary;
  const timeSeries = data?.time_series || [];
  const byStatus = data?.by_status || [];

  // Pie chart data
  const statusChartData = byStatus.map((s, idx) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    fill: statusConfig[s.status.toLowerCase()]?.chartColor || CHART_COLORS[idx % CHART_COLORS.length],
  }));

  // Time series chart data
  const trendChartData = timeSeries.map((d) => ({
    date: format(new Date(d.period), "MMM d"),
    orders: d.order_count,
  }));

  if (error && !data) {
    return (
      <ReportLayout
        title="Purchase Summary"
        description="Overview of purchase orders"
        category="purchase-orders"
        categoryLabel="Purchase Orders"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Purchase Summary"
      description="Track and analyze purchase order activity with status and trend insights"
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
          showGroupBy
          loading={loading}
        />

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Orders"
            value={summary?.total_orders ?? 0}
            icon="ShoppingCart"
            loading={loading}
          />
          <SummaryCard
            title="Unique Suppliers"
            value={summary?.unique_suppliers ?? 0}
            icon="Building2"
            loading={loading}
          />
          <SummaryCard
            title="Completed"
            value={summary?.completed_orders ?? 0}
            subtitle="orders fulfilled"
            icon="CheckCircle"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Pending"
            value={summary?.pending_orders ?? 0}
            subtitle="awaiting action"
            icon="Clock"
            variant={summary?.pending_orders ? "warning" : "default"}
            loading={loading}
          />
        </SummaryGrid>

        {/* Cancelled highlight */}
        {(summary?.cancelled_orders ?? 0) > 0 && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium">Cancelled Orders</p>
                <p className="text-sm text-muted-foreground">
                  {summary?.cancelled_orders} orders have been cancelled in this period
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Orders by Status"
            description="Distribution of purchase orders"
            data={statusChartData}
            loading={loading}
            height={300}
            showLegend
          />

          {trendChartData.length > 0 ? (
            <AreaChartCard
              title="Order Trend"
              description="Purchase order activity over time"
              data={trendChartData}
              dataKey="orders"
              xAxisKey="date"
              loading={loading}
              height={300}
              color="#3b82f6"
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Detailed view of order statuses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {byStatus.map((item) => {
                  const status = item.status.toLowerCase();
                  const config = statusConfig[status] || statusConfig.pending;
                  const Icon = config.icon;
                  if (item.count === 0) return null;

                  return (
                    <div key={status} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", config.bg)}>
                          <Icon className={cn("h-4 w-4", config.text)} />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{status}</p>
                          <p className="text-sm text-muted-foreground">{item.count} orders</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Empty state */}
        {!loading && (summary?.total_orders ?? 0) === 0 && (
          <ReportEmptyState />
        )}
      </div>
    </ReportLayout>
  );
}
