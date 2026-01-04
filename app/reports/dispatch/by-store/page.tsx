"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
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
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Store as StoreIcon, Truck, Package, CheckCircle, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// Table columns
const columns: ColumnDef<DispatchByStoreItem>[] = [
  {
    accessorKey: "store",
    header: "Store",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <StoreIcon className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium">{row.original.store.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "dispatch_count",
    header: "Dispatches",
    cell: ({ row }) => formatNumber(row.original.dispatch_count),
  },
  {
    accessorKey: "total_quantity",
    header: "Total Qty",
    cell: ({ row }) => (
      <span className="font-mono">{formatNumber(row.original.total_quantity || 0)}</span>
    ),
  },
  {
    accessorKey: "total_value",
    header: "Total Value",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.total_value)}</span>
    ),
  },
  {
    accessorKey: "delivered_count",
    header: "Delivered",
    cell: ({ row }) => (
      <Badge variant="outline" className="bg-green-50 text-green-700">
        {row.original.delivered_count || 0}
      </Badge>
    ),
  },
  {
    accessorKey: "pending_count",
    header: "Pending",
    cell: ({ row }) => (
      <Badge variant={row.original.pending_count > 0 ? "secondary" : "outline"}>
        {row.original.pending_count || 0}
      </Badge>
    ),
  },
  {
    accessorKey: "delivery_rate",
    header: "Delivery Rate",
    cell: ({ row }) => {
      const rate = row.original.dispatch_count > 0 
        ? ((row.original.delivered_count || 0) / row.original.dispatch_count) * 100 
        : 0;
      return (
        <div className="flex items-center gap-2">
          <Progress value={rate} className="w-16 h-2" />
          <span className={cn("text-sm font-medium", rate >= 80 ? "text-green-600" : rate >= 60 ? "text-yellow-600" : "text-red-600")}>
            {rate.toFixed(0)}%
          </span>
        </div>
      );
    },
  },
];

export default function DispatchByStoreReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    per_page: 50,
    page: 1,
  });
  
  const [data, setData] = React.useState<DispatchByStoreItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
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
      const response = await getDispatchByStore(filters);
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
      await downloadReportAsCsv("/dispatch/by-store", filters, "dispatch_by_store.csv");
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
  const totalStores = data.length;
  const totalDispatches = data.reduce((acc, s) => acc + s.dispatch_count, 0);
  const totalValue = data.reduce((acc, s) => acc + s.total_value, 0);
  const totalDelivered = data.reduce((acc, s) => acc + (s.delivered_count || 0), 0);

  // Sort by dispatch count
  const sortedData = [...data].sort((a, b) => b.dispatch_count - a.dispatch_count);
  const topStore = sortedData[0];

  // Chart data
  const pieChartData = sortedData.slice(0, 8).map((s, idx) => ({
    name: s.store.name.length > 12 ? s.store.name.slice(0, 12) + "..." : s.store.name,
    value: s.dispatch_count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const barChartData = sortedData.slice(0, 8).map((s) => ({
    name: s.store.name.length > 10 ? s.store.name.slice(0, 10) + "..." : s.store.name,
    dispatches: s.dispatch_count,
    delivered: s.delivered_count || 0,
    pending: s.pending_count || 0,
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
      description="Compare dispatch operations and performance across store locations"
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
            title="Total Value"
            value={formatCurrency(totalValue)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Delivery Rate"
            value={`${totalDispatches > 0 ? ((totalDelivered / totalDispatches) * 100).toFixed(0) : 0}%`}
            subtitle={`${formatNumber(totalDelivered)} delivered`}
            icon="CheckCircle"
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
                    <h3 className="text-xl font-bold">{topStore.store.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {((topStore.dispatch_count / totalDispatches) * 100).toFixed(1)}% of all dispatches
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-indigo-600">{formatNumber(topStore.dispatch_count)}</p>
                  <p className="text-muted-foreground">{formatCurrency(topStore.total_value)} total value</p>
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
            title="Store Performance"
            description="Dispatch status by store"
            data={barChartData}
            dataKeys={[
              { key: "dispatches", name: "Total", color: "#3b82f6" },
              { key: "delivered", name: "Delivered", color: "#22c55e" },
              { key: "pending", name: "Pending", color: "#f59e0b" },
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
              Detailed breakdown of dispatch operations per store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedData.slice(0, 8).map((store, index) => {
                const dispatchShare = totalDispatches > 0 ? (store.dispatch_count / totalDispatches) * 100 : 0;
                const valueShare = totalValue > 0 ? (store.total_value / totalValue) * 100 : 0;
                const deliveryRate = store.dispatch_count > 0 
                  ? ((store.delivered_count || 0) / store.dispatch_count) * 100 
                  : 0;
                
                return (
                  <div key={index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{store.store.name}</span>
                          {index === 0 && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-0">
                              <Star className="h-3 w-3 mr-1" />
                              Top
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{formatCurrency(store.total_value)}</span>
                        <span className="text-muted-foreground ml-2">({valueShare.toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Dispatch Share</p>
                        <Progress value={dispatchShare} className="h-2" />
                        <p className="mt-1 font-medium">{store.dispatch_count} ({dispatchShare.toFixed(1)}%)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Delivery Rate</p>
                        <Progress value={deliveryRate} className="h-2 [&>div]:bg-green-500" />
                        <p className="mt-1 font-medium">{deliveryRate.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Delivered</p>
                        <p className="font-bold text-lg text-green-600">{store.delivered_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending</p>
                        <p className={cn(
                          "font-bold text-lg",
                          (store.pending_count || 0) > 0 ? "text-amber-600" : ""
                        )}>
                          {store.pending_count || 0}
                        </p>
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
            searchColumn="store"
            searchPlaceholder="Search stores..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
