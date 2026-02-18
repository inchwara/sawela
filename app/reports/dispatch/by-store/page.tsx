"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  getDispatchByStore,
  downloadReportAsCsv,
  DispatchByStoreItem,
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
import { Store as StoreIcon, Truck, Star, TrendingUp } from "lucide-react";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// Table columns
const columns: ColumnDef<DispatchByStoreItem>[] = [
  {
    accessorKey: "store_name",
    header: "Store",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <StoreIcon className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium">{row.original.store_name}</span>
      </div>
    ),
  },
  {
    accessorKey: "dispatch_count",
    header: "Dispatches",
    cell: ({ row }) => (
      <span className="font-bold text-lg">{formatNumber(row.original.dispatch_count)}</span>
    ),
  },
];

export default function DispatchByStoreReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
  });

  const [data, setData] = React.useState<DispatchByStoreItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDispatchByStore(filters);
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
      await downloadReportAsCsv("/dispatch/by-store", filters, "dispatch_by_store.csv");
      toast.success("The report has been downloaded as CSV");
    } catch (err: any) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Calculations
  const totalStores = data.length;
  const totalDispatches = data.reduce((acc, s) => acc + s.dispatch_count, 0);
  const avgPerStore = totalStores > 0 ? (totalDispatches / totalStores).toFixed(1) : "0";

  // Sort by dispatch count
  const sortedData = [...data].sort((a, b) => b.dispatch_count - a.dispatch_count);
  const topStore = sortedData[0];

  // Chart data
  const pieChartData = sortedData.slice(0, 8).map((s, idx) => ({
    name: s.store_name.length > 12 ? s.store_name.slice(0, 12) + "..." : s.store_name,
    value: s.dispatch_count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const barChartData = sortedData.slice(0, 8).map((s) => ({
    name: s.store_name.length > 10 ? s.store_name.slice(0, 10) + "..." : s.store_name,
    dispatches: s.dispatch_count,
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Dispatch by Store"
        description="Dispatch breakdown by store"
        category="dispatch"
        categoryLabel="Dispatch"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Dispatch by Store"
      description="Compare dispatch volume across store locations"
      category="dispatch"
      categoryLabel="Dispatch"
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
            title="Active Stores"
            value={totalStores}
            icon="Store"
            loading={loading}
          />
          <SummaryCard
            title="Total Dispatches"
            value={formatNumber(totalDispatches)}
            icon="Truck"
            loading={loading}
          />
          <SummaryCard
            title="Avg per Store"
            value={avgPerStore}
            subtitle="dispatches per store"
            icon="TrendingUp"
            loading={loading}
          />
          <SummaryCard
            title="Top Store"
            value={topStore?.store_name || "—"}
            subtitle={topStore ? `${topStore.dispatch_count} dispatches` : ""}
            icon="Star"
            variant="success"
            loading={loading}
          />
        </SummaryGrid>

        {/* Top Store Highlight */}
        {topStore && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-500 text-white">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Most Active Store</p>
                    <h3 className="text-xl font-bold">{topStore.store_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {totalDispatches > 0
                        ? ((topStore.dispatch_count / totalDispatches) * 100).toFixed(1)
                        : 0}% of all dispatches
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-indigo-600">{formatNumber(topStore.dispatch_count)}</p>
                  <p className="text-muted-foreground">dispatches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Dispatches by Store"
            description="Distribution across stores"
            data={pieChartData}
            loading={loading}
            height={320}
            showLegend
          />
          <BarChartCard
            title="Store Comparison"
            description="Dispatch count per store"
            data={barChartData}
            dataKeys={[
              { key: "dispatches", name: "Dispatches", color: "#3b82f6" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={320}
          />
        </div>

        {/* Store Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Store Dispatch Analysis
            </CardTitle>
            <CardDescription>
              Detailed breakdown of dispatch activity per store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedData.map((store, index) => {
                const dispatchShare = totalDispatches > 0
                  ? (store.dispatch_count / totalDispatches) * 100
                  : 0;

                return (
                  <div key={store.store_id || index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{store.store_name}</span>
                          {index === 0 && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-0">
                              <Star className="h-3 w-3 mr-1" />
                              Top
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{store.dispatch_count} dispatches</span>
                        <span className="text-muted-foreground ml-2">({dispatchShare.toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Share of total</span>
                        <span className="font-medium">{dispatchShare.toFixed(1)}%</span>
                      </div>
                      <Progress value={dispatchShare} className="h-2" />
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
            searchColumn="store_name"
            searchPlaceholder="Search stores..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
