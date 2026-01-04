"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getRequisitionsByStatus, downloadReportAsCsv, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard, BarChartCard } from "../../components/report-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, XCircle, FileText, Send, AlertCircle, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusItem { status: string; count: number; total_items: number; total_value: number; avg_processing_time?: number; }

const statusConfig: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; text: string }> = {
  draft: { icon: FileText, color: "#6b7280", bg: "bg-gray-100", text: "text-gray-700" },
  pending: { icon: Clock, color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700" },
  submitted: { icon: Send, color: "#3b82f6", bg: "bg-blue-100", text: "text-blue-700" },
  approved: { icon: CheckCircle, color: "#22c55e", bg: "bg-green-100", text: "text-green-700" },
  rejected: { icon: XCircle, color: "#ef4444", bg: "bg-red-100", text: "text-red-700" },
  partially_fulfilled: { icon: AlertCircle, color: "#8b5cf6", bg: "bg-purple-100", text: "text-purple-700" },
  fulfilled: { icon: PackageCheck, color: "#10b981", bg: "bg-emerald-100", text: "text-emerald-700" },
};

const columns: ColumnDef<StatusItem>[] = [
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const status = row.original.status?.toLowerCase() || "pending";
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}><Icon className="h-3 w-3" />{status.replace(/_/g, " ")}</Badge>;
  }},
  { accessorKey: "count", header: "Requisitions", cell: ({ row }) => formatNumber(row.original.count) },
  { accessorKey: "total_items", header: "Items", cell: ({ row }) => <span className="font-mono">{formatNumber(row.original.total_items)}</span> },
  { accessorKey: "total_value", header: "Total Value", cell: ({ row }) => <span className="font-mono font-medium">{formatCurrency(row.original.total_value)}</span> },
  { accessorKey: "avg_processing_time", header: "Avg Time", cell: ({ row }) => row.original.avg_processing_time ? `${row.original.avg_processing_time.toFixed(1)} days` : "—" },
];

export default function RequisitionByStatusReport() {
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
      const response = await getRequisitionsByStatus(filters);
      if (response.success) { setData(response.data || []); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/requisitions/by-status", filters, "requisitions_by_status.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalRequisitions = data.reduce((a, s) => a + s.count, 0);
  const totalValue = data.reduce((a, s) => a + s.total_value, 0);
  const pendingCount = data.find(s => s.status?.toLowerCase() === "pending")?.count || 0;
  const approvedCount = data.find(s => s.status?.toLowerCase() === "approved")?.count || 0;
  const fulfilledCount = data.find(s => s.status?.toLowerCase() === "fulfilled")?.count || 0;

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
    return <ReportLayout title="Requisitions by Status" description="Status breakdown" category="requisitions" categoryLabel="Requisitions"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Requisitions by Status" description="Monitor requisition workflow and approval status" category="requisitions" categoryLabel="Requisitions" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Requisitions" value={totalRequisitions} icon="FileText" loading={loading} />
          <SummaryCard title="Pending" value={pendingCount} icon="Clock" variant="warning" loading={loading} />
          <SummaryCard title="Approved" value={approvedCount} icon="CheckCircle" variant="success" loading={loading} />
          <SummaryCard title="Fulfilled" value={fulfilledCount} icon="PackageCheck" variant="info" loading={loading} />
        </SummaryGrid>

        <Card className="border-2 border-purple-200 bg-purple-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100"><FileText className="h-6 w-6 text-purple-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Requisition Value</p>
                  <h3 className="text-2xl font-bold text-purple-600">{formatCurrency(totalValue)}</h3>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center"><p className="text-2xl font-bold">{totalRequisitions > 0 ? ((approvedCount / totalRequisitions) * 100).toFixed(1) : 0}%</p><p className="text-sm text-muted-foreground">Approval Rate</p></div>
                <div className="text-center"><p className="text-2xl font-bold">{totalRequisitions > 0 ? ((fulfilledCount / totalRequisitions) * 100).toFixed(1) : 0}%</p><p className="text-sm text-muted-foreground">Fulfillment Rate</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {data.map((status) => {
            const key = status.status?.toLowerCase() || "pending";
            const config = statusConfig[key] || statusConfig.pending;
            const Icon = config.icon;
            const percentage = totalRequisitions > 0 ? (status.count / totalRequisitions) * 100 : 0;
            return (
              <Card key={status.status} className="border overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: config.color }} />
                <CardContent className="p-3 text-center">
                  <div className={cn("mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-2", config.bg)}><Icon className={cn("h-4 w-4", config.text)} /></div>
                  <p className="text-xs text-muted-foreground capitalize mb-1">{(status.status || "Unknown").replace(/_/g, " ")}</p>
                  <h3 className="text-lg font-bold">{formatNumber(status.count)}</h3>
                  <p className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Distribution by Status" description="Requisition count by status" data={pieData} loading={loading} height={300} showLegend />
          <BarChartCard title="Status Comparison" description="Count and value by status" data={barData} dataKeys={[{ key: "count", name: "Requisitions", color: "#8b5cf6" }, { key: "value", name: "Value", color: "#f59e0b" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="status" searchPlaceholder="Search statuses..." />
        )}
      </div>
    </ReportLayout>
  );
}
