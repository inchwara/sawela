"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getBreakageByStatus, downloadReportAsCsv, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard, BarChartCard } from "../../components/report-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusItem { status: string; count: number; total_quantity: number; total_value: number; }

const statusConfig: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; text: string }> = {
  pending: { icon: Clock, color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700" },
  investigating: { icon: Loader2, color: "#3b82f6", bg: "bg-blue-100", text: "text-blue-700" },
  confirmed: { icon: CheckCircle, color: "#22c55e", bg: "bg-green-100", text: "text-green-700" },
  rejected: { icon: XCircle, color: "#ef4444", bg: "bg-red-100", text: "text-red-700" },
  written_off: { icon: Archive, color: "#6b7280", bg: "bg-gray-100", text: "text-gray-700" },
  recovered: { icon: CheckCircle, color: "#10b981", bg: "bg-emerald-100", text: "text-emerald-700" },
};

const columns: ColumnDef<StatusItem>[] = [
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const status = row.original.status?.toLowerCase() || "pending";
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}><Icon className="h-3 w-3" />{status.replace(/_/g, " ")}</Badge>;
  }},
  { accessorKey: "count", header: "Breakages", cell: ({ row }) => formatNumber(row.original.count) },
  { accessorKey: "total_quantity", header: "Qty Affected", cell: ({ row }) => <span className="font-mono">{formatNumber(row.original.total_quantity)}</span> },
  { accessorKey: "total_value", header: "Total Value", cell: ({ row }) => <span className="font-mono text-red-600">{formatCurrency(row.original.total_value)}</span> },
];

export default function BreakageByStatusReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month" });
  const [data, setData] = React.useState<StatusItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getBreakageByStatus(filters);
      if (response.success) { setData(response.data || []); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/breakages/by-status", filters, "breakages_by_status.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalBreakages = data.reduce((a, s) => a + s.count, 0);
  const totalValue = data.reduce((a, s) => a + s.total_value, 0);
  const pendingCount = data.find(s => s.status?.toLowerCase() === "pending")?.count || 0;
  const confirmedCount = data.find(s => s.status?.toLowerCase() === "confirmed")?.count || 0;

  const pieData = data.map(s => ({
    name: (s.status || "Unknown").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: s.count,
    fill: statusConfig[s.status?.toLowerCase() || "pending"]?.color || "#6b7280"
  }));

  const barData = data.map(s => ({
    name: (s.status || "Unknown").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    count: s.count,
    value: s.total_value
  }));

  if (error && !data.length) {
    return <ReportLayout title="Breakages by Status" description="Status breakdown" category="breakage" categoryLabel="Breakage"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Breakages by Status" description="Monitor breakage workflow and resolution status" category="breakage" categoryLabel="Breakage" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Breakages" value={totalBreakages} icon="AlertTriangle" loading={loading} />
          <SummaryCard title="Pending Review" value={pendingCount} icon="Clock" variant="warning" loading={loading} />
          <SummaryCard title="Confirmed" value={confirmedCount} icon="CheckCircle" variant="success" loading={loading} />
          <SummaryCard title="Total Value" value={formatCurrency(totalValue)} icon="DollarSign" variant="danger" loading={loading} />
        </SummaryGrid>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {data.map((status) => {
            const key = status.status?.toLowerCase() || "pending";
            const config = statusConfig[key] || statusConfig.pending;
            const Icon = config.icon;
            const percentage = totalBreakages > 0 ? (status.count / totalBreakages) * 100 : 0;
            return (
              <Card key={status.status} className={cn("border-2", config.bg.replace("100", "200"))}>
                <CardContent className="p-4 text-center">
                  <div className={cn("mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3", config.bg)}><Icon className={cn("h-6 w-6", config.text)} /></div>
                  <p className="text-sm text-muted-foreground capitalize">{(status.status || "Unknown").replace(/_/g, " ")}</p>
                  <h3 className="text-2xl font-bold">{formatNumber(status.count)}</h3>
                  <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Distribution by Status" description="Breakage count by status" data={pieData} loading={loading} height={300} showLegend />
          <BarChartCard title="Status Comparison" description="Count and value by status" data={barData} dataKeys={[{ key: "count", name: "Breakages", color: "#ef4444" }, { key: "value", name: "Value", color: "#f59e0b" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="status" searchPlaceholder="Search statuses..." />
        )}
      </div>
    </ReportLayout>
  );
}
