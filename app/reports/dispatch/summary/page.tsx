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
import { ReportTable, formatNumber, formatCurrency, formatDate } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard, AreaChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Package, Clock, CheckCircle, XCircle, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Status config
const statusConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<any> }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
  in_transit: { bg: "bg-blue-100", text: "text-blue-700", icon: Truck },
  delivered: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
  cancelled: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
  returned: { bg: "bg-orange-100", text: "text-orange-700", icon: Package },
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
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.original.type?.replace(/_/g, " ") || "—"}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status?.toLowerCase() || "pending";
      const config = statusConfig[status] || statusConfig.pending;
      const Icon = config.icon;
      return (
        <Badge className={cn(config.bg, config.text, "gap-1 border-0 capitalize")}>
          <Icon className="h-3 w-3" />
          {status.replace(/_/g, " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "store",
    header: "From Store",
    cell: ({ row }) => row.original.store?.name || "—",
  },
  {
    accessorKey: "destination",
    header: "Destination",
    cell: ({ row }) => row.original.destination || "—",
  },
  {
    accessorKey: "items_count",
    header: "Items",
    cell: ({ row }) => formatNumber(row.original.items_count || 0),
  },
  {
    accessorKey: "total_quantity",
    header: "Quantity",
    cell: ({ row }) => (
      <span className="font-mono">{formatNumber(row.original.total_quantity || 0)}</span>
    ),
  },
  {
    accessorKey: "total_value",
    header: "Value",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.total_value || 0)}</span>
    ),
  },
];

export default function DispatchSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters & { status?: string }>({
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

  // Calculate totals
  const totalDispatches = summary?.total_dispatches || data.length;
  const totalValue = summary?.total_value || data.reduce((acc, d) => acc + (d.total_value || 0), 0);
  const totalQuantity = summary?.total_quantity || data.reduce((acc, d) => acc + (d.total_quantity || 0), 0);
  const deliveredCount = summary?.by_status?.find((s: any) => s.status === "delivered")?.count || 0;
  const pendingCount = summary?.by_status?.find((s: any) => s.status === "pending")?.count || 0;

  // Status chart data
  const statusChartData = (summary?.by_status || []).map((s: any, idx: number) => ({
    name: s.status.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase()),
    value: s.count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  // Trend data
  const trendData = (summary?.by_date || []).map((d: any) => ({
    date: format(new Date(d.date), "MMM d"),
    dispatches: d.count,
    value: d.total_value,
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
      description="Track and analyze all dispatch operations and deliveries"
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
          additionalFilters={
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: value === "all" ? undefined : value,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          }
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
            title="Total Value"
            value={formatCurrency(totalValue)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Items Dispatched"
            value={formatNumber(totalQuantity)}
            subtitle="units"
            icon="Package"
            loading={loading}
          />
          <SummaryCard
            title="Delivery Rate"
            value={`${totalDispatches > 0 ? ((deliveredCount / totalDispatches) * 100).toFixed(0) : 0}%`}
            subtitle={`${deliveredCount} delivered, ${pendingCount} pending`}
            icon="CheckCircle"
            variant={deliveredCount > pendingCount ? "success" : "warning"}
            loading={loading}
          />
        </SummaryGrid>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Dispatches by Status"
            description="Distribution of dispatch statuses"
            data={statusChartData}
            loading={loading}
            height={300}
            showLegend
          />
          
          {trendData.length > 0 ? (
            <AreaChartCard
              title="Dispatch Trend"
              description="Daily dispatch activity"
              data={trendData}
              dataKeys={[
                { key: "dispatches", name: "Dispatches", color: "#3b82f6" },
              ]}
              xAxisKey="date"
              loading={loading}
              height={300}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Status Overview</CardTitle>
                <CardDescription>Breakdown by delivery status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(statusConfig).map(([status, config]) => {
                  const statusData = (summary?.by_status || []).find(
                    (s: any) => s.status === status
                  );
                  const count = statusData?.count || 0;
                  const value = statusData?.total_value || 0;
                  const Icon = config.icon;
                  
                  if (count === 0) return null;
                  
                  return (
                    <div key={status} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", config.bg)}>
                          <Icon className={cn("h-4 w-4", config.text)} />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{status.replace(/_/g, " ")}</p>
                          <p className="text-sm text-muted-foreground">{count} dispatches</p>
                        </div>
                      </div>
                      <p className="font-bold">{formatCurrency(value)}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
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
