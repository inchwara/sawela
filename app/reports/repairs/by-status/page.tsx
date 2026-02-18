"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { getStores, Store } from "@/lib/stores";
import { getRepairsByStatus, downloadReportAsCsv, RepairByStatusData, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard } from "../../components/report-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, XCircle, Wrench, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusRow { label: string; count: number; category: "status" | "approval"; }

const statusConfig: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; text: string }> = {
  pending: { icon: Clock, color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700" },
  in_progress: { icon: Loader2, color: "#3b82f6", bg: "bg-blue-100", text: "text-blue-700" },
  repaired: { icon: Wrench, color: "#06b6d4", bg: "bg-cyan-100", text: "text-cyan-700" },
  completed: { icon: CheckCircle, color: "#22c55e", bg: "bg-green-100", text: "text-green-700" },
  approved: { icon: CheckCircle, color: "#22c55e", bg: "bg-green-100", text: "text-green-700" },
  rejected: { icon: XCircle, color: "#ef4444", bg: "bg-red-100", text: "text-red-700" },
};

const statusColumns: ColumnDef<StatusRow>[] = [
  { accessorKey: "category", header: "Category", cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.category}</Badge> },
  {
    accessorKey: "label", header: "Status", cell: ({ row }) => {
      const key = row.original.label?.toLowerCase() || "pending";
      const config = statusConfig[key] || statusConfig.pending;
      const Icon = config.icon;
      return <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}><Icon className="h-3 w-3" />{key.replace(/_/g, " ")}</Badge>;
    },
  },
  { accessorKey: "count", header: "Count", cell: ({ row }) => <span className="text-lg font-bold">{formatNumber(row.original.count)}</span> },
];

export default function RepairByStatusReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month" });
  const [rawData, setRawData] = React.useState<RepairByStatusData | null>(null);
  const [meta, setMeta] = React.useState<any>(null);

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getRepairsByStatus(filters);
      if (response.success) { setRawData(response.data || null); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast.error(err.message); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/repairs/by-status", filters, "repairs_by_status.csv"); toast.success("Export successful"); }
    catch (err: any) { toast.error(err.message); }
    finally { setExportLoading(false); }
  };

  const byStatus = rawData?.by_status || [];
  const byApprovalStatus = rawData?.by_approval_status || [];

  const totalRepairs = byStatus.reduce((a, s) => a + s.count, 0);
  const pendingCount = byStatus.find(s => s.status?.toLowerCase() === "pending")?.count || 0;
  const completedCount = byStatus.find(s => s.status?.toLowerCase() === "completed")?.count || 0;
  const approvedCount = byApprovalStatus.find(s => s.approval_status?.toLowerCase() === "approved")?.count || 0;

  const statusPieData = byStatus.map(s => ({
    name: (s.status || "Unknown").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: s.count,
    fill: statusConfig[s.status?.toLowerCase() || "pending"]?.color || "#6b7280",
  }));

  const approvalPieData = byApprovalStatus.map(s => ({
    name: (s.approval_status || "Unknown").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: s.count,
    fill: statusConfig[s.approval_status?.toLowerCase() || "pending"]?.color || "#6b7280",
  }));

  // Flatten into single table
  const tableData: StatusRow[] = [
    ...byStatus.map(s => ({ label: s.status, count: s.count, category: "status" as const })),
    ...byApprovalStatus.map(s => ({ label: s.approval_status, count: s.count, category: "approval" as const })),
  ];

  if (error && !byStatus.length) {
    return <ReportLayout title="Repairs by Status" description="Status breakdown" category="repairs" categoryLabel="Repairs"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Repairs by Status" description="Monitor repair workflow and completion status" category="repairs" categoryLabel="Repairs" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Repairs" value={totalRepairs} icon="Wrench" loading={loading} />
          <SummaryCard title="Pending" value={pendingCount} icon="Clock" variant="warning" loading={loading} />
          <SummaryCard title="Completed" value={completedCount} icon="CheckCircle" variant="success" loading={loading} />
          <SummaryCard title="Approved" value={approvedCount} icon="CheckCircle" variant="success" loading={loading} />
        </SummaryGrid>

        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100"><Wrench className="h-6 w-6 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Repair Status Overview</p>
                  <h3 className="text-2xl font-bold text-blue-600">{totalRepairs} total repairs</h3>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center"><p className="text-2xl font-bold">{totalRepairs > 0 ? ((completedCount / totalRepairs) * 100).toFixed(1) : 0}%</p><p className="text-sm text-muted-foreground">Completion Rate</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {byStatus.map((status) => {
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
          {statusPieData.length > 0 && <PieChartCard title="By Status" description="Repair count by status" data={statusPieData} loading={loading} height={300} showLegend />}
          {approvalPieData.length > 0 && <PieChartCard title="By Approval Status" description="Repair count by approval status" data={approvalPieData} loading={loading} height={300} showLegend />}
        </div>

        {tableData.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={statusColumns} data={tableData} loading={loading} searchColumn="label" searchPlaceholder="Search statuses..." />
        )}
      </div>
    </ReportLayout>
  );
}
