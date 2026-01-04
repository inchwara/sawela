"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import {
  getDispatchByType,
  downloadReportAsCsv,
  DispatchByTypeItem,
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
import { Truck, Package, Store, ArrowRightLeft, ShoppingBag, Building } from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// Type icons
const typeIcons: Record<string, React.ComponentType<any>> = {
  sale: ShoppingBag,
  transfer: ArrowRightLeft,
  customer: Package,
  wholesale: Building,
  retail: Store,
  delivery: Truck,
};

// Table columns
const columns: ColumnDef<DispatchByTypeItem>[] = [
  {
    accessorKey: "type",
    header: "Dispatch Type",
    cell: ({ row }) => {
      const type = row.original.type.toLowerCase();
      const Icon = typeIcons[type] || Truck;
      return (
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium capitalize">{type.replace(/_/g, " ")}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "count",
    header: "Dispatches",
    cell: ({ row }) => formatNumber(row.original.count),
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
    accessorKey: "avg_value",
    header: "Avg Value",
    cell: ({ row }) => {
      const avg = row.original.count > 0 ? row.original.total_value / row.original.count : 0;
      return formatCurrency(avg);
    },
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
];

export default function DispatchByTypeReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    per_page: 50,
    page: 1,
  });
  
  const [data, setData] = React.useState<DispatchByTypeItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDispatchByType(filters);
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
      await downloadReportAsCsv("/dispatch/by-type", filters, "dispatch_by_type.csv");
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
  const totalTypes = data.length;
  const totalDispatches = data.reduce((acc, t) => acc + t.count, 0);
  const totalValue = data.reduce((acc, t) => acc + t.total_value, 0);
  const totalDelivered = data.reduce((acc, t) => acc + (t.delivered_count || 0), 0);

  // Sort by count
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const topType = sortedData[0];

  // Chart data
  const pieChartData = sortedData.map((t, idx) => ({
    name: t.type.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: t.count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const barChartData = sortedData.map((t) => ({
    name: t.type.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    dispatches: t.count,
    delivered: t.delivered_count || 0,
    pending: t.pending_count || 0,
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Dispatch by Type"
        description="Dispatch breakdown by type"
        category="dispatch"
        categoryLabel="Dispatch"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Dispatch by Type"
      description="Analyze dispatch operations grouped by type (sales, transfers, etc.)"
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
            title="Dispatch Types"
            value={totalTypes}
            icon="Layers"
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
            title="Delivered"
            value={formatNumber(totalDelivered)}
            subtitle={`${totalDispatches > 0 ? ((totalDelivered / totalDispatches) * 100).toFixed(0) : 0}% completion`}
            icon="CheckCircle"
            variant="success"
            loading={loading}
          />
        </SummaryGrid>

        {/* Top Type Highlight */}
        {topType && (
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500 text-white">
                    {React.createElement(typeIcons[topType.type.toLowerCase()] || Truck, { className: "h-6 w-6" })}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Most Common Type</p>
                    <h3 className="text-xl font-bold capitalize">{topType.type.replace(/_/g, " ")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {((topType.count / totalDispatches) * 100).toFixed(1)}% of all dispatches
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">{formatNumber(topType.count)}</p>
                  <p className="text-muted-foreground">{formatCurrency(topType.total_value)} total value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Dispatches by Type"
            description="Distribution of dispatch types"
            data={pieChartData}
            loading={loading}
            height={320}
            showLegend
          />
          <BarChartCard
            title="Status by Type"
            description="Delivery status breakdown"
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

        {/* Type Details */}
        <Card>
          <CardHeader>
            <CardTitle>Type Breakdown</CardTitle>
            <CardDescription>Detailed metrics for each dispatch type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedData.map((item, index) => {
                const countShare = totalDispatches > 0 ? (item.count / totalDispatches) * 100 : 0;
                const valueShare = totalValue > 0 ? (item.total_value / totalValue) * 100 : 0;
                const Icon = typeIcons[item.type.toLowerCase()] || Truck;
                const deliveryRate = item.count > 0 ? ((item.delivered_count || 0) / item.count) * 100 : 0;
                
                return (
                  <div key={index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="p-1.5 rounded bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium capitalize">{item.type.replace(/_/g, " ")}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{formatCurrency(item.total_value)}</span>
                        <span className="text-muted-foreground ml-2">({valueShare.toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Count Share</p>
                        <Progress value={countShare} className="h-2" />
                        <p className="mt-1 font-medium">{item.count} ({countShare.toFixed(1)}%)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Delivery Rate</p>
                        <Progress value={deliveryRate} className="h-2 [&>div]:bg-green-500" />
                        <p className="mt-1 font-medium">{deliveryRate.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Value</p>
                        <p className="font-bold text-lg">
                          {formatCurrency(item.count > 0 ? item.total_value / item.count : 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Qty</p>
                        <p className="font-bold text-lg">{formatNumber(item.total_quantity || 0)}</p>
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
            searchColumn="type"
            searchPlaceholder="Search types..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
