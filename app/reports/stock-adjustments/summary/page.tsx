"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getStockAdjustmentSummary, downloadReportAsCsv, AdjustmentSummaryItem, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency, formatDate } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Package, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<any> }> = {
  increase: { bg: "bg-green-100", text: "text-green-700", icon: ArrowUpCircle },
  decrease: { bg: "bg-red-100", text: "text-red-700", icon: ArrowDownCircle },
  correction: { bg: "bg-blue-100", text: "text-blue-700", icon: RefreshCw },
};

const statusConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<any> }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", icon: RefreshCw },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
  approved: { bg: "bg-blue-100", text: "text-blue-700", icon: CheckCircle },
  completed: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
  rejected: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
};

const CHART_COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"];

const columns: ColumnDef<AdjustmentSummaryItem>[] = [
  { accessorKey: "adjustment_number", header: "Reference", cell: ({ row }) => <span className="font-mono font-medium">{row.original.adjustment_number}</span> },
  { accessorKey: "created_at", header: "Date", cell: ({ row }) => formatDate(row.original.created_at) },
  { accessorKey: "product", header: "Product", cell: ({ row }) => <div><p className="font-medium">{row.original.product?.name}</p><p className="text-sm text-muted-foreground">{row.original.product?.sku}</p></div> },
  { accessorKey: "adjustment_type", header: "Type", cell: ({ row }) => { const type = row.original.adjustment_type?.toLowerCase() || "increase"; const config = typeConfig[type] || typeConfig.increase; const Icon = config.icon; return <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}><Icon className="h-3 w-3" />{type}</Badge>; } },
  { accessorKey: "quantity_adjusted", header: "Quantity", cell: ({ row }) => { const qty = row.original.quantity_adjusted; const type = row.original.adjustment_type; const isPositive = type === "increase"; return <span className={cn("font-mono font-medium", isPositive ? "text-green-600" : "text-red-600")}>{isPositive ? "+" : "-"}{formatNumber(Math.abs(qty))}</span>; } },
  { accessorKey: "total_value", header: "Value Impact", cell: ({ row }) => { const type = row.original.adjustment_type; const value = parseFloat(row.original.total_value || "0"); return <span className={cn("font-mono font-medium", type === "increase" ? "text-green-600" : "text-red-600")}>{type === "increase" ? "+" : "-"}{formatCurrency(value)}</span>; } },
  { accessorKey: "reason_type", header: "Reason", cell: ({ row }) => <span className="capitalize text-sm">{row.original.reason_type?.replace(/_/g, " ") || "—"}</span> },
  { accessorKey: "createdBy", header: "Created By", cell: ({ row }) => row.original.createdBy ? `${row.original.createdBy.first_name} ${row.original.createdBy.last_name}` : "—" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => { const status = row.original.status?.toLowerCase() || "draft"; const config = statusConfig[status] || statusConfig.draft; const Icon = config.icon; return <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}><Icon className="h-3 w-3" />{status}</Badge>; } },
];

export default function StockAdjustmentSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month", per_page: 25, page: 1 });
  const [data, setData] = React.useState<AdjustmentSummaryItem[]>([]);
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

  const totalAdjustments = summary?.total_adjustments || 0;
  const pendingCount = summary?.pending || 0;
  const approvedCount = summary?.approved || 0;
  const rejectedCount = summary?.rejected || 0;
  const totalIncreased = summary?.total_increased || 0;
  const totalDecreased = summary?.total_decreased || 0;

  // Calculate totals from data
  const netImpact = data.reduce((acc, a) => {
    const value = parseFloat(a.total_value || "0");
    return a.adjustment_type === "increase" ? acc + value : acc - value;
  }, 0);
  const netQuantity = data.reduce((acc, a) => {
    return a.adjustment_type === "increase" ? acc + a.quantity_adjusted : acc - a.quantity_adjusted;
  }, 0);

  // Group by type for chart
  const typeData = [{ type: "increase", count: 0, total_quantity: 0 }, { type: "decrease", count: 0, total_quantity: 0 }];
  data.forEach(item => {
    const entry = typeData.find(t => t.type === item.adjustment_type);
    if (entry) {
      entry.count++;
      entry.total_quantity += item.quantity_adjusted;
    }
  });

  const typeChartData = typeData.map((t, idx) => ({
    name: t.type.replace(/^\w/, (c: string) => c.toUpperCase()), value: t.count, fill: CHART_COLORS[idx % CHART_COLORS.length]
  }));

  // Group by reason for chart
  const reasonMap = new Map<string, { count: number; total_quantity: number }>();
  data.forEach(item => {
    const reason = item.reason_type || "other";
    const existing = reasonMap.get(reason);
    if (existing) {
      existing.count++;
      existing.total_quantity += item.quantity_adjusted;
    } else {
      reasonMap.set(reason, { count: 1, total_quantity: item.quantity_adjusted });
    }
  });
  const reasonChartData = Array.from(reasonMap.entries()).slice(0, 6).map(([reason, data]) => ({
    name: reason.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase()), count: data.count, quantity: data.total_quantity
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
          <SummaryCard title="Pending" value={pendingCount} icon="Clock" variant="warning" loading={loading} />
          <SummaryCard title="Approved" value={approvedCount} icon="CheckCircle" variant="success" loading={loading} />
          <SummaryCard title="Rejected" value={rejectedCount} icon="XCircle" variant="danger" loading={loading} />
        </SummaryGrid>

        <SummaryGrid className="mt-4">
          <SummaryCard title="Net Value Impact" value={formatCurrency(Math.abs(netImpact))} subtitle={netImpact >= 0 ? "increase" : "decrease"} icon={netImpact >= 0 ? "TrendingUp" : "TrendingDown"} variant={netImpact >= 0 ? "success" : "danger"} loading={loading} />
          <SummaryCard title="Net Quantity" value={formatNumber(Math.abs(netQuantity))} subtitle={netQuantity >= 0 ? "added" : "removed"} icon="Package" loading={loading} />
          <SummaryCard title="Total Increased" value={formatNumber(totalIncreased)} subtitle="units added" icon="ArrowUpCircle" variant="success" loading={loading} />
          <SummaryCard title="Total Decreased" value={formatNumber(totalDecreased)} subtitle="units removed" icon="ArrowDownCircle" variant="danger" loading={loading} />
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
