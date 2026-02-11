"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  getDispatchSummary,
  downloadReportAsCsv,
  DispatchSummaryItem,
  ReportFilters,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatDate } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Clock, CheckCircle, XCircle, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Approval status config
const statusConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<any> }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
  approved: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
  rejected: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
};

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316"];

// Table columns
const columns: ColumnDef<DispatchSummaryItem>[] = [
  {
    accessorKey: "dispatch_number",
    header: "Dispatch #",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.dispatch_number}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: "approval_status",
    header: "Approval",
    cell: ({ row }) => {
      const status = row.original.approval_status?.toLowerCase() || "pending";
      const config = statusConfig[status] || statusConfig.pending;
      const Icon = config.icon;
      return (
        <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}>
          <Icon className="h-3 w-3" />
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "store_name",
    header: "From Store",
    cell: ({ row }) => row.original.store_name || "—",
  },
  {
    accessorKey: "to_entity",
    header: "To Entity",
    cell: ({ row }) => (
      <span className="capitalize">{row.original.to_entity?.replace(/_/g, " ") || "—"}</span>
    ),
  },
  {
    accessorKey: "to_user",
    header: "Recipient",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{row.original.to_user?.full_name || "—"}</span>
      </div>
    ),
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => formatNumber(row.original.dispatch_items?.length || 0),
  },
  {
    accessorKey: "is_returnable",
    header: "Returnable",
    cell: ({ row }) => (
      <Badge variant={row.original.is_returnable ? "secondary" : "outline"}>
        {row.original.is_returnable ? "Yes" : "No"}
      </Badge>
    ),
  },
];

export default function DispatchSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    per_page: 25,
    page: 1,
  });

  const [data, setData] = React.useState<DispatchSummaryItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);
  const [pagination, setPagination] = React.useState({
    total: 0,
    currentPage: 1,
    lastPage: 1,
  });

  // Fetch stores
  React.useEffect(() => {
    getStores().then(setStores).catch(console.error);
  }, []);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDispatchSummary(filters);
      if (response.success) {
        setData(response.data.data);
        setSummary(response.summary || null);
        setMeta(response.meta);
        setPagination({
          total: response.data.total,
          currentPage: response.data.current_page,
          lastPage: response.data.last_page,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report");
      toast({
        title: "Error",
        description: err.message || "Failed to load report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle export
  const handleExport = async () => {
    setExportLoading(true);
    try {
      await downloadReportAsCsv("/dispatch/summary", filters, "dispatch_summary.csv");
      toast({
        title: "Export successful",
        description: "The report has been downloaded as CSV",
      });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err.message || "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Summary values
  const totalDispatches = summary?.total_dispatches || pagination.total;
  const storesDispatchedFrom = summary?.stores_dispatched_from || 0;
  const uniqueRecipients = summary?.unique_recipients || 0;

  // Count items across visible dispatches
  const totalItems = data.reduce(
    (acc, d) => acc + (d.dispatch_items?.length || 0),
    0
  );

  // Type breakdown from visible data
  const typeBreakdown = data.reduce((acc, d) => {
    const type = d.type || "unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(typeBreakdown).map(([type, count], idx) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Dispatch Summary"
        description="Overview of dispatches"
        category="dispatch"
        categoryLabel="Dispatch"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Dispatch Summary"
      description="Track and analyze all dispatch operations"
      category="dispatch"
      categoryLabel="Dispatch"
      loading={loading}
      generatedAt={meta?.generated_at}
      period={meta?.period}
      onExport={handleExport}
      onRefresh={fetchReport}
      exportLoading={exportLoading}
    >
      <div className="space-y-6">
        {/* Filters */}
        <ReportFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          showStoreFilter
          stores={stores}
          loading={loading}
        />

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Dispatches"
            value={totalDispatches}
            icon="Truck"
            loading={loading}
          />
          <SummaryCard
            title="Stores"
            value={storesDispatchedFrom}
            subtitle="dispatched from"
            icon="Building2"
            loading={loading}
          />
          <SummaryCard
            title="Recipients"
            value={uniqueRecipients}
            subtitle="unique recipients"
            icon="Users"
            loading={loading}
          />
          <SummaryCard
            title="Items (this page)"
            value={formatNumber(totalItems)}
            subtitle="dispatch line items"
            icon="Package"
            loading={loading}
          />
        </SummaryGrid>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {typeChartData.length > 0 && (
            <PieChartCard
              title="Dispatches by Type"
              description="Internal vs external dispatch distribution"
              data={typeChartData}
              loading={loading}
              height={300}
              showLegend
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Key dispatch metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Truck className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-medium">Total Dispatches</p>
                    <p className="text-sm text-muted-foreground">For selected period</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{totalDispatches}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Building2 className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="font-medium">Source Stores</p>
                    <p className="text-sm text-muted-foreground">Stores dispatched from</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{storesDispatchedFrom}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <User className="h-4 w-4 text-purple-700" />
                  </div>
                  <div>
                    <p className="font-medium">Unique Recipients</p>
                    <p className="text-sm text-muted-foreground">Received dispatches</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{uniqueRecipients}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        {data.length === 0 && !loading ? (
          <ReportEmptyState />
        ) : (
          <ReportTable
            columns={columns}
            data={data}
            loading={loading}
            searchColumn="dispatch_number"
            searchPlaceholder="Search by dispatch number..."
            pageSize={filters.per_page}
            totalItems={pagination.total}
            currentPage={pagination.currentPage}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            serverPagination
          />
        )}
      </div>
    </ReportLayout>
  );
}
