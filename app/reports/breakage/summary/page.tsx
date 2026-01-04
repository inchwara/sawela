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
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
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
    accessorKey: "reference",
    header: "Reference",
    cell: ({ row }) => <span className="font-mono font-medium">{row.original.reference}</span>,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: "product",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.product?.name}</p>
        <p className="text-sm text-muted-foreground">{row.original.product?.sku}</p>
      </div>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => <span className="font-mono text-red-600">{formatNumber(row.original.quantity)}</span>,
  },
  {
    accessorKey: "loss_value",
    header: "Loss Value",
    cell: ({ row }) => <span className="font-mono font-medium text-red-600">{formatCurrency(row.original.loss_value || 0)}</span>,
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => <span className="capitalize">{row.original.reason?.replace(/_/g, " ") || "—"}</span>,
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
    accessorKey: "store",
    header: "Store",
    cell: ({ row }) => row.original.store?.name || "—",
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

  const totalBreakages = summary?.total_breakages || data.length;
  const totalLoss = summary?.total_loss || data.reduce((acc, b) => acc + (b.loss_value || 0), 0);
  const totalQuantity = summary?.total_quantity || data.reduce((acc, b) => acc + b.quantity, 0);
  const pendingCount = summary?.by_status?.find((s: any) => s.status === "pending")?.count || 0;

  const statusChartData = (summary?.by_status || []).map((s: any, idx: number) => ({
    name: s.status.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase()),
    value: s.count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const reasonChartData = (summary?.by_reason || []).slice(0, 6).map((r: any) => ({
    name: r.reason?.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase()) || "Other",
    count: r.count,
    loss: r.total_loss || 0,
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
          <SummaryCard title="Total Loss" value={formatCurrency(totalLoss)} icon="DollarSign" variant="danger" loading={loading} />
          <SummaryCard title="Units Affected" value={formatNumber(totalQuantity)} icon="Package" loading={loading} />
          <SummaryCard title="Pending Review" value={pendingCount} subtitle="awaiting action" icon="Clock" variant={pendingCount > 0 ? "warning" : "default"} loading={loading} />
        </SummaryGrid>

        {totalLoss > 0 && (
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500 text-white"><AlertTriangle className="h-6 w-6" /></div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total Loss This Period</p>
                  <h3 className="text-3xl font-bold text-red-600">{formatCurrency(totalLoss)}</h3>
                  <p className="text-sm text-muted-foreground">{formatNumber(totalQuantity)} units across {totalBreakages} incidents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Breakages by Status" description="Distribution by status" data={statusChartData} loading={loading} height={300} showLegend />
          <BarChartCard title="Breakages by Reason" description="Top causes of breakage" data={reasonChartData} dataKeys={[{ key: "count", name: "Count", color: "#f59e0b" }, { key: "loss", name: "Loss Value", color: "#ef4444" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        {data.length === 0 && !loading ? (
          <ReportEmptyState />
        ) : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="reference" searchPlaceholder="Search breakages..." pageSize={filters.per_page} totalItems={pagination.total} currentPage={pagination.currentPage} onPageChange={(page) => setFilters(prev => ({ ...prev, page }))} serverPagination />
        )}
      </div>
    </ReportLayout>
  );
}
