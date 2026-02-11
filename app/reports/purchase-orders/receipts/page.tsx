"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  getProductReceipts,
  downloadReportAsCsv,
  ProductReceiptItem,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Building2 } from "lucide-react";

// Table columns
const columns: ColumnDef<ProductReceiptItem>[] = [
  {
    accessorKey: "receipt_number",
    header: "Receipt #",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.receipt_number}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-primary/10">
          <Building2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <span>{row.original.supplier?.name || "—"}</span>
      </div>
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
    accessorKey: "store",
    header: "Store",
    cell: ({ row }) => row.original.store?.name || "—",
  },
];

export default function ProductReceiptsReport() {
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

  const [data, setData] = React.useState<ProductReceiptItem[]>([]);
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
      const response = await getProductReceipts(filters);
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
      await downloadReportAsCsv("/purchase/receipts", filters, "product_receipts.csv");
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

  // Extract summary values
  const totalReceipts = summary?.total_receipts || data.length;
  const uniqueSuppliers = summary?.unique_suppliers || 0;
  const totalValue = summary?.total_value || data.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);
  const avgPerReceipt = totalReceipts > 0 ? Number(totalValue) / totalReceipts : 0;

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Product Receipts"
        description="Product receipt history"
        category="purchase-orders"
        categoryLabel="Purchase Orders"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Product Receipts"
      description="Track goods received from suppliers"
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
            title="Unique Suppliers"
            value={uniqueSuppliers}
            icon="Building2"
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
            title="Avg per Receipt"
            value={formatCurrency(avgPerReceipt)}
            subtitle="average receipt value"
            icon="TrendingUp"
            loading={loading}
          />
        </SummaryGrid>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Receipt Overview
            </CardTitle>
            <CardDescription>Summary of product receipts for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Total Receipts</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{totalReceipts}</p>
                <p className="text-sm text-muted-foreground">goods received entries</p>
              </div>

              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Suppliers</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{uniqueSuppliers}</p>
                <p className="text-sm text-muted-foreground">unique suppliers</p>
              </div>

              <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20 border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Avg Value</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(avgPerReceipt)}</p>
                <p className="text-sm text-muted-foreground">per receipt</p>
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
