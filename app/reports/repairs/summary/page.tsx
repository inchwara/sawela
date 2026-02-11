"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getRepairsSummary, downloadReportAsCsv, RepairSummaryItem, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatDate } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, Clock, CheckCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-700" },
  repaired: { bg: "bg-cyan-100", text: "text-cyan-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  approved: { bg: "bg-green-100", text: "text-green-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-700" },
};

const CHART_COLORS = ["#f59e0b", "#3b82f6", "#06b6d4", "#22c55e", "#ef4444", "#8b5cf6"];

const columns: ColumnDef<RepairSummaryItem>[] = [
  {
    accessorKey: "repair_number",
    header: "Reference",
    cell: ({ row }) => <span className="font-mono font-medium">{row.original.repair_number}</span>,
  },
  {
    accessorKey: "repair_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.repair_date),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status?.toLowerCase() || "pending";
      const config = statusConfig[status] || statusConfig.pending;
      return <Badge className={cn(config.bg, config.text, "border-0 capitalize")}>{status.replace(/_/g, " ")}</Badge>;
    },
  },
  {
    accessorKey: "approval_status",
    header: "Approval",
    cell: ({ row }) => {
      const status = row.original.approval_status?.toLowerCase() || "pending";
      const config = statusConfig[status] || statusConfig.pending;
      return <Badge className={cn(config.bg, config.text, "border-0 capitalize")}>{status}</Badge>;
    },
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => formatNumber(row.original.items?.length || 0),
  },
  {
    accessorKey: "reporter",
    header: "Reporter",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{row.original.reporter?.full_name || "—"}</span>
      </div>
    ),
  },
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

  const totalRepairs = summary?.total_repairs || pagination.total;
  const pendingCount = summary?.pending || 0;
  const approvedCount = summary?.approved || 0;
  const rejectedCount = summary?.rejected || 0;
  const completedCount = summary?.completed || 0;
  const inProgressCount = summary?.in_progress || 0;

  // Total items from visible data
  const totalItems = data.reduce((acc, r) => acc + (r.items?.length || 0), 0);

  // Status chart from summary
  const statusChartData = [
    { name: "Pending", value: pendingCount, fill: "#f59e0b" },
    { name: "In Progress", value: inProgressCount, fill: "#3b82f6" },
    { name: "Completed", value: completedCount, fill: "#22c55e" },
    { name: "Approved", value: approvedCount, fill: "#10b981" },
    { name: "Rejected", value: rejectedCount, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  if (error && !data.length) {
    return <ReportLayout title="Repairs Summary" description="Overview of repairs" category="repairs" categoryLabel="Repairs"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Repairs Summary" description="Track and analyze product repairs and maintenance" category="repairs" categoryLabel="Repairs" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Repairs" value={totalRepairs} icon="Wrench" loading={loading} />
          <SummaryCard title="Pending" value={pendingCount} icon="Clock" variant="warning" loading={loading} />
          <SummaryCard title="In Progress" value={inProgressCount} icon="Loader2" variant="info" loading={loading} />
          <SummaryCard title="Completed" value={completedCount} icon="CheckCircle" variant="success" loading={loading} />
        </SummaryGrid>

        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500 text-white"><Wrench className="h-6 w-6" /></div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Repair Status Overview</p>
                <h3 className="text-3xl font-bold text-amber-600">{totalRepairs} total repairs</h3>
                <p className="text-sm text-muted-foreground">
                  {pendingCount} pending • {inProgressCount} in progress • {completedCount} completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {statusChartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartCard title="Repairs by Status" description="Distribution by status" data={statusChartData} loading={loading} height={300} showLegend />
            <PieChartCard title="Approval Status" description="Approved vs rejected" data={[
              { name: "Approved", value: approvedCount, fill: "#22c55e" },
              { name: "Rejected", value: rejectedCount, fill: "#ef4444" },
              { name: "Pending", value: pendingCount, fill: "#f59e0b" },
            ].filter(d => d.value > 0)} loading={loading} height={300} showLegend />
          </div>
        )}

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="repair_number" searchPlaceholder="Search repairs..." pageSize={filters.per_page} totalItems={pagination.total} currentPage={pagination.currentPage} onPageChange={(page) => setFilters(prev => ({ ...prev, page }))} serverPagination />
        )}
      </div>
    </ReportLayout>
  );
}
