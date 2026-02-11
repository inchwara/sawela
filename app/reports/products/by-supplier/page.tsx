"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import {
  getProductsBySupplier,
  downloadReportAsCsv,
  ProductBySupplierItem,
  ReportFilters,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2, Package, DollarSign, TrendingUp, Star } from "lucide-react";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// Table columns
const columns: ColumnDef<ProductBySupplierItem>[] = [
  {
    accessorKey: "supplier_name",
    header: "Supplier",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium">{row.original.supplier_name || "Unknown Supplier"}</span>
      </div>
    ),
  },
  {
    accessorKey: "product_count",
    header: "Products",
    cell: ({ row }) => formatNumber(row.original.product_count),
  },
  {
    accessorKey: "total_stock",
    header: "Total Stock",
    cell: ({ row }) => (
      <span className="font-mono">{formatNumber(row.original.total_stock)}</span>
    ),
  },
  {
    accessorKey: "total_value",
    header: "Stock Value",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(Number(row.original.total_value) || 0)}</span>
    ),
  },
];

export default function ProductsBySupplierReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
  });

  const [data, setData] = React.useState<ProductBySupplierItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report data
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProductsBySupplier(filters);
      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : [];
        setData(items);
        setMeta(response.meta);
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
      await downloadReportAsCsv("/products/by-supplier", filters, "products_by_supplier.csv");
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
  const totalSuppliers = data.length;
  const totalProducts = data.reduce((acc, s) => acc + s.product_count, 0);
  const totalStock = data.reduce((acc, s) => acc + s.total_stock, 0);
  const totalValue = data.reduce((acc, s) => acc + (Number(s.total_value) || 0), 0);

  // Sort by product count
  const topSuppliers = [...data].sort((a, b) => b.product_count - a.product_count).slice(0, 8);
  const topSupplier = topSuppliers[0];

  // Chart data
  const productChartData = topSuppliers.map((s, idx) => {
    const name = s.supplier_name || "Unknown";
    return {
      name: name.length > 12 ? name.slice(0, 12) + "..." : name,
      value: s.product_count,
      fill: CHART_COLORS[idx % CHART_COLORS.length],
    };
  });

  const comparisonChartData = topSuppliers.map((s) => {
    const name = s.supplier_name || "Unknown";
    return {
      name: name.length > 10 ? name.slice(0, 10) + "..." : name,
      products: s.product_count,
      stock: s.total_stock,
    };
  });

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Products by Supplier"
        description="Supplier breakdown"
        category="products"
        categoryLabel="Products"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Products by Supplier"
      description="Analyze product distribution and inventory by supplier"
      category="products"
      categoryLabel="Products"
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
          showStoreFilter={false}
          showGroupBy={false}
          loading={loading}
        />

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Active Suppliers"
            value={totalSuppliers}
            icon="Building2"
            loading={loading}
          />
          <SummaryCard
            title="Total Products"
            value={formatNumber(totalProducts)}
            icon="Package"
            loading={loading}
          />
          <SummaryCard
            title="Total Stock"
            value={formatNumber(totalStock)}
            icon="Box"
            loading={loading}
          />
          <SummaryCard
            title="Total Value"
            value={formatCurrency(totalValue)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
        </SummaryGrid>

        {/* Top Supplier Highlight */}
        {topSupplier && (
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-500 text-white">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Top Supplier by Products
                    </p>
                    <h3 className="text-xl font-bold">{topSupplier.supplier_name || "Unknown Supplier"}</h3>
                    <p className="text-sm text-muted-foreground">{topSupplier.product_count} products supplied</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-amber-600">{formatNumber(topSupplier.total_stock)}</p>
                  <p className="text-muted-foreground">total stock units</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Products by Supplier"
            description="Product count distribution"
            data={productChartData}
            loading={loading}
            height={320}
            showLegend
          />
          <BarChartCard
            title="Stock Comparison"
            description="Products and stock levels per supplier"
            data={comparisonChartData}
            dataKeys={[
              { key: "products", name: "Products", color: "#3b82f6" },
              { key: "stock", name: "Stock", color: "#22c55e" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={320}
          />
        </div>

        {/* Supplier Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Supplier Breakdown
            </CardTitle>
            <CardDescription>
              Product and stock details for each supplier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSuppliers.map((supplier, index) => {
                const productShare = totalProducts > 0 ? (supplier.product_count / totalProducts) * 100 : 0;
                const stockShare = totalStock > 0 ? (supplier.total_stock / totalStock) * 100 : 0;
                const supplierValue = Number(supplier.total_value) || 0;

                return (
                  <div key={supplier.supplier_id || index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{supplier.supplier_name || "Unknown Supplier"}</span>
                          {index === 0 && (
                            <Badge className="bg-amber-100 text-amber-700 border-0">
                              <Star className="h-3 w-3 mr-1" />
                              Top
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{supplier.product_count} products</span>
                        <span className="text-muted-foreground ml-2">({productShare.toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Product Share</p>
                        <Progress value={productShare} className="h-2" />
                        <p className="mt-1 font-medium">{productShare.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Stock Share</p>
                        <Progress value={stockShare} className="h-2" />
                        <p className="mt-1 font-medium">{stockShare.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stock Level</p>
                        <p className="font-bold text-lg">{formatNumber(supplier.total_stock)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stock Value</p>
                        <p className="font-bold text-lg">{formatCurrency(supplierValue)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
            searchColumn="supplier_name"
            searchPlaceholder="Search suppliers..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
