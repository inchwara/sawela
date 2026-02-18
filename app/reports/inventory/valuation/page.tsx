"use client";

import * as React from "react";
import { toast } from "sonner";
import { getStores, Store } from "@/lib/stores";
import {
  getStockValuation,
  downloadReportAsCsv,
  StockValuationData,
  ReportFilters,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { PieChartCard, BarChartCard } from "../../components/report-charts";
import { formatCurrency, formatNumber } from "../../components/report-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Package, Warehouse } from "lucide-react";

export default function StockValuationReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
  });
  
  const [data, setData] = React.useState<StockValuationData | null>(null);
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
      const response = await getStockValuation(filters);
      if (response.success) {
        setData(response.data);
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
      await downloadReportAsCsv("/inventory/valuation", filters, "stock_valuation.csv");
      toast.success("The report has been downloaded as CSV");
    } catch (err: any) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Prepare chart data
  const categoryChartData = (data?.by_category || []).map((cat, index) => ({
    name: cat.category || "Uncategorized",
    value: parseFloat(cat.cost_value),
    color: [
      "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", 
      "#06b6d4", "#ec4899", "#84cc16"
    ][index % 8],
  }));

  const storeChartData = (data?.by_store || []).map((store) => ({
    name: store.store_name,
    cost: parseFloat(store.cost_value),
    units: store.total_units,
  }));

  if (error && !data) {
    return (
      <ReportLayout
        title="Stock Valuation"
        description="Total value of inventory"
        category="inventory"
        categoryLabel="Inventory"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Stock Valuation"
      description="Total value of inventory breakdown by category and store"
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

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Cost Value"
            value={formatCurrency(data?.total?.total_cost_value || "0")}
            icon="DollarSign"
            variant="info"
            loading={loading}
          />
          <SummaryCard
            title="Total Retail Value"
            value={formatCurrency(data?.total?.total_retail_value || "0")}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Total Units"
            value={formatNumber(data?.total?.total_units || 0)}
            icon="Package"
            loading={loading}
          />
        </SummaryGrid>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Valuation by Category"
            description="Cost value distribution across categories"
            data={categoryChartData}
            loading={loading}
            height={300}
            innerRadius={50}
            formatter={(v) => formatCurrency(v)}
          />
          
          <BarChartCard
            title="Valuation by Store"
            description="Cost value and units by store"
            data={storeChartData}
            dataKeys={[
              { key: "cost", name: "Cost Value", color: "#3b82f6" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={300}
            formatter={(v) => formatCurrency(v)}
          />
        </div>

        {/* Category Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Detailed valuation by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-right py-3 px-4 font-medium">Products</th>
                    <th className="text-right py-3 px-4 font-medium">Units</th>
                    <th className="text-right py-3 px-4 font-medium">Cost Value</th>
                    <th className="text-right py-3 px-4 font-medium">Retail Value</th>
                    <th className="text-right py-3 px-4 font-medium">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.by_category || []).map((category, index) => {
                    const totalCost = parseFloat(data?.total?.total_cost_value || "0");
                    const catCost = parseFloat(category.cost_value);
                    const percentage = totalCost > 0 ? (catCost / totalCost) * 100 : 0;
                    
                    return (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{category.category || "Uncategorized"}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(category.product_count)}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(category.total_units)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(category.cost_value)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(category.retail_value)}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4 text-right">
                      {formatNumber(
                        (data?.by_category || []).reduce((acc, c) => acc + c.product_count, 0)
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">{formatNumber(data?.total?.total_units || 0)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(data?.total?.total_cost_value || "0")}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(data?.total?.total_retail_value || "0")}</td>
                    <td className="py-3 px-4 text-right">
                      <Badge>100%</Badge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Store Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Store Breakdown
            </CardTitle>
            <CardDescription>Inventory value by store location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Store</th>
                    <th className="text-right py-3 px-4 font-medium">Products</th>
                    <th className="text-right py-3 px-4 font-medium">Units</th>
                    <th className="text-right py-3 px-4 font-medium">Cost Value</th>
                    <th className="text-right py-3 px-4 font-medium">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.by_store || []).map((store, index) => {
                    const totalCost = parseFloat(data?.total?.total_cost_value || "0");
                    const storeCost = parseFloat(store.cost_value);
                    const percentage = totalCost > 0 ? (storeCost / totalCost) * 100 : 0;
                    
                    return (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{store.store_name}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(store.product_count)}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(store.total_units)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(store.cost_value)}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  );
}
