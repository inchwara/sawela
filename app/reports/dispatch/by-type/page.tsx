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
import { ReportTable, formatNumber } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Truck, ArrowRightLeft, Building } from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// Type icons & colors
const typeConfig: Record<string, { icon: React.ComponentType<any>; bg: string; text: string; chartColor: string }> = {
  internal: { icon: ArrowRightLeft, bg: "bg-blue-100", text: "text-blue-700", chartColor: "#3b82f6" },
  external: { icon: Building, bg: "bg-green-100", text: "text-green-700", chartColor: "#22c55e" },
};

// Table columns
const columns: ColumnDef<DispatchByTypeItem>[] = [
  {
    accessorKey: "type",
    header: "Dispatch Type",
    cell: ({ row }) => {
      const type = row.original.type.toLowerCase();
      const config = typeConfig[type] || typeConfig.internal;
      const Icon = config.icon;
      return (
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg", config.bg)}>
            <Icon className={cn("h-4 w-4", config.text)} />
          </div>
          <span className="font-medium capitalize">{type}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "count",
    header: "Dispatches",
    cell: ({ row }) => (
      <span className="font-bold text-lg">{formatNumber(row.original.count)}</span>
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
  });

  const [data, setData] = React.useState<DispatchByTypeItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDispatchByType(filters);
      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : [];
        setData(items);
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

  // Calculations
  const totalTypes = data.length;
  const totalDispatches = data.reduce((acc, t) => acc + t.count, 0);

  // Sort by count
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const topType = sortedData[0];

  // Chart data
  const pieChartData = sortedData.map((t, idx) => {
    const config = typeConfig[t.type.toLowerCase()];
    return {
      name: t.type.charAt(0).toUpperCase() + t.type.slice(1),
      value: t.count,
      fill: config?.chartColor || CHART_COLORS[idx % CHART_COLORS.length],
    };
  });

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
      description="Analyze dispatch operations by internal vs external type"
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
            title="Internal"
            value={data.find(t => t.type === "internal")?.count || 0}
            subtitle="internal dispatches"
            icon="ArrowRightLeft"
            loading={loading}
          />
          <SummaryCard
            title="External"
            value={data.find(t => t.type === "external")?.count || 0}
            subtitle="external dispatches"
            icon="Building2"
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
                    {React.createElement(
                      typeConfig[topType.type.toLowerCase()]?.icon || Truck,
                      { className: "h-6 w-6" }
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Most Common Type</p>
                    <h3 className="text-xl font-bold capitalize">{topType.type}</h3>
                    <p className="text-sm text-muted-foreground">
                      {totalDispatches > 0
                        ? ((topType.count / totalDispatches) * 100).toFixed(1)
                        : 0}% of all dispatches
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">{formatNumber(topType.count)}</p>
                  <p className="text-muted-foreground">dispatches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Dispatches by Type"
            description="Distribution of dispatch types"
            data={pieChartData}
            loading={loading}
            height={320}
            showLegend
          />

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
                  const config = typeConfig[item.type.toLowerCase()] || typeConfig.internal;
                  const Icon = config.icon;

                  return (
                    <div
                      key={index}
                      className="p-4 rounded-lg border-2 transition-all hover:shadow-md"
                      style={{ borderLeftColor: config.chartColor, borderLeftWidth: 4 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", config.bg)}>
                            <Icon className={cn("h-4 w-4", config.text)} />
                          </div>
                          <span className="font-medium capitalize">{item.type}</span>
                        </div>
                        <Badge variant="outline">{countShare.toFixed(1)}%</Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Count</span>
                          <span className="font-bold">{formatNumber(item.count)}</span>
                        </div>
                        <Progress value={countShare} className="h-2" />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Share of Total</span>
                          <span className="font-medium">{countShare.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

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
