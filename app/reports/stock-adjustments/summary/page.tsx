"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getStockAdjustmentSummary, downloadReportAsCsv, StockAdjustmentSummaryItem, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency, formatDate } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Package, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<any> }> = {
  increase: { bg: "bg-green-100", text: "text-green-700", icon: ArrowUpCircle },
  decrease: { bg: "bg-red-100", text: "text-red-700", icon: ArrowDownCircle },
  correction: { bg: "bg-blue-100", text: "text-blue-700", icon: RefreshCw },
};

const CHART_COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"];

const columns: ColumnDef<StockAdjustmentSummaryItem>[] = [
  { accessorKey: "reference", header: "Reference", cell: ({ row }) => <span className="font-mono font-medium">{row.original.reference}</span> },
  { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: "product", header: "Product", cell: ({ row }) => <div><p className="font-medium">{row.original.product?.name}</p><p className="text-sm text-muted-foreground">{row.original.product?.sku}</p></div> },
  { accessorKey: "type", header: "Type", cell: ({ row }) => { const type = row.original.type?.toLowerCase() || "correction"; const config = typeConfig[type] || typeConfig.correction; const Icon = config.icon; return <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}><Icon className="h-3 w-3" />{type}</Badge>; } },
  { accessorKey: "quantity", header: "Quantity", cell: ({ row }) => { const qty = row.original.quantity; const isPositive = qty > 0; return <span className={cn("font-mono font-medium", isPositive ? "text-green-600" : "text-red-600")}>{isPositive ? "+" : ""}{formatNumber(qty)}</span>; } },
  { accessorKey: "value_impact", header: "Value Impact", cell: ({ row }) => { const value = row.original.value_impact || 0; return <span className={cn("font-mono font-medium", value >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(value)}</span>; } },
  { accessorKey: "reason", header: "Reason", cell: ({ row }) => <span className="capitalize text-sm">{row.original.reason?.replace(/_/g, " ") || "—"}</span> },
  { accessorKey: "store", header: "Store", cell: ({ row }) => row.original.store?.name || "—" },
];

export default function StockAdjustmentSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month", per_page: 25, page: 1 });
  const [data, setData] = React.useState<StockAdjustmentSummaryItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);
  const [pagination, setPagination] = React.useState({ total: 0, currentPage: 1, lastPage: 1 });

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getStockAdjustmentSummary(filters);
      if (response.success) {
        setData(response.data.data); setSummary(response.summary || null); setMeta(response.meta);
        setPagination({ total: response.data.total, currentPage: response.data.current_page, lastPage: response.data.last_page });
      }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/stock-adjustments/summary", filters, "stock_adjustments_summary.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalAdjustments = summary?.total_adjustments || data.length;
  const netImpact = summary?.net_value_impact || data.reduce((acc, a) => acc + (a.value_impact || 0), 0);
  const netQuantity = summary?.net_quantity || data.reduce((acc, a) => acc + a.quantity, 0);
  const increaseCount = summary?.by_type?.find((t: any) => t.type === "increase")?.count || 0;
  const decreaseCount = summary?.by_type?.find((t: any) => t.type === "decrease")?.count || 0;

  const typeChartData = (summary?.by_type || []).map((t: any, idx: number) => ({
    name: t.type.replace(/^\w/, (c: string) => c.toUpperCase()), value: t.count, fill: CHART_COLORS[idx % CHART_COLORS.length]
  }));

  const reasonChartData = (summary?.by_reason || []).slice(0, 6).map((r: any) => ({
    name: r.reason?.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase()) || "Other", count: r.count, impact: Math.abs(r.value_impact || 0)
  }));

  if (error && !data.length) {
    return <ReportLayout title="Stock Adjustments" description="Overview of adjustments" category="stock-adjustments" categoryLabel="Stock Adjustments"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Stock Adjustment Summary" description="Track inventory adjustments and their impact on stock value" category="stock-adjustments" categoryLabel="Stock Adjustments" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Adjustments" value={totalAdjustments} icon="RefreshCw" loading={loading} />
          <SummaryCard title="Net Value Impact" value={formatCurrency(Math.abs(netImpact))} subtitle={netImpact >= 0 ? "increase" : "decrease"} icon={netImpact >= 0 ? "TrendingUp" : "TrendingDown"} variant={netImpact >= 0 ? "success" : "danger"} loading={loading} />
          <SummaryCard title="Net Quantity" value={formatNumber(Math.abs(netQuantity))} subtitle={netQuantity >= 0 ? "added" : "removed"} icon="Package" loading={loading} />
          <SummaryCard title="Adjustment Ratio" value={`${increaseCount}/${decreaseCount}`} subtitle="increases/decreases" icon="ArrowRightLeft" loading={loading} />
        </SummaryGrid>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={cn("border-2", netImpact >= 0 ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl text-white", netImpact >= 0 ? "bg-green-500" : "bg-red-500")}>
                  {netImpact >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Value Impact</p>
                  <h3 className={cn("text-2xl font-bold", netImpact >= 0 ? "text-green-600" : "text-red-600")}>
                    {netImpact >= 0 ? "+" : ""}{formatCurrency(netImpact)}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border-2", netQuantity >= 0 ? "border-blue-200 bg-blue-50/50" : "border-orange-200 bg-orange-50/50")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl text-white", netQuantity >= 0 ? "bg-blue-500" : "bg-orange-500")}>
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Quantity Change</p>
                  <h3 className={cn("text-2xl font-bold", netQuantity >= 0 ? "text-blue-600" : "text-orange-600")}>
                    {netQuantity >= 0 ? "+" : ""}{formatNumber(netQuantity)} units
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Adjustments by Type" description="Distribution by adjustment type" data={typeChartData} loading={loading} height={300} showLegend />
          <BarChartCard title="Adjustments by Reason" description="Top adjustment reasons" data={reasonChartData} dataKeys={[{ key: "count", name: "Count", color: "#3b82f6" }, { key: "impact", name: "Value Impact", color: "#f59e0b" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="reference" searchPlaceholder="Search adjustments..." pageSize={filters.per_page} totalItems={pagination.total} currentPage={pagination.currentPage} onPageChange={(page) => setFilters(prev => ({ ...prev, page }))} serverPagination />
        )}
      </div>
    </ReportLayout>
  );
}
