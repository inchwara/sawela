"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { getStores, Store } from "@/lib/stores";
import { getStockAdjustmentByType, downloadReportAsCsv, AdjustmentByTypeItem, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Layers, TrendingUp, TrendingDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<any>; color: string }> = {
  increase: { bg: "bg-green-100", text: "text-green-700", icon: ArrowUpCircle, color: "#22c55e" },
  decrease: { bg: "bg-red-100", text: "text-red-700", icon: ArrowDownCircle, color: "#ef4444" },
  correction: { bg: "bg-blue-100", text: "text-blue-700", icon: RefreshCw, color: "#3b82f6" },
};

const columns: ColumnDef<AdjustmentByTypeItem>[] = [
  { accessorKey: "adjustment_type", header: "Type", cell: ({ row }) => {
    const type = row.original.adjustment_type.toLowerCase();
    const config = typeConfig[type] || typeConfig.correction;
    const Icon = config.icon;
    return <div className="flex items-center gap-2"><div className={cn("p-2 rounded-lg", config.bg)}><Icon className={cn("h-4 w-4", config.text)} /></div><span className="font-medium capitalize">{type}</span></div>;
  }},
  { accessorKey: "count", header: "Adjustments", cell: ({ row }) => formatNumber(row.original.count) },
  { accessorKey: "total_quantity", header: "Total Quantity", cell: ({ row }) => {
    const qty = row.original.total_quantity;
    const type = row.original.adjustment_type.toLowerCase();
    return <span className={cn("font-mono font-medium", type === "increase" ? "text-green-600" : type === "decrease" ? "text-red-600" : "text-blue-600")}>
      {type === "increase" ? "+" : type === "decrease" ? "-" : ""}{formatNumber(Math.abs(qty))}
    </span>;
  }},
  { accessorKey: "total_value", header: "Total Value", cell: ({ row }) => {
    const value = parseFloat(row.original.total_value || "0");
    const type = row.original.adjustment_type.toLowerCase();
    return <span className={cn("font-mono font-medium", type === "increase" ? "text-green-600" : "text-red-600")}>
      {type === "increase" ? "+" : "-"}{formatCurrency(value)}
    </span>;
  }},
];

export default function StockAdjustmentByTypeReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month" });
  const [data, setData] = React.useState<AdjustmentByTypeItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getStockAdjustmentByType(filters);
      if (response.success) { setData(response.data || []); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast.error(err.message); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/stock-adjustments/by-type", filters, "adjustments_by_type.csv"); toast.success("Export successful"); }
    catch (err: any) { toast.error(err.message); }
    finally { setExportLoading(false); }
  };

  const totalAdjustments = data.reduce((a, t) => a + t.count, 0);
  const netQuantity = data.reduce((a, t) => {
    return t.adjustment_type === "increase" ? a + t.total_quantity : a - t.total_quantity;
  }, 0);
  const netValue = data.reduce((a, t) => {
    const value = parseFloat(t.total_value || "0");
    return t.adjustment_type === "increase" ? a + value : a - value;
  }, 0);

  const pieData = data.map(t => ({
    name: t.adjustment_type.replace(/^\w/, c => c.toUpperCase()),
    value: t.count,
    fill: typeConfig[t.adjustment_type.toLowerCase()]?.color || "#6b7280"
  }));

  const barData = data.map(t => ({
    name: t.adjustment_type.replace(/^\w/, c => c.toUpperCase()),
    adjustments: t.count,
    quantity: Math.abs(t.total_quantity),
    value: Math.abs(parseFloat(t.total_value || "0"))
  }));

  if (error && !data.length) {
    return <ReportLayout title="Adjustments by Type" description="Breakdown by type" category="stock-adjustments" categoryLabel="Stock Adjustments"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Adjustments by Type" description="Analyze stock adjustments grouped by adjustment type" category="stock-adjustments" categoryLabel="Stock Adjustments" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Adjustments" value={totalAdjustments} icon="RefreshCw" loading={loading} />
          <SummaryCard title="Adjustment Types" value={data.length} icon="Layers" loading={loading} />
          <SummaryCard title="Net Quantity" value={formatNumber(netQuantity)} icon="Package" variant={netQuantity >= 0 ? "success" : "danger"} loading={loading} />
          <SummaryCard title="Net Value Impact" value={formatCurrency(netValue)} icon={netValue >= 0 ? "TrendingUp" : "TrendingDown"} variant={netValue >= 0 ? "success" : "danger"} loading={loading} />
        </SummaryGrid>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((type) => {
            const config = typeConfig[type.adjustment_type.toLowerCase()] || typeConfig.correction;
            const Icon = config.icon;
            const percentage = totalAdjustments > 0 ? (type.count / totalAdjustments) * 100 : 0;
            const value = parseFloat(type.total_value || "0");
            return (
              <Card key={type.adjustment_type} className={cn("border-2", config.bg)}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn("p-3 rounded-xl", config.bg)}><Icon className={cn("h-6 w-6", config.text)} /></div>
                    <div><p className="text-sm text-muted-foreground capitalize">{type.adjustment_type} Adjustments</p><h3 className="text-2xl font-bold">{formatNumber(type.count)}</h3></div>
                  </div>
                  <Progress value={percentage} className="h-2 mb-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{percentage.toFixed(1)}% of total</span>
                    <span className={cn("font-medium", type.adjustment_type === "increase" ? "text-green-600" : "text-red-600")}>{formatCurrency(value)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Distribution by Type" description="Adjustment count breakdown" data={pieData} loading={loading} height={300} showLegend />
          <BarChartCard title="Type Comparison" description="Compare quantities and values by type" data={barData} dataKeys={[{ key: "quantity", name: "Quantity", color: "#3b82f6" }, { key: "value", name: "Value Impact", color: "#f59e0b" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="type" searchPlaceholder="Search types..." />
        )}
      </div>
    </ReportLayout>
  );
}
