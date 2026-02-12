"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  getStockByStore,
  downloadReportAsCsv,
  StockByStoreItem,
  StockByStoreSummary,
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
import { Store as StoreIcon, Package, DollarSign, MapPin, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

// Table columns definition
const columns: ColumnDef<StockByStoreItem>[] = [
  {
    accessorKey: "store_name",
    header: "Store",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <StoreIcon className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium">{row.original.store_name || "Unknown Store"}</span>
      </div>
    ),
  },
  {
    accessorKey: "total_products",
    header: "Products",
    cell: ({ row }) => formatNumber(row.original.total_products),
  },
  {
    accessorKey: "total_units",
    header: "Total Units",
    cell: ({ row }) => (
      <span className="font-mono">{formatNumber(row.original.total_units)}</span>
    ),
  },
  {
    accessorKey: "total_value",
    header: "Stock Value",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.total_value)}</span>
    ),
  },
  {
    accessorKey: "low_stock_count",
    header: "Low Stock",
    cell: ({ row }) => {
      const count = row.original.low_stock_count || 0;
      return (
        <Badge variant={count > 0 ? "destructive" : "outline"}>
          {count} items
        </Badge>
      );
    },
  },
  {
    accessorKey: "out_of_stock_count",
    header: "Out of Stock",
    cell: ({ row }) => {
      const count = row.original.out_of_stock_count || 0;
      return (
        <Badge variant={count > 0 ? "destructive" : "outline"}>
          {count} items
        </Badge>
      );
    },
  },
];

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function StockByStoreReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({
    per_page: 10000, // Load all items for client-side search
    page: 1,
  });
  
  const [data, setData] = React.useState<StockByStoreItem[]>([]);
  const [summary, setSummary] = React.useState<StockByStoreSummary | null>(null);
  const [meta, setMeta] = React.useState<any>(null);
  const [totalItems, setTotalItems] = React.useState(0);

  // Fetch stores on mount
  React.useEffect(() => {
    getStores().then(setStores).catch(console.error);
  }, []);

  // Fetch report data - load all items for client-side search
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getStockByStore(filters);
      if (response.success) {
        // API returns data as flat array directly
        const reportData = Array.isArray(response.data) ? response.data : [];
        setData(reportData);
        setTotalItems(reportData.length);
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
      await downloadReportAsCsv("/inventory/by-store", filters, "stock_by_store.csv");
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



  // Calculate totals from data array
  const totalStores = data.length;
  const totalValue = data.reduce((acc, s) => acc + (Number(s.total_value) || 0), 0);
  const totalUnits = data.reduce((acc, s) => acc + (s.total_units || 0), 0);
  const totalProducts = data.reduce((acc, s) => acc + (s.total_products || 0), 0);
  const totalLowStock = data.reduce((acc, s) => acc + (s.low_stock_count || 0), 0);
  const totalOutOfStock = data.reduce((acc, s) => acc + (s.out_of_stock_count || 0), 0);

  // Prepare chart data
  const storeValueChartData = data.slice(0, 10).map((item, idx) => ({
    name: item.store_name || "Unknown Store",
    value: Number(item.total_value) || 0,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const storeQuantityChartData = data.slice(0, 10).map((item) => ({
    name: item.store_name || "Unknown Store",
    quantity: item.total_units,
    products: item.total_products,
  }));

  // Find store with highest value
  const topStore = data.length > 0 ? data.reduce((max, store) => 
    (Number(store.total_value) || 0) > (Number(max?.total_value) || 0) ? store : max
  , data[0]) : null;

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Stock by Store"
        description="Inventory distribution across stores"
        category="inventory"
        categoryLabel="Inventory"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Stock by Store"
      description="Compare inventory distribution and value across all store locations"
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
          showPeriodFilter={false}
          showGroupBy={false}
          loading={loading}
        />

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Stores"
            value={totalStores}
            subtitle="locations"
            icon="Store"
            loading={loading}
          />
          <SummaryCard
            title="Total Stock Value"
            value={formatCurrency(totalValue)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Total Units"
            value={formatNumber(totalUnits)}
            subtitle="items in stock"
            icon="Package"
            loading={loading}
          />
          <SummaryCard
            title="Stock Alerts"
            value={totalLowStock + totalOutOfStock}
            subtitle={`${totalOutOfStock} out of stock, ${totalLowStock} low`}
            icon="AlertTriangle"
            variant={totalOutOfStock > 0 ? "danger" : totalLowStock > 0 ? "warning" : "success"}
            loading={loading}
          />
        </SummaryGrid>

        {/* Top Store Highlight */}
        {topStore && (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Highest Stock Value</p>
                    <h3 className="text-2xl font-bold">{topStore.store_name || "Unknown Store"}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{formatCurrency(topStore.total_value)}</p>
                  <p className="text-muted-foreground">
                    {formatNumber(topStore.total_units)} units • {formatNumber(topStore.total_products)} products
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Stock Value Distribution"
            description="Share of total inventory value by store"
            data={storeValueChartData}
            loading={loading}
            height={300}
            showLegend
          />
          <BarChartCard
            title="Stock by Store"
            description="Quantity and product count comparison"
            data={storeQuantityChartData}
            dataKeys={[
              { key: "quantity", name: "Units", color: "#3b82f6" },
              { key: "products", name: "Products", color: "#22c55e" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={300}
          />
        </div>

        {/* Store Details Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Store Comparison
            </CardTitle>
            <CardDescription>
              Detailed breakdown of inventory metrics by store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.slice(0, 8).map((item, index) => {
                const itemValue = Number(item.total_value) || 0;
                const valuePercentage = totalValue > 0 ? (itemValue / totalValue) * 100 : 0;
                const quantityPercentage = totalUnits > 0 ? (item.total_units / totalUnits) * 100 : 0;
                
                return (
                  <div key={item.store_id || index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="font-medium">{item.store_name || "Unknown Store"}</span>
                        {item.out_of_stock_count && item.out_of_stock_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {item.out_of_stock_count} out of stock
                          </Badge>
                        )}
                        {item.low_stock_count && item.low_stock_count > 0 && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                            {item.low_stock_count} low stock
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{formatCurrency(itemValue)}</span>
                        <span className="text-muted-foreground ml-2">({valuePercentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Value Share</span>
                          <span>{valuePercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={valuePercentage} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Quantity Share</span>
                          <span>{quantityPercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={quantityPercentage} className="h-2 [&>div]:bg-green-500" />
                      </div>
                    </div>
                    
                    <div className="flex gap-6 mt-3 text-sm text-muted-foreground">
                      <span>{formatNumber(item.total_products)} products</span>
                      <span>{formatNumber(item.total_units)} units</span>
                      <span>Avg per product: {formatNumber(item.total_units / (item.total_products || 1))}</span>
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
            searchColumn="store_name"
            searchPlaceholder="Search by store..."
            totalItems={totalItems}
            serverPagination={false}
          />
        )}
      </div>
    </ReportLayout>
  );
}
