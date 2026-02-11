"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getRequisitionSummary, downloadReportAsCsv, RequisitionSummaryItem, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency, formatDate } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, AlertTriangle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  approved: { bg: "bg-green-100", text: "text-green-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
  fulfilled: { bg: "bg-blue-100", text: "text-blue-700" },
  partial: { bg: "bg-orange-100", text: "text-orange-700" },
  draft: { bg: "bg-gray-100", text: "text-gray-700" },
};

const CHART_COLORS = ["#f59e0b", "#22c55e", "#ef4444", "#3b82f6", "#f97316", "#8b5cf6"];

const columns: ColumnDef<RequisitionSummaryItem>[] = [
  {
    accessorKey: "requisition_number",
    header: "Reference",
    cell: ({ row }) => <span className="font-mono font-medium">{row.original.requisition_number}</span>,
  },
  {
    accessorKey: "requisition_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.requisition_date),
  },
  {
    accessorKey: "requisition_type",
    header: "Type",
    cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.requisition_type?.replace(/_/g, " ") || "—"}</Badge>,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.original.priority?.toLowerCase() || "normal";
      const colorMap: Record<string, string> = { urgent: "text-red-600 bg-red-50", high: "text-orange-600 bg-orange-50", normal: "text-blue-600 bg-blue-50", low: "text-gray-600 bg-gray-50" };
      return <Badge variant="outline" className={cn(colorMap[priority] || colorMap.normal, "capitalize")}>{priority}</Badge>;
    },
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
    accessorKey: "total_amount",
    header: "Amount",
    cell: ({ row }) => <span className="font-mono font-medium">{formatCurrency(row.original.total_amount || 0)}</span>,
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => formatNumber(row.original.items?.length || 0),
  },
  {
    accessorKey: "requester",
    header: "Requester",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{row.original.requester?.full_name || "—"}</span>
      </div>
    ),
  },
];

export default function RequisitionSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month", per_page: 25, page: 1 });
  const [data, setData] = React.useState<RequisitionSummaryItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);
  const [pagination, setPagination] = React.useState({ total: 0, currentPage: 1, lastPage: 1 });

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getRequisitionSummary(filters);
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
    try { await downloadReportAsCsv("/requisitions/summary", filters, "requisitions_summary.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalRequisitions = summary?.total_requisitions || pagination.total;
  const pendingCount = summary?.pending || 0;
  const approvedCount = summary?.approved || 0;
  const fulfilledCount = summary?.fulfilled || 0;
  const rejectedCount = summary?.rejected || 0;
  const uniqueRequesters = summary?.unique_requesters || 0;

  // Total value from visible data
  const totalAmount = data.reduce((acc, r) => acc + (r.total_amount || 0), 0);

  // Approval status chart
  const approvalChartData = [
    { name: "Pending", value: pendingCount, fill: "#f59e0b" },
    { name: "Approved", value: approvedCount, fill: "#22c55e" },
    { name: "Rejected", value: rejectedCount, fill: "#ef4444" },
    { name: "Fulfilled", value: fulfilledCount, fill: "#3b82f6" },
  ].filter(d => d.value > 0);

  // Type chart from visible data
  const typeBreakdown = data.reduce((acc, r) => {
    const type = r.requisition_type || "unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(typeBreakdown).map(([type, count], idx) => ({
    name: type.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  if (error && !data.length) {
    return <ReportLayout title="Requisition Summary" description="Overview of requisitions" category="requisitions" categoryLabel="Requisitions"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Requisition Summary" description="Track and analyze stock requisitions across the organization" category="requisitions" categoryLabel="Requisitions" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Requisitions" value={totalRequisitions} icon="FileText" loading={loading} />
          <SummaryCard title="Pending Approval" value={pendingCount} icon="Clock" variant={pendingCount > 0 ? "warning" : "default"} loading={loading} />
          <SummaryCard title="Approved" value={approvedCount} icon="CheckCircle" variant="success" loading={loading} />
          <SummaryCard title="Unique Requesters" value={uniqueRequesters} icon="Users" loading={loading} />
        </SummaryGrid>

        {pendingCount > 5 && (
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500 text-white"><AlertTriangle className="h-6 w-6" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Attention Required</p>
                  <h3 className="text-xl font-bold text-amber-600">{pendingCount} requisitions pending approval</h3>
                  <p className="text-sm text-muted-foreground">Review and process pending requisitions to maintain workflow</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {approvalChartData.length > 0 && <PieChartCard title="Requisitions by Status" description="Distribution by approval status" data={approvalChartData} loading={loading} height={300} showLegend />}
          {typeChartData.length > 0 && <PieChartCard title="By Type" description="Distribution by requisition type" data={typeChartData} loading={loading} height={300} showLegend />}
        </div>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="requisition_number" searchPlaceholder="Search requisitions..." pageSize={filters.per_page} totalItems={pagination.total} currentPage={pagination.currentPage} onPageChange={(page) => setFilters(prev => ({ ...prev, page }))} serverPagination />
        )}
      </div>
    </ReportLayout>
  );
}
