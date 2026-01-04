"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  getProductSummary,
  downloadReportAsCsv,
  ProductSummaryItem,
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
import { Package, TrendingUp, DollarSign, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

// Status badge styling
const statusStyles: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700" },
  inactive: { bg: "bg-gray-100", text: "text-gray-700" },
  discontinued: { bg: "bg-red-100", text: "text-red-700" },
};

// Table columns
const columns: ColumnDef<ProductSummaryItem>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        {row.original.image ? (
          <img 
            src={row.original.image} 
            alt={row.original.name}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-muted-foreground">{row.original.sku}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.category?.name || "Uncategorized"}
      </Badge>
    ),
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => row.original.supplier?.name || "—",
  },
  {
    accessorKey: "current_stock",
    header: "Stock",
    cell: ({ row }) => (
      <span className="font-mono">{formatNumber(row.original.current_stock || 0)}</span>
    ),
  },
  {
    accessorKey: "total_sold",
    header: "Total Sold",
    cell: ({ row }) => (
      <span className="font-mono">{formatNumber(row.original.total_sold || 0)}</span>
    ),
  },
  {
    accessorKey: "total_revenue",
    header: "Revenue",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.total_revenue || 0)}</span>
    ),
  },
  {
    accessorKey: "unit_price",
    header: "Unit Price",
    cell: ({ row }) => formatCurrency(row.original.unit_price || 0),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status?.toLowerCase() || "active";
      const style = statusStyles[status] || statusStyles.active;
      return (
        <Badge className={cn(style.bg, style.text, "border-0 capitalize")}>
          {status}
        </Badge>
      );
    },
  },
];

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function ProductSummaryReport() {
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
  
  const [data, setData] = React.useState<ProductSummaryItem[]>([]);
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

  // Fetch report data
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProductSummary(filters);
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
      await downloadReportAsCsv("/products/summary", filters, "product_summary.csv");
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

  // Calculate summary stats
  const totalProducts = summary?.total_products || data.length;
  const totalRevenue = summary?.total_revenue || data.reduce((acc, p) => acc + (p.total_revenue || 0), 0);
  const totalSold = summary?.total_sold || data.reduce((acc, p) => acc + (p.total_sold || 0), 0);
  const activeProducts = summary?.active_products || data.filter(p => p.status?.toLowerCase() === "active").length;

  // Get top performers
  const topByRevenue = [...data].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)).slice(0, 5);
  const topBySales = [...data].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0)).slice(0, 5);

  // Chart data
  const revenueChartData = topByRevenue.map((p, idx) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "..." : p.name,
    revenue: p.total_revenue || 0,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const salesChartData = topBySales.map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "..." : p.name,
    sold: p.total_sold || 0,
    stock: p.current_stock || 0,
  }));

  // Status distribution
  const statusData = [
    { name: "Active", value: activeProducts, fill: "#22c55e" },
    { name: "Inactive", value: data.filter(p => p.status?.toLowerCase() === "inactive").length, fill: "#94a3b8" },
    { name: "Discontinued", value: data.filter(p => p.status?.toLowerCase() === "discontinued").length, fill: "#ef4444" },
  ].filter(s => s.value > 0);

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Product Summary"
        description="Overview of all products"
        category="products"
        categoryLabel="Products"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Product Summary"
      description="Comprehensive overview of all products with sales performance and inventory status"
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
          showStoreFilter
          stores={stores}
          loading={loading}
        />

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Products"
            value={totalProducts}
            subtitle={`${activeProducts} active`}
            icon="Package"
            loading={loading}
          />
          <SummaryCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Units Sold"
            value={formatNumber(totalSold)}
            icon="TrendingUp"
            loading={loading}
          />
          <SummaryCard
            title="Avg Revenue/Product"
            value={formatCurrency(totalProducts > 0 ? totalRevenue / totalProducts : 0)}
            icon="Calculator"
            loading={loading}
          />
        </SummaryGrid>

        {/* Top Performer */}
        {topByRevenue[0] && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500 text-white">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Performing Product</p>
                    <h3 className="text-xl font-bold">{topByRevenue[0].name}</h3>
                    <p className="text-sm text-muted-foreground">SKU: {topByRevenue[0].sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(topByRevenue[0].total_revenue || 0)}</p>
                  <p className="text-muted-foreground">{formatNumber(topByRevenue[0].total_sold || 0)} units sold</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PieChartCard
            title="Revenue Distribution"
            description="Top 5 products by revenue"
            data={revenueChartData}
            loading={loading}
            height={280}
            showLegend
          />
          <BarChartCard
            title="Top Products by Sales"
            description="Units sold vs current stock"
            data={salesChartData}
            dataKeys={[
              { key: "sold", name: "Units Sold", color: "#3b82f6" },
              { key: "stock", name: "Current Stock", color: "#22c55e" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={280}
          />
          <PieChartCard
            title="Product Status"
            description="Distribution by status"
            data={statusData}
            loading={loading}
            height={280}
            showLegend
          />
        </div>

        {/* Top Products List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Top Performers
            </CardTitle>
            <CardDescription>
              Best performing products by revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topByRevenue.map((product, index) => {
                const maxRevenue = topByRevenue[0].total_revenue || 1;
                const percentage = ((product.total_revenue || 0) / maxRevenue) * 100;
                
                return (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="font-bold">{formatCurrency(product.total_revenue || 0)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Progress value={percentage} className="h-2 flex-1" />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatNumber(product.total_sold || 0)} sold
                        </span>
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
            searchColumn="name"
            searchPlaceholder="Search products..."
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
