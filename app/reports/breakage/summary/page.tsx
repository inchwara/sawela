"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  getBreakageSummary,
  downloadReportAsCsv,
  BreakageSummaryItem,
  ReportFilters,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency, formatDate } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, CheckCircle, XCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  reviewed: { bg: "bg-blue-100", text: "text-blue-700" },
  approved: { bg: "bg-green-100", text: "text-green-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
  written_off: { bg: "bg-gray-100", text: "text-gray-700" },
};

const CHART_COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#8b5cf6"];

const columns: ColumnDef<BreakageSummaryItem>[] = [
  {
    accessorKey: "breakage_number",
    header: "Reference",
    cell: ({ row }) => <span className="font-mono font-medium">{row.original.breakage_number}</span>,
  },
  {
    accessorKey: "breakage_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.breakage_date),
  },
  {
    accessorKey: "breakage_type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.original.breakage_type?.replace(/_/g, " ") || "—"}
      </Badge>
    ),
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
    accessorKey: "total_value",
    header: "Value",
    cell: ({ row }) => <span className="font-mono text-red-600">{formatCurrency(parseFloat(row.original.total_value) || 0)}</span>,
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

export default function BreakageSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month", per_page: 25, page: 1 });
  const [data, setData] = React.useState<BreakageSummaryItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);
  const [pagination, setPagination] = React.useState({ total: 0, currentPage: 1, lastPage: 1 });

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getBreakageSummary(filters);
      if (response.success) {
        setData(response.data.data);
        setSummary(response.summary || null);
        setMeta(response.meta);
        setPagination({ total: response.data.total, currentPage: response.data.current_page, lastPage: response.data.last_page });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await downloadReportAsCsv("/breakage/summary", filters, "breakage_summary.csv");
      toast({ title: "Export successful", description: "Report downloaded" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExportLoading(false);
    }
  };

  const totalBreakages = summary?.total_breakages || pagination.total;
  const pendingCount = summary?.pending || 0;
  const approvedCount = summary?.approved || 0;
  const rejectedCount = summary?.rejected || 0;

  // Compute total items and value from visible data
  const totalItems = data.reduce((acc, b) => acc + (b.items?.length || 0), 0);
  const totalValue = data.reduce((acc, b) => acc + (parseFloat(b.total_value) || 0), 0);

  // Approval status chart from summary
  const approvalChartData = [
    { name: "Pending", value: pendingCount, fill: "#f59e0b" },
    { name: "Approved", value: approvedCount, fill: "#22c55e" },
    { name: "Rejected", value: rejectedCount, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  // Breakage type chart from visible data
  const typeBreakdown = data.reduce((acc, b) => {
    const type = b.breakage_type || "unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(typeBreakdown).map(([type, count], idx) => ({
    name: type.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    value: count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  if (error && !data.length) {
    return (
      <ReportLayout title="Breakage Summary" description="Overview of breakages" category="breakage" categoryLabel="Breakage">
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Breakage Summary"
      description="Track and analyze product breakages and associated losses"
      category="breakage"
      categoryLabel="Breakage"
      loading={loading}
      generatedAt={meta?.generated_at}
      period={meta?.period}
      onExport={handleExport}
      onRefresh={fetchReport}
      exportLoading={exportLoading}
    >
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Total Breakages" value={totalBreakages} icon="AlertTriangle" variant="warning" loading={loading} />
          <SummaryCard title="Pending" value={pendingCount} icon="Clock" variant="warning" loading={loading} />
          <SummaryCard title="Approved" value={approvedCount} icon="CheckCircle" variant="success" loading={loading} />
          <SummaryCard title="Rejected" value={rejectedCount} icon="XCircle" variant="danger" loading={loading} />
        </SummaryGrid>

        {totalValue > 0 && (
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500 text-white"><AlertTriangle className="h-6 w-6" /></div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total Value This Page</p>
                  <h3 className="text-3xl font-bold text-red-600">{formatCurrency(totalValue)}</h3>
                  <p className="text-sm text-muted-foreground">{formatNumber(totalItems)} items across {data.length} breakage records</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {approvalChartData.length > 0 && (
            <PieChartCard title="Approval Status" description="Distribution by approval status" data={approvalChartData} loading={loading} height={300} showLegend />
          )}
          {typeChartData.length > 0 && (
            <PieChartCard title="Breakage Type" description="Distribution by breakage type" data={typeChartData} loading={loading} height={300} showLegend />
          )}
        </div>

        {data.length === 0 && !loading ? (
          <ReportEmptyState />
        ) : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="breakage_number" searchPlaceholder="Search breakages..." pageSize={filters.per_page} totalItems={pagination.total} currentPage={pagination.currentPage} onPageChange={(page) => setFilters(prev => ({ ...prev, page }))} serverPagination />
        )}
      </div>
    </ReportLayout>
  );
}
