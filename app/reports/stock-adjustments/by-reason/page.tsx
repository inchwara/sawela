"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getStockAdjustmentByReason, downloadReportAsCsv, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileQuestion, ShieldCheck, Package, AlertCircle, Recycle, Gift, Truck, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasonItem { reason: string; count: number; total_quantity: number; total_value_impact: number; }

const reasonConfig: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; text: string }> = {
  damaged: { icon: AlertCircle, color: "#ef4444", bg: "bg-red-100", text: "text-red-700" },
  expired: { icon: Package, color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700" },
  theft: { icon: ShieldCheck, color: "#dc2626", bg: "bg-rose-100", text: "text-rose-700" },
  found: { icon: Gift, color: "#22c55e", bg: "bg-green-100", text: "text-green-700" },
  returned: { icon: RotateCcw, color: "#3b82f6", bg: "bg-blue-100", text: "text-blue-700" },
  transfer: { icon: Truck, color: "#8b5cf6", bg: "bg-purple-100", text: "text-purple-700" },
  recount: { icon: Recycle, color: "#06b6d4", bg: "bg-cyan-100", text: "text-cyan-700" },
  other: { icon: FileQuestion, color: "#6b7280", bg: "bg-gray-100", text: "text-gray-700" },
};

const CHART_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899", "#6b7280"];

const columns: ColumnDef<ReasonItem>[] = [
  { accessorKey: "reason", header: "Reason", cell: ({ row }) => {
    const reason = row.original.reason?.toLowerCase() || "other";
    const config = reasonConfig[reason] || reasonConfig.other;
    const Icon = config.icon;
    return <div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", config.bg)}><Icon className={cn("h-4 w-4", config.text)} /></div><span className="font-medium capitalize">{reason.replace(/_/g, " ")}</span></div>;
  }},
  { accessorKey: "count", header: "Adjustments", cell: ({ row }) => formatNumber(row.original.count) },
  { accessorKey: "total_quantity", header: "Total Quantity", cell: ({ row }) => {
    const qty = row.original.total_quantity;
    return <span className={cn("font-mono font-medium", qty >= 0 ? "text-green-600" : "text-red-600")}>{qty >= 0 ? "+" : ""}{formatNumber(qty)}</span>;
  }},
  { accessorKey: "total_value_impact", header: "Value Impact", cell: ({ row }) => {
    const value = row.original.total_value_impact;
    return <span className={cn("font-mono font-medium", value >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(value)}</span>;
  }},
];

export default function StockAdjustmentByReasonReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month" });
  const [data, setData] = React.useState<ReasonItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getStockAdjustmentByReason(filters);
      if (response.success) { setData(response.data || []); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/stock-adjustments/by-reason", filters, "adjustments_by_reason.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalAdjustments = data.reduce((a, r) => a + r.count, 0);
  const totalLoss = data.filter(r => r.total_value_impact < 0).reduce((a, r) => a + r.total_value_impact, 0);
  const totalGain = data.filter(r => r.total_value_impact >= 0).reduce((a, r) => a + r.total_value_impact, 0);
  const topReason = data.length > 0 ? data.reduce((prev, curr) => prev.count > curr.count ? prev : curr) : null;

  const pieData = data.map((r, idx) => ({
    name: (r.reason || "Other").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: r.count,
    fill: reasonConfig[r.reason?.toLowerCase() || "other"]?.color || CHART_COLORS[idx % CHART_COLORS.length]
  }));

  const barData = data.slice(0, 8).map(r => ({
    name: (r.reason || "Other").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    count: r.count,
    impact: Math.abs(r.total_value_impact)
  }));

  if (error && !data.length) {
    return <ReportLayout title="Adjustments by Reason" description="Breakdown by reason" category="stock-adjustments" categoryLabel="Stock Adjustments"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Adjustments by Reason" description="Understand why inventory adjustments occur" category="stock-adjustments" categoryLabel="Stock Adjustments" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Unique Reasons" value={data.length} icon="List" loading={loading} />
          <SummaryCard title="Top Reason" value={topReason?.reason?.replace(/_/g, " ") || "—"} subtitle={`${formatNumber(topReason?.count || 0)} adjustments`} icon="Trophy" loading={loading} />
          <SummaryCard title="Total Loss" value={formatCurrency(Math.abs(totalLoss))} icon="TrendingDown" variant="danger" loading={loading} />
          <SummaryCard title="Total Gain" value={formatCurrency(totalGain)} icon="TrendingUp" variant="success" loading={loading} />
        </SummaryGrid>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.slice(0, 4).map((reason) => {
            const key = reason.reason?.toLowerCase() || "other";
            const config = reasonConfig[key] || reasonConfig.other;
            const Icon = config.icon;
            const percentage = totalAdjustments > 0 ? (reason.count / totalAdjustments) * 100 : 0;
            return (
              <Card key={reason.reason} className="border overflow-hidden">
                <div className={cn("h-1.5", config.bg.replace("100", "500"))} style={{ backgroundColor: config.color }} />
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("p-2 rounded-lg", config.bg)}><Icon className={cn("h-4 w-4", config.text)} /></div>
                    <span className="font-medium capitalize text-sm">{(reason.reason || "Other").replace(/_/g, " ")}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Adjustments</span><span className="font-bold">{formatNumber(reason.count)}</span></div>
                    <Progress value={percentage} className="h-1.5" />
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{percentage.toFixed(1)}%</span><span className={cn("font-medium", reason.total_value_impact >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(reason.total_value_impact)}</span></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Distribution by Reason" description="Adjustment count by reason" data={pieData} loading={loading} height={300} showLegend />
          <BarChartCard title="Reason Impact Analysis" description="Compare frequency and value impact" data={barData} dataKeys={[{ key: "count", name: "Adjustments", color: "#3b82f6" }, { key: "impact", name: "Value Impact", color: "#f59e0b" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="reason" searchPlaceholder="Search reasons..." />
        )}
      </div>
    </ReportLayout>
  );
}
