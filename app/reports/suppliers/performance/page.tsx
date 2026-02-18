"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  getSupplierPerformance,
  downloadReportAsCsv,
  SupplierPerformanceItem,
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
import { 
  Building2, Clock, CheckCircle, AlertTriangle, Star, 
  TrendingUp, TrendingDown, Trophy, Timer 
} from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// Performance rating badge
const getRatingConfig = (score: number) => {
  if (score >= 90) return { label: "Excellent", bg: "bg-green-100", text: "text-green-700", icon: Trophy };
  if (score >= 75) return { label: "Good", bg: "bg-blue-100", text: "text-blue-700", icon: TrendingUp };
  if (score >= 50) return { label: "Average", bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock };
  return { label: "Poor", bg: "bg-red-100", text: "text-red-700", icon: TrendingDown };
};

// Table columns
const columns: ColumnDef<SupplierPerformanceItem>[] = [
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium">{row.original.supplier.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "performance_score",
    header: "Score",
    cell: ({ row }) => {
      const score = row.original.performance_score || 0;
      const config = getRatingConfig(score);
      const Icon = config.icon;
      return (
        <div className="flex items-center gap-2">
          <Badge className={cn(config.bg, config.text, "gap-1 border-0")}>
            <Icon className="h-3 w-3" />
            {score.toFixed(0)}%
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "on_time_delivery_rate",
    header: "On-Time Delivery",
    cell: ({ row }) => {
      const rate = row.original.on_time_delivery_rate || 0;
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
  {
    accessorKey: "quality_rate",
    header: "Quality Rate",
    cell: ({ row }) => {
      const rate = row.original.quality_rate || 0;
      return (
        <div className="flex items-center gap-2">
          <Progress value={rate} className="w-16 h-2" />
          <span className={cn("text-sm font-medium", rate >= 95 ? "text-green-600" : rate >= 80 ? "text-yellow-600" : "text-red-600")}>
            {rate.toFixed(0)}%
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "avg_delivery_days",
    header: "Avg Lead Time",
    cell: ({ row }) => (
      <span className="flex items-center gap-1">
        <Timer className="h-4 w-4 text-muted-foreground" />
        {row.original.avg_delivery_days ? `${row.original.avg_delivery_days} days` : "—"}
      </span>
    ),
  },
  {
    accessorKey: "total_orders",
    header: "Total Orders",
    cell: ({ row }) => formatNumber(row.original.total_orders || 0),
  },
  {
    accessorKey: "defect_count",
    header: "Defects",
    cell: ({ row }) => {
      const count = row.original.defect_count || 0;
      return (
        <Badge variant={count > 0 ? "destructive" : "outline"}>
          {count}
        </Badge>
      );
    },
  },
];

export default function SupplierPerformanceReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    per_page: 50,
    page: 1,
  });
  
  const [data, setData] = React.useState<SupplierPerformanceItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSupplierPerformance(filters);
      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : response.data.data;
        setData(items);
        setSummary(response.summary || null);
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
      await downloadReportAsCsv("/suppliers/performance", filters, "supplier_performance.csv");
      toast.success("The report has been downloaded as CSV");
    } catch (err: any) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate averages
  const totalSuppliers = data.length;
  const avgPerformance = totalSuppliers > 0 
    ? data.reduce((acc, s) => acc + (s.performance_score || 0), 0) / totalSuppliers 
    : 0;
  const avgOnTimeRate = totalSuppliers > 0 
    ? data.reduce((acc, s) => acc + (s.on_time_delivery_rate || 0), 0) / totalSuppliers 
    : 0;
  const avgQualityRate = totalSuppliers > 0 
    ? data.reduce((acc, s) => acc + (s.quality_rate || 0), 0) / totalSuppliers 
    : 0;

  // Sort by performance
  const topPerformers = [...data].sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0)).slice(0, 8);
  const topPerformer = topPerformers[0];

  // Performance distribution
  const performanceDistribution = [
    { name: "Excellent (90+)", value: data.filter(s => (s.performance_score || 0) >= 90).length, fill: "#22c55e" },
    { name: "Good (75-89)", value: data.filter(s => (s.performance_score || 0) >= 75 && (s.performance_score || 0) < 90).length, fill: "#3b82f6" },
    { name: "Average (50-74)", value: data.filter(s => (s.performance_score || 0) >= 50 && (s.performance_score || 0) < 75).length, fill: "#f59e0b" },
    { name: "Poor (<50)", value: data.filter(s => (s.performance_score || 0) < 50).length, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  // Chart data
  const performanceChartData = topPerformers.map((s) => ({
    name: s.supplier.name.length > 10 ? s.supplier.name.slice(0, 10) + "..." : s.supplier.name,
    score: s.performance_score || 0,
    onTime: s.on_time_delivery_rate || 0,
    quality: s.quality_rate || 0,
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Supplier Performance"
        description="Supplier performance metrics"
        category="suppliers"
        categoryLabel="Suppliers"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Supplier Performance"
      description="Evaluate supplier performance based on delivery, quality, and reliability metrics"
      category="suppliers"
      categoryLabel="Suppliers"
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
            title="Avg Performance"
            value={`${avgPerformance.toFixed(0)}%`}
            subtitle={getRatingConfig(avgPerformance).label}
            icon="TrendingUp"
            variant={avgPerformance >= 75 ? "success" : avgPerformance >= 50 ? "warning" : "danger"}
            loading={loading}
          />
          <SummaryCard
            title="On-Time Delivery"
            value={`${avgOnTimeRate.toFixed(0)}%`}
            subtitle="average rate"
            icon="Clock"
            variant={avgOnTimeRate >= 80 ? "success" : avgOnTimeRate >= 60 ? "warning" : "danger"}
            loading={loading}
          />
          <SummaryCard
            title="Quality Rate"
            value={`${avgQualityRate.toFixed(0)}%`}
            subtitle="average rate"
            icon="CheckCircle"
            variant={avgQualityRate >= 95 ? "success" : avgQualityRate >= 80 ? "warning" : "danger"}
            loading={loading}
          />
          <SummaryCard
            title="Suppliers Evaluated"
            value={totalSuppliers}
            icon="Building2"
            loading={loading}
          />
        </SummaryGrid>

        {/* Top Performer Highlight */}
        {topPerformer && (
          <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500 text-white">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Performer</p>
                    <h3 className="text-xl font-bold">{topPerformer.supplier.name}</h3>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                      <span>On-time: {topPerformer.on_time_delivery_rate?.toFixed(0)}%</span>
                      <span>•</span>
                      <span>Quality: {topPerformer.quality_rate?.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-emerald-600">{topPerformer.performance_score?.toFixed(0)}%</p>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">
                    <Trophy className="h-3 w-3 mr-1" />
                    Excellent
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Performance Distribution"
            description="Suppliers grouped by performance rating"
            data={performanceDistribution}
            loading={loading}
            height={320}
            showLegend
          />
          <BarChartCard
            title="Performance Comparison"
            description="Score breakdown by supplier"
            data={performanceChartData}
            dataKeys={[
              { key: "score", name: "Overall Score", color: "#8b5cf6" },
              { key: "onTime", name: "On-Time %", color: "#3b82f6" },
              { key: "quality", name: "Quality %", color: "#22c55e" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={320}
          />
        </div>

        {/* Performance Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Supplier Rankings
            </CardTitle>
            <CardDescription>
              Detailed performance metrics for each supplier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((supplier, index) => {
                const config = getRatingConfig(supplier.performance_score || 0);
                const Icon = config.icon;
                
                return (
                  <div key={index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium">{supplier.supplier.name}</span>
                          <Badge className={cn(config.bg, config.text, "ml-2 border-0 gap-1")}>
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold">{supplier.performance_score?.toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span className="text-muted-foreground">On-Time Delivery</span>
                          <span className="font-medium">{supplier.on_time_delivery_rate?.toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={supplier.on_time_delivery_rate || 0} 
                          className="h-2"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span className="text-muted-foreground">Quality Rate</span>
                          <span className="font-medium">{supplier.quality_rate?.toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={supplier.quality_rate || 0} 
                          className="h-2 [&>div]:bg-green-500"
                        />
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Avg Lead Time</p>
                        <p className="font-bold text-lg flex items-center gap-1">
                          <Timer className="h-4 w-4" />
                          {supplier.avg_delivery_days || 0} days
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Defects</p>
                        <p className={cn(
                          "font-bold text-lg",
                          (supplier.defect_count || 0) > 0 ? "text-red-600" : "text-green-600"
                        )}>
                          {supplier.defect_count || 0} reported
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
            searchColumn="supplier"
            searchPlaceholder="Search suppliers..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
