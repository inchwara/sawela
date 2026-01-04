"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import {
  getProductsByCategory,
  downloadReportAsCsv,
  ProductsByCategoryItem,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Package, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// Table columns
const columns: ColumnDef<ProductsByCategoryItem>[] = [
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <FolderOpen className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium">{row.original.category?.name || "Uncategorized"}</span>
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
    accessorKey: "total_sold",
    header: "Units Sold",
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
    accessorKey: "stock_value",
    header: "Stock Value",
    cell: ({ row }) => (
      <span className="font-mono">{formatCurrency(row.original.stock_value || 0)}</span>
    ),
  },
  {
    accessorKey: "avg_price",
    header: "Avg Price",
    cell: ({ row }) => {
      const avgPrice = row.original.product_count > 0 
        ? (row.original.total_revenue || 0) / (row.original.total_sold || 1)
        : 0;
      return formatCurrency(avgPrice);
    },
  },
];

export default function ProductsByCategoryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    per_page: 50,
    page: 1,
  });
  
  const [data, setData] = React.useState<ProductsByCategoryItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report data
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProductsByCategory(filters);
      if (response.success) {
        // Handle both array and paginated response
        const items = Array.isArray(response.data) ? response.data : response.data.data;
        setData(items);
        setSummary(response.summary || null);
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
      await downloadReportAsCsv("/products/by-category", filters, "products_by_category.csv");
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
  const totalCategories = data.length;
  const totalProducts = data.reduce((acc, c) => acc + c.product_count, 0);
  const totalRevenue = data.reduce((acc, c) => acc + (c.total_revenue || 0), 0);
  const totalStock = data.reduce((acc, c) => acc + c.total_stock, 0);
  const totalStockValue = data.reduce((acc, c) => acc + (c.stock_value || 0), 0);

  // Sort by revenue for top categories
  const topCategories = [...data].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)).slice(0, 8);

  // Chart data
  const revenueChartData = topCategories.map((c, idx) => {
    const name = c.category?.name || "Uncategorized";
    return {
      name: name.length > 12 ? name.slice(0, 12) + "..." : name,
      value: c.total_revenue || 0,
      fill: CHART_COLORS[idx % CHART_COLORS.length],
    };
  });

  const comparisonChartData = topCategories.map((c) => {
    const name = c.category?.name || "Uncategorized";
    return {
      name: name.length > 10 ? name.slice(0, 10) + "..." : name,
      products: c.product_count,
      sold: c.total_sold || 0,
      stock: c.total_stock,
    };
  });

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Products by Category"
        description="Category breakdown"
        category="products"
        categoryLabel="Products"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Products by Category"
      description="Analyze product distribution, sales performance, and inventory by category"
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
            title="Categories"
            value={totalCategories}
            icon="FolderOpen"
            loading={loading}
          />
          <SummaryCard
            title="Total Products"
            value={formatNumber(totalProducts)}
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
            title="Stock Value"
            value={formatCurrency(totalStockValue)}
            subtitle={`${formatNumber(totalStock)} units`}
            icon="Warehouse"
            loading={loading}
          />
        </SummaryGrid>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Revenue by Category"
            description="Revenue distribution across categories"
            data={revenueChartData}
            loading={loading}
            height={320}
            showLegend
          />
          <BarChartCard
            title="Category Comparison"
            description="Products, units sold, and stock levels"
            data={comparisonChartData}
            dataKeys={[
              { key: "products", name: "Products", color: "#3b82f6" },
              { key: "sold", name: "Units Sold", color: "#22c55e" },
              { key: "stock", name: "Stock", color: "#f59e0b" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={320}
          />
        </div>

        {/* Category Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Category Performance
            </CardTitle>
            <CardDescription>
              Detailed breakdown of each category's metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCategories.map((category, index) => {
                const revenueShare = totalRevenue > 0 ? ((category.total_revenue || 0) / totalRevenue) * 100 : 0;
                const productShare = totalProducts > 0 ? (category.product_count / totalProducts) * 100 : 0;
                
                return (
                  <div key={index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div>
                          <span className="font-medium">{category.category.name}</span>
                          <span className="text-muted-foreground ml-2">({category.product_count} products)</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{formatCurrency(category.total_revenue || 0)}</span>
                        <span className="text-muted-foreground ml-2">({revenueShare.toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Revenue Share</p>
                        <Progress value={revenueShare} className="h-2" />
                        <p className="mt-1 font-medium">{revenueShare.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Product Share</p>
                        <Progress value={productShare} className="h-2 [&>div]:bg-blue-500" />
                        <p className="mt-1 font-medium">{productShare.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Units Sold</p>
                        <p className="font-bold text-lg">{formatNumber(category.total_sold || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stock Level</p>
                        <p className="font-bold text-lg">{formatNumber(category.total_stock)}</p>
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
            searchColumn="category"
            searchPlaceholder="Search categories..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
