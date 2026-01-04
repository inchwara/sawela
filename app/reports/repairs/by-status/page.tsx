"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getRepairsByStatus, downloadReportAsCsv, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard, BarChartCard } from "../../components/report-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, XCircle, Wrench, Loader2, PackageCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusItem { status: string; count: number; total_quantity: number; total_cost: number; avg_repair_time?: number; }

const statusConfig: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; text: string }> = {
  pending: { icon: Clock, color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700" },
  in_progress: { icon: Loader2, color: "#3b82f6", bg: "bg-blue-100", text: "text-blue-700" },
  awaiting_parts: { icon: AlertCircle, color: "#8b5cf6", bg: "bg-purple-100", text: "text-purple-700" },
  completed: { icon: CheckCircle, color: "#22c55e", bg: "bg-green-100", text: "text-green-700" },
  cancelled: { icon: XCircle, color: "#ef4444", bg: "bg-red-100", text: "text-red-700" },
  returned: { icon: PackageCheck, color: "#10b981", bg: "bg-emerald-100", text: "text-emerald-700" },
};

const columns: ColumnDef<StatusItem>[] = [
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const status = row.original.status?.toLowerCase() || "pending";
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}><Icon className="h-3 w-3" />{status.replace(/_/g, " ")}</Badge>;
  }},
  { accessorKey: "count", header: "Repairs", cell: ({ row }) => formatNumber(row.original.count) },
  { accessorKey: "total_quantity", header: "Items", cell: ({ row }) => <span className="font-mono">{formatNumber(row.original.total_quantity)}</span> },
  { accessorKey: "total_cost", header: "Total Cost", cell: ({ row }) => <span className="font-mono font-medium">{formatCurrency(row.original.total_cost)}</span> },
  { accessorKey: "avg_repair_time", header: "Avg Time", cell: ({ row }) => row.original.avg_repair_time ? `${row.original.avg_repair_time.toFixed(1)} days` : "—" },
];

export default function RepairByStatusReport() {
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
      const response = await getRepairsByStatus(filters);
      if (response.success) { setData(response.data || []); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/repairs/by-status", filters, "repairs_by_status.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalRepairs = data.reduce((a, s) => a + s.count, 0);
  const totalCost = data.reduce((a, s) => a + s.total_cost, 0);
  const pendingCount = data.find(s => s.status?.toLowerCase() === "pending")?.count || 0;
  const completedCount = data.find(s => s.status?.toLowerCase() === "completed")?.count || 0;
  const inProgressCount = data.find(s => s.status?.toLowerCase() === "in_progress")?.count || 0;

  const pieData = data.map(s => ({
    name: (s.status || "Unknown").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: s.count,
    fill: statusConfig[s.status?.toLowerCase() || "pending"]?.color || "#6b7280"
  }));

  const barData = data.map(s => ({
    name: (s.status || "Unknown").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    count: s.count,
    cost: s.total_cost
  }));

  if (error && !data.length) {
    return <ReportLayout title="Repairs by Status" description="Status breakdown" category="repairs" categoryLabel="Repairs"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Repairs by Status" description="Monitor repair workflow and completion status" category="repairs" categoryLabel="Repairs" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Repairs" value={totalRepairs} icon="Wrench" loading={loading} />
          <SummaryCard title="Pending" value={pendingCount} icon="Clock" variant="warning" loading={loading} />
          <SummaryCard title="In Progress" value={inProgressCount} icon="Loader2" variant="info" loading={loading} />
          <SummaryCard title="Completed" value={completedCount} icon="CheckCircle" variant="success" loading={loading} />
        </SummaryGrid>

        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100"><Wrench className="h-6 w-6 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Repair Cost</p>
                  <h3 className="text-2xl font-bold text-blue-600">{formatCurrency(totalCost)}</h3>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center"><p className="text-2xl font-bold">{totalRepairs > 0 ? ((completedCount / totalRepairs) * 100).toFixed(1) : 0}%</p><p className="text-sm text-muted-foreground">Completion Rate</p></div>
                <div className="text-center"><p className="text-2xl font-bold">{totalRepairs > 0 ? formatCurrency(totalCost / totalRepairs) : "—"}</p><p className="text-sm text-muted-foreground">Avg Cost/Repair</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {data.map((status) => {
            const key = status.status?.toLowerCase() || "pending";
            const config = statusConfig[key] || statusConfig.pending;
            const Icon = config.icon;
            const percentage = totalRepairs > 0 ? (status.count / totalRepairs) * 100 : 0;
            return (
              <Card key={status.status} className="border overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: config.color }} />
                <CardContent className="p-4 text-center">
                  <div className={cn("mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2", config.bg)}><Icon className={cn("h-5 w-5", config.text)} /></div>
                  <p className="text-xs text-muted-foreground capitalize mb-1">{(status.status || "Unknown").replace(/_/g, " ")}</p>
                  <h3 className="text-xl font-bold">{formatNumber(status.count)}</h3>
                  <Progress value={percentage} className="h-1 mt-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Distribution by Status" description="Repair count by status" data={pieData} loading={loading} height={300} showLegend />
          <BarChartCard title="Status Comparison" description="Count and cost by status" data={barData} dataKeys={[{ key: "count", name: "Repairs", color: "#3b82f6" }, { key: "cost", name: "Cost", color: "#f59e0b" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="status" searchPlaceholder="Search statuses..." />
        )}
      </div>
    </ReportLayout>
  );
}
