"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { getStores, Store } from "@/lib/stores";
import {
  getLowStockAlert,
  downloadReportAsCsv,
  LowStockItem,
  LowStockSummary,
  ReportFilters,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatCurrency, formatNumber } from "../../components/report-table";
import { SummaryCard, SummaryGrid, StatusIndicator } from "../../components/report-summary-cards";
import { BarChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, TrendingDown, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Table columns definition
const columns: ColumnDef<LowStockItem>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-sm text-muted-foreground">{row.original.sku}</p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "on_hand",
    header: "On Hand",
    cell: ({ row }) => (
      <span className={row.original.on_hand === 0 ? "text-red-600 font-bold" : "text-yellow-600 font-medium"}>
        {formatNumber(row.original.on_hand)}
      </span>
    ),
  },
  {
    accessorKey: "low_stock_threshold",
    header: "Min Threshold",
    cell: ({ row }) => formatNumber(row.original.low_stock_threshold),
  },
  {
    accessorKey: "shortage_quantity",
    header: "Shortage",
    cell: ({ row }) => (
      <Badge variant="destructive" className="font-mono">
        -{formatNumber(row.original.shortage_quantity)}
      </Badge>
    ),
  },
  {
    accessorKey: "stock_status",
    header: "Status",
    cell: ({ row }) => <StatusIndicator status={row.original.stock_status} size="sm" />,
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => row.original.supplier?.name || "—",
  },
  {
    accessorKey: "unit_cost",
    header: "Unit Cost",
    cell: ({ row }) => formatCurrency(row.original.unit_cost),
  },
  {
    id: "reorder_cost",
    header: "Reorder Cost",
    cell: ({ row }) => {
      const cost = row.original.shortage_quantity * parseFloat(row.original.unit_cost);
      return formatCurrency(cost);
    },
  },
];

export default function LowStockReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
  });
  
  const [data, setData] = React.useState<LowStockItem[]>([]);
  const [summary, setSummary] = React.useState<LowStockSummary | null>(null);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch stores on mount
  React.useEffect(() => {
    getStores().then(setStores).catch(console.error);
  }, []);

  // Fetch report data
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getLowStockAlert(filters);
      if (response.success) {
        setData(response.data);
        setSummary(response.summary || null);
        setMeta(response.meta);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report");
      toast.error(err.message || "Failed to load report");
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
      await downloadReportAsCsv("/inventory/low-stock", filters, "low_stock_alert.csv");
      toast.success("The report has been downloaded as CSV");
    } catch (err: any) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate total reorder cost
  const totalReorderCost = data.reduce(
    (acc, item) => acc + item.shortage_quantity * parseFloat(item.unit_cost),
    0
  );

  // Prepare chart data - group by supplier
  const supplierChartData = React.useMemo(() => {
    const supplierMap = new Map<string, number>();
    data.forEach((item) => {
      const supplierName = item.supplier?.name || "No Supplier";
      supplierMap.set(supplierName, (supplierMap.get(supplierName) || 0) + 1);
    });
    return Array.from(supplierMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Low Stock Alert"
        description="Products below minimum threshold"
        category="inventory"
        categoryLabel="Inventory"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Low Stock Alert"
      description="Products below minimum threshold requiring attention"
      category="inventory"
      categoryLabel="Inventory"
      loading={loading}
      generatedAt={meta?.generated_at}
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

        {/* Alert Banner */}
        {(summary?.out_of_stock_count || 0) > 0 && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/50">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Critical: {summary?.out_of_stock_count} Products Out of Stock
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  These products have zero inventory and need immediate attention.
                </p>
              </div>
              <Button variant="destructive" size="sm" asChild>
                <Link href="/purchase-orders/create">Create Purchase Order</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Products Affected"
            value={summary?.total_products_affected || 0}
            icon="Package"
            variant="warning"
            loading={loading}
          />
          <SummaryCard
            title="Out of Stock"
            value={summary?.out_of_stock_count || 0}
            icon="AlertCircle"
            variant="danger"
            loading={loading}
          />
          <SummaryCard
            title="Low Stock"
            value={summary?.low_stock_count || 0}
            icon="TrendingDown"
            variant="warning"
            loading={loading}
          />
          <SummaryCard
            title="Total Shortage"
            value={formatNumber(summary?.total_shortage_quantity || 0)}
            subtitle="units needed"
            icon="Package"
            loading={loading}
          />
        </SummaryGrid>

        {/* Reorder Cost Estimate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Reorder Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Total Reorder Cost</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(totalReorderCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  to replenish all shortage quantities
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Average per Product</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(data.length > 0 ? totalReorderCost / data.length : 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">estimated reorder value</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Unique Suppliers</p>
                <p className="text-3xl font-bold">
                  {new Set(data.map((item) => item.supplier?.id).filter(Boolean)).size}
                </p>
                <p className="text-xs text-muted-foreground mt-1">to contact for reorder</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {supplierChartData.length > 0 && (
          <BarChartCard
            title="Low Stock by Supplier"
            description="Number of low stock products by supplier"
            data={supplierChartData}
            dataKeys={[{ key: "count", name: "Products" }]}
            xAxisKey="name"
            loading={loading}
            height={300}
            horizontal
          />
        )}

        {/* Data Table */}
        {data.length === 0 && !loading ? (
          <ReportEmptyState
            title="No Low Stock Items"
            description="Great news! All your products are above their minimum stock thresholds."
          />
        ) : (
          <ReportTable
            columns={columns}
            data={data}
            loading={loading}
            searchColumn="name"
            searchPlaceholder="Search products..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
