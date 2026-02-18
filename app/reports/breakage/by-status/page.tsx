"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { getStores, Store } from "@/lib/stores";
import { getBreakageByStatus, downloadReportAsCsv, BreakageByStatusItem, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard } from "../../components/report-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; text: string }> = {
  pending: { icon: Clock, color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700" },
  approved: { icon: CheckCircle, color: "#22c55e", bg: "bg-green-100", text: "text-green-700" },
  rejected: { icon: XCircle, color: "#ef4444", bg: "bg-red-100", text: "text-red-700" },
};

const columns: ColumnDef<BreakageByStatusItem>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status?.toLowerCase() || "pending";
      const config = statusConfig[status] || statusConfig.pending;
      const Icon = config.icon;
      return <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}><Icon className="h-3 w-3" />{status.replace(/_/g, " ")}</Badge>;
    },
  },
  {
    accessorKey: "approval_status",
    header: "Approval Status",
    cell: ({ row }) => {
      const status = row.original.approval_status?.toLowerCase() || "pending";
      const config = statusConfig[status] || statusConfig.pending;
      return <Badge className={cn(config.bg, config.text, "border-0 capitalize")}>{status}</Badge>;
    },
  },
  {
    accessorKey: "count",
    header: "Breakages",
    cell: ({ row }) => <span className="font-bold text-lg">{formatNumber(row.original.count)}</span>,
  },
];

export default function BreakageByStatusReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month" });
  const [data, setData] = React.useState<BreakageByStatusItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getBreakageByStatus(filters);
      if (response.success) { setData(Array.isArray(response.data) ? response.data : []); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast.error(err.message); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/breakage/by-status", filters, "breakage_by_status.csv"); toast.success("Export successful"); }
    catch (err: any) { toast.error(err.message); }
    finally { setExportLoading(false); }
  };

  const totalBreakages = data.reduce((a, s) => a + s.count, 0);
  const pendingCount = data.filter(s => s.status?.toLowerCase() === "pending").reduce((a, s) => a + s.count, 0);
  const approvedCount = data.filter(s => s.approval_status?.toLowerCase() === "approved").reduce((a, s) => a + s.count, 0);

  // Chart by status
  const statusBreakdown = data.reduce((acc, item) => {
    const key = item.status || "unknown";
    acc[key] = (acc[key] || 0) + item.count;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusBreakdown).map(([status, count]) => ({
    name: status.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: count,
    fill: statusConfig[status.toLowerCase()]?.color || "#6b7280",
  }));

  // Chart by approval status
  const approvalBreakdown = data.reduce((acc, item) => {
    const key = item.approval_status || "unknown";
    acc[key] = (acc[key] || 0) + item.count;
    return acc;
  }, {} as Record<string, number>);

  const approvalPieData = Object.entries(approvalBreakdown).map(([status, count]) => ({
    name: status.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: count,
    fill: statusConfig[status.toLowerCase()]?.color || "#6b7280",
  }));

  if (error && !data.length) {
    return <ReportLayout title="Breakages by Status" description="Status breakdown" category="breakage" categoryLabel="Breakage"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Breakages by Status" description="Monitor breakage status and approval workflow" category="breakage" categoryLabel="Breakage" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Breakages" value={totalBreakages} icon="AlertTriangle" loading={loading} />
          <SummaryCard title="Status Groups" value={data.length} icon="Layers" loading={loading} />
          <SummaryCard title="Pending" value={pendingCount} icon="Clock" variant="warning" loading={loading} />
          <SummaryCard title="Approved" value={approvedCount} icon="CheckCircle" variant="success" loading={loading} />
        </SummaryGrid>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {data.map((item, idx) => {
            const config = statusConfig[item.status?.toLowerCase() || "pending"] || statusConfig.pending;
            const Icon = config.icon;
            const percentage = totalBreakages > 0 ? (item.count / totalBreakages) * 100 : 0;
            return (
              <Card key={idx} className={cn("border-2", config.bg.replace("100", "200"))}>
                <CardContent className="p-4 text-center">
                  <div className={cn("mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3", config.bg)}><Icon className={cn("h-6 w-6", config.text)} /></div>
                  <p className="text-sm text-muted-foreground capitalize">{(item.status || "Unknown").replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground capitalize mb-1">({item.approval_status || "—"})</p>
                  <h3 className="text-2xl font-bold">{formatNumber(item.count)}</h3>
                  <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pieData.length > 0 && (
            <PieChartCard title="By Status" description="Breakage count by status" data={pieData} loading={loading} height={300} showLegend />
          )}
          {approvalPieData.length > 0 && (
            <PieChartCard title="By Approval Status" description="Breakage count by approval status" data={approvalPieData} loading={loading} height={300} showLegend />
          )}
        </div>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="status" searchPlaceholder="Search statuses..." />
        )}
      </div>
    </ReportLayout>
  );
}
