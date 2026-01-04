"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getRepairsSummary, downloadReportAsCsv, RepairSummaryItem, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency, formatDate } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, Package, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" },
};

const CHART_COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6"];

const columns: ColumnDef<RepairSummaryItem>[] = [
  { accessorKey: "reference", header: "Reference", cell: ({ row }) => <span className="font-mono font-medium">{row.original.reference}</span> },
  { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: "product", header: "Product", cell: ({ row }) => <div><p className="font-medium">{row.original.product?.name}</p><p className="text-sm text-muted-foreground">{row.original.product?.sku}</p></div> },
  { accessorKey: "quantity", header: "Quantity", cell: ({ row }) => <span className="font-mono">{formatNumber(row.original.quantity)}</span> },
  { accessorKey: "repair_cost", header: "Cost", cell: ({ row }) => <span className="font-mono font-medium">{formatCurrency(row.original.repair_cost || 0)}</span> },
  { accessorKey: "status", header: "Status", cell: ({ row }) => { const status = row.original.status?.toLowerCase() || "pending"; const config = statusConfig[status] || statusConfig.pending; return <Badge className={cn(config.bg, config.text, "border-0 capitalize")}>{status.replace(/_/g, " ")}</Badge>; } },
  { accessorKey: "store", header: "Store", cell: ({ row }) => row.original.store?.name || "—" },
];

export default function RepairsSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month", per_page: 25, page: 1 });
  const [data, setData] = React.useState<RepairSummaryItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);
  const [pagination, setPagination] = React.useState({ total: 0, currentPage: 1, lastPage: 1 });

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getRepairsSummary(filters);
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
    try { await downloadReportAsCsv("/repairs/summary", filters, "repairs_summary.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalRepairs = summary?.total_repairs || data.length;
  const totalCost = summary?.total_cost || data.reduce((acc, r) => acc + (r.repair_cost || 0), 0);
  const totalQuantity = summary?.total_quantity || data.reduce((acc, r) => acc + r.quantity, 0);
  const completedCount = summary?.by_status?.find((s: any) => s.status === "completed")?.count || 0;
  const inProgressCount = summary?.by_status?.find((s: any) => s.status === "in_progress")?.count || 0;

  const statusChartData = (summary?.by_status || []).map((s: any, idx: number) => ({
    name: s.status.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase()), value: s.count, fill: CHART_COLORS[idx % CHART_COLORS.length]
  }));

  if (error && !data.length) {
    return <ReportLayout title="Repairs Summary" description="Overview of repairs" category="repairs" categoryLabel="Repairs"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Repairs Summary" description="Track and analyze product repairs and maintenance costs" category="repairs" categoryLabel="Repairs" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Repairs" value={totalRepairs} icon="Wrench" loading={loading} />
          <SummaryCard title="Total Cost" value={formatCurrency(totalCost)} icon="DollarSign" variant="warning" loading={loading} />
          <SummaryCard title="Units Repaired" value={formatNumber(totalQuantity)} icon="Package" loading={loading} />
          <SummaryCard title="Completion Rate" value={`${totalRepairs > 0 ? ((completedCount / totalRepairs) * 100).toFixed(0) : 0}%`} subtitle={`${completedCount} completed, ${inProgressCount} in progress`} icon="CheckCircle" variant={completedCount > inProgressCount ? "success" : "warning"} loading={loading} />
        </SummaryGrid>

        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500 text-white"><Wrench className="h-6 w-6" /></div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Repair Costs This Period</p>
                <h3 className="text-3xl font-bold text-amber-600">{formatCurrency(totalCost)}</h3>
                <p className="text-sm text-muted-foreground">Avg cost: {formatCurrency(totalRepairs > 0 ? totalCost / totalRepairs : 0)} per repair</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Repairs by Status" description="Distribution by status" data={statusChartData} loading={loading} height={300} showLegend />
          <BarChartCard title="Status Breakdown" description="Repair count by status" data={statusChartData.map(s => ({ name: s.name, count: s.value }))} dataKeys={[{ key: "count", name: "Repairs", color: "#f59e0b" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="reference" searchPlaceholder="Search repairs..." pageSize={filters.per_page} totalItems={pagination.total} currentPage={pagination.currentPage} onPageChange={(page) => setFilters(prev => ({ ...prev, page }))} serverPagination />
        )}
      </div>
    </ReportLayout>
  );
}
