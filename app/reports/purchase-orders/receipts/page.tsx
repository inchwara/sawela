"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  getPurchaseOrderReceipts,
  downloadReportAsCsv,
  PurchaseOrderReceiptItem,
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
import { BarChartCard, AreaChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Status config
const receiptStatusConfig: Record<string, { bg: string; text: string }> = {
  complete: { bg: "bg-green-100", text: "text-green-700" },
  partial: { bg: "bg-yellow-100", text: "text-yellow-700" },
  pending: { bg: "bg-blue-100", text: "text-blue-700" },
};

// Table columns
const columns: ColumnDef<PurchaseOrderReceiptItem>[] = [
  {
    accessorKey: "receipt_number",
    header: "Receipt #",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.receipt_number}</span>
    ),
  },
  {
    accessorKey: "receipt_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.receipt_date),
  },
  {
    accessorKey: "po_number",
    header: "PO Number",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.po_number}</span>
    ),
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => row.original.supplier?.name || "—",
  },
  {
    accessorKey: "items_received",
    header: "Items",
    cell: ({ row }) => formatNumber(row.original.items_received || 0),
  },
  {
    accessorKey: "quantity_received",
    header: "Qty Received",
    cell: ({ row }) => (
      <span className="font-mono">{formatNumber(row.original.quantity_received || 0)}</span>
    ),
  },
  {
    accessorKey: "total_value",
    header: "Value",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.total_value)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status?.toLowerCase() || "complete";
      const config = receiptStatusConfig[status] || receiptStatusConfig.complete;
      return (
        <Badge className={cn(config.bg, config.text, "border-0 capitalize")}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "store",
    header: "Store",
    cell: ({ row }) => row.original.store?.name || "—",
  },
];

export default function PurchaseOrderReceiptsReport() {
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
  
  const [data, setData] = React.useState<PurchaseOrderReceiptItem[]>([]);
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
      const response = await getPurchaseOrderReceipts(filters);
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
      await downloadReportAsCsv("/purchase-orders/receipts", filters, "po_receipts.csv");
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
  const totalReceipts = summary?.total_receipts || data.length;
  const totalValue = summary?.total_value || data.reduce((acc, r) => acc + r.total_value, 0);
  const totalQuantity = summary?.total_quantity || data.reduce((acc, r) => acc + (r.quantity_received || 0), 0);
  const completeCount = summary?.by_status?.find((s: any) => s.status === "complete")?.count || 0;
  const partialCount = summary?.by_status?.find((s: any) => s.status === "partial")?.count || 0;

  // Trend data
  const trendData = (summary?.by_date || []).map((d: any) => ({
    date: format(new Date(d.date), "MMM d"),
    receipts: d.count,
    value: d.total_value,
  }));

  // By supplier chart
  const supplierData = (summary?.by_supplier || []).slice(0, 8).map((s: any) => ({
    name: s.supplier_name?.length > 10 ? s.supplier_name.slice(0, 10) + "..." : s.supplier_name,
    receipts: s.count,
    value: s.total_value,
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="PO Receipts"
        description="Purchase order receipt history"
        category="purchase-orders"
        categoryLabel="Purchase Orders"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Purchase Order Receipts"
      description="Track goods received against purchase orders"
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
        />

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Receipts"
            value={totalReceipts}
            icon="Package"
            loading={loading}
          />
          <SummaryCard
            title="Total Value Received"
            value={formatCurrency(totalValue)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Units Received"
            value={formatNumber(totalQuantity)}
            icon="Truck"
            loading={loading}
          />
          <SummaryCard
            title="Completion Rate"
            value={`${totalReceipts > 0 ? ((completeCount / totalReceipts) * 100).toFixed(1) : 0}%`}
            subtitle={`${completeCount} complete, ${partialCount} partial`}
            icon="CheckCircle"
            variant={completeCount > partialCount ? "success" : "warning"}
            loading={loading}
          />
        </SummaryGrid>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {trendData.length > 0 && (
            <AreaChartCard
              title="Receipt Trend"
              description="Daily receiving activity"
              data={trendData}
              dataKeys={[
                { key: "receipts", name: "Receipts", color: "#3b82f6" },
              ]}
              xAxisKey="date"
              loading={loading}
              height={300}
            />
          )}
          
          {supplierData.length > 0 && (
            <BarChartCard
              title="Receipts by Supplier"
              description="Goods received per supplier"
              data={supplierData}
              dataKeys={[
                { key: "receipts", name: "Receipts", color: "#3b82f6" },
                { key: "value", name: "Value", color: "#22c55e" },
              ]}
              xAxisKey="name"
              loading={loading}
              height={300}
            />
          )}
        </div>

        {/* Receipt Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Receipt Status Summary
            </CardTitle>
            <CardDescription>Overview of receipt completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Complete</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{completeCount}</p>
                <p className="text-sm text-muted-foreground">Fully received</p>
              </div>
              
              <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium">Partial</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{partialCount}</p>
                <p className="text-sm text-muted-foreground">Partially received</p>
              </div>
              
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Avg per Receipt</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalReceipts > 0 ? totalValue / totalReceipts : 0)}
                </p>
                <p className="text-sm text-muted-foreground">Average value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        {data.length === 0 && !loading ? (
          <ReportEmptyState />
        ) : (
          <ReportTable
            columns={columns}
            data={data}
            loading={loading}
            searchColumn="receipt_number"
            searchPlaceholder="Search by receipt number..."
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
