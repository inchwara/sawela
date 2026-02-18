"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { getStores, Store } from "@/lib/stores";
import { getRequisitionsByStatus, downloadReportAsCsv, RequisitionByStatusData, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard } from "../../components/report-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusRow { label: string; count: number; category: "status" | "approval"; }

const statusConfig: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; text: string }> = {
  draft: { icon: FileText, color: "#6b7280", bg: "bg-gray-100", text: "text-gray-700" },
  pending: { icon: Clock, color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700" },
  approved: { icon: CheckCircle, color: "#22c55e", bg: "bg-green-100", text: "text-green-700" },
  rejected: { icon: XCircle, color: "#ef4444", bg: "bg-red-100", text: "text-red-700" },
  fulfilled: { icon: CheckCircle, color: "#10b981", bg: "bg-emerald-100", text: "text-emerald-700" },
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

export default function RequisitionByStatusReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month" });
  const [rawData, setRawData] = React.useState<RequisitionByStatusData | null>(null);
  const [meta, setMeta] = React.useState<any>(null);

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getRequisitionsByStatus(filters);
      if (response.success) { setRawData(response.data || null); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast.error(err.message); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/requisitions/by-status", filters, "requisitions_by_status.csv"); toast.success("Export successful"); }
    catch (err: any) { toast.error(err.message); }
    finally { setExportLoading(false); }
  };

  const byStatus = rawData?.by_status || [];
  const byApproval = rawData?.by_approval_status || [];

  const totalRequisitions = byStatus.reduce((a, s) => a + s.count, 0);
  const pendingCount = byStatus.find(s => s.status?.toLowerCase() === "pending")?.count || 0;
  const fulfilledCount = byStatus.find(s => s.status?.toLowerCase() === "fulfilled")?.count || 0;
  const approvedCount = byApproval.find(s => s.approval_status?.toLowerCase() === "approved")?.count || 0;

  const statusPieData = byStatus.map(s => ({
    name: (s.status || "Unknown").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: s.count,
    fill: statusConfig[s.status?.toLowerCase() || "pending"]?.color || "#6b7280",
  }));

  const approvalPieData = byApproval.map(s => ({
    name: (s.approval_status || "Unknown").replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: s.count,
    fill: statusConfig[s.approval_status?.toLowerCase() || "pending"]?.color || "#6b7280",
  }));

  const tableData: StatusRow[] = [
    ...byStatus.map(s => ({ label: s.status, count: s.count, category: "status" as const })),
    ...byApproval.map(s => ({ label: s.approval_status, count: s.count, category: "approval" as const })),
  ];

  if (error && !byStatus.length) {
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
                  <p className="text-sm text-muted-foreground">Requisition Status Overview</p>
                  <h3 className="text-2xl font-bold text-purple-600">{totalRequisitions} total requisitions</h3>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center"><p className="text-2xl font-bold">{totalRequisitions > 0 ? ((approvedCount / totalRequisitions) * 100).toFixed(1) : 0}%</p><p className="text-sm text-muted-foreground">Approval Rate</p></div>
                <div className="text-center"><p className="text-2xl font-bold">{totalRequisitions > 0 ? ((fulfilledCount / totalRequisitions) * 100).toFixed(1) : 0}%</p><p className="text-sm text-muted-foreground">Fulfillment Rate</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {byStatus.map((status) => {
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
          {statusPieData.length > 0 && <PieChartCard title="By Status" description="Requisition count by status" data={statusPieData} loading={loading} height={300} showLegend />}
          {approvalPieData.length > 0 && <PieChartCard title="By Approval Status" description="Requisition count by approval status" data={approvalPieData} loading={loading} height={300} showLegend />}
        </div>

        {tableData.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={statusColumns} data={tableData} loading={loading} searchColumn="label" searchPlaceholder="Search statuses..." />
        )}
      </div>
    </ReportLayout>
  );
}
