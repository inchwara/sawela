"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  getPurchaseOrderSummary,
  downloadReportAsCsv,
  PurchaseOrderSummaryItem,
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
import { ShoppingCart, Clock, CheckCircle, XCircle, AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

// Status badge config
const statusConfig: Record<string, { bg: string; text: string; icon: React.ComponentType<any> }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
  approved: { bg: "bg-blue-100", text: "text-blue-700", icon: CheckCircle },
  ordered: { bg: "bg-purple-100", text: "text-purple-700", icon: ShoppingCart },
  partial: { bg: "bg-orange-100", text: "text-orange-700", icon: AlertTriangle },
  received: { bg: "bg-green-100", text: "text-green-700", icon: Package },
  cancelled: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
};

// Table columns
const columns: ColumnDef<PurchaseOrderSummaryItem>[] = [
  {
    accessorKey: "po_number",
    header: "PO Number",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.po_number}</span>
    ),
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => row.original.supplier?.name || "—",
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
          {status}
        </Badge>
      );
    },
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
    accessorKey: "total_amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.total_amount)}</span>
    ),
  },
  {
    accessorKey: "expected_delivery",
    header: "Expected Delivery",
    cell: ({ row }) => row.original.expected_delivery 
      ? formatDate(row.original.expected_delivery)
      : "—",
  },
];

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function PurchaseOrderSummaryReport() {
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
  
  const [data, setData] = React.useState<PurchaseOrderSummaryItem[]>([]);
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
      const response = await getPurchaseOrderSummary(filters);
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
      await downloadReportAsCsv("/purchase-orders/summary", filters, "purchase_order_summary.csv");
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
  const totalOrders = summary?.total_orders || data.length;
  const totalAmount = summary?.total_amount || data.reduce((acc, po) => acc + po.total_amount, 0);
  const totalItems = summary?.total_items || data.reduce((acc, po) => acc + (po.items_count || 0), 0);
  const pendingCount = summary?.by_status?.find((s: any) => s.status.toLowerCase() === "pending")?.count || 0;
  const receivedAmount = summary?.by_status?.find((s: any) => s.status.toLowerCase() === "received")?.total_amount || 0;

  // Status distribution chart
  const statusChartData = (summary?.by_status || []).map((s: any, idx: number) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  // Trend chart data (if available)
  const trendChartData = (summary?.by_date || []).map((d: any) => ({
    date: format(new Date(d.date), "MMM d"),
    orders: d.count,
    amount: d.total_amount,
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Purchase Orders Summary"
        description="Overview of purchase orders"
        category="purchase-orders"
        categoryLabel="Purchase Orders"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Purchase Orders Summary"
      description="Track and analyze purchase orders with detailed status and financial metrics"
      category="purchase-orders"
      categoryLabel="Purchase Orders"
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
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Orders"
            value={totalOrders}
            icon="ShoppingCart"
            loading={loading}
          />
          <SummaryCard
            title="Total Amount"
            value={formatCurrency(totalAmount)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Pending Orders"
            value={pendingCount}
            subtitle="awaiting action"
            icon="Clock"
            variant={pendingCount > 0 ? "warning" : "default"}
            loading={loading}
          />
          <SummaryCard
            title="Received Value"
            value={formatCurrency(receivedAmount)}
            subtitle="completed orders"
            icon="Package"
            loading={loading}
          />
        </SummaryGrid>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Orders by Status"
            description="Distribution of purchase orders"
            data={statusChartData}
            loading={loading}
            height={300}
            showLegend
          />
          
          {trendChartData.length > 0 ? (
            <AreaChartCard
              title="Order Trend"
              description="Purchase order activity over time"
              data={trendChartData}
              dataKeys={[
                { key: "orders", name: "Orders", color: "#3b82f6" },
              ]}
              xAxisKey="date"
              loading={loading}
              height={300}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Detailed view of order statuses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(statusConfig).map(([status, config]) => {
                  const statusData = (summary?.by_status || []).find(
                    (s: any) => s.status.toLowerCase() === status
                  );
                  const count = statusData?.count || 0;
                  const amount = statusData?.total_amount || 0;
                  const Icon = config.icon;
                  
                  if (count === 0) return null;
                  
                  return (
                    <div key={status} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", config.bg)}>
                          <Icon className={cn("h-4 w-4", config.text)} />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{status}</p>
                          <p className="text-sm text-muted-foreground">{count} orders</p>
                        </div>
                      </div>
                      <p className="font-bold">{formatCurrency(amount)}</p>
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
            searchColumn="po_number"
            searchPlaceholder="Search by PO number..."
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
