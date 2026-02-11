"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getRepairsByProduct, downloadReportAsCsv, RepairByProductItem, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Wrench, Package } from "lucide-react";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#10b981"];

const columns: ColumnDef<RepairByProductItem>[] = [
  {
    accessorKey: "product_name",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.product_name}</p>
        {row.original.sku && <p className="text-sm text-muted-foreground font-mono">{row.original.sku}</p>}
      </div>
    ),
  },
  {
    accessorKey: "repair_count",
    header: "Repairs",
    cell: ({ row }) => <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{formatNumber(row.original.repair_count)}</Badge>,
  },
  {
    accessorKey: "total_quantity",
    header: "Total Qty",
    cell: ({ row }) => <span className="font-mono">{parseFloat(row.original.total_quantity).toFixed(0)}</span>,
  },
];

export default function RepairByProductReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month" });
  const [data, setData] = React.useState<RepairByProductItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getRepairsByProduct(filters);
      if (response.success) { setData(Array.isArray(response.data) ? response.data : []); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/repairs/by-product", filters, "repairs_by_product.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalRepairs = data.reduce((a, p) => a + p.repair_count, 0);
  const totalQuantity = data.reduce((a, p) => a + parseFloat(p.total_quantity), 0);
  const sortedData = [...data].sort((a, b) => b.repair_count - a.repair_count);
  const topProduct = sortedData[0];

  const pieData = sortedData.slice(0, 8).map((p, idx) => ({
    name: p.product_name?.length > 15 ? p.product_name.slice(0, 15) + "..." : p.product_name || "Unknown",
    value: p.repair_count,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const barData = sortedData.slice(0, 6).map(p => ({
    name: p.product_name?.length > 12 ? p.product_name.slice(0, 12) + "..." : p.product_name || "Unknown",
    repairs: p.repair_count,
    quantity: parseFloat(p.total_quantity),
  }));

  if (error && !data.length) {
    return <ReportLayout title="Repairs by Product" description="Product breakdown" category="repairs" categoryLabel="Repairs"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Repairs by Product" description="Identify products requiring the most repairs" category="repairs" categoryLabel="Repairs" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Products Repaired" value={data.length} icon="Package" loading={loading} />
          <SummaryCard title="Total Repairs" value={formatNumber(totalRepairs)} icon="Wrench" loading={loading} />
          <SummaryCard title="Total Qty" value={totalQuantity.toFixed(0)} icon="Layers" loading={loading} />
          <SummaryCard title="Top Product" value={topProduct?.product_name || "—"} subtitle={topProduct ? `${topProduct.repair_count} repairs` : ""} icon="Trophy" loading={loading} />
        </SummaryGrid>

        {topProduct && (
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-100"><Wrench className="h-6 w-6 text-blue-600" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Most Repaired Product</p>
                    <h3 className="text-xl font-bold">{topProduct.product_name}</h3>
                    {topProduct.sku && <p className="text-sm text-muted-foreground font-mono">{topProduct.sku}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">{formatNumber(topProduct.repair_count)}</p>
                  <p className="text-sm text-muted-foreground">{parseFloat(topProduct.total_quantity).toFixed(0)} units</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Repairs by Product" description="Distribution of repairs" data={pieData} loading={loading} height={300} showLegend />
          <BarChartCard title="Top Products" description="Compare repair counts and quantities" data={barData} dataKeys={[{ key: "repairs", name: "Repairs", color: "#3b82f6" }, { key: "quantity", name: "Quantity", color: "#f59e0b" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Product Repair Ranking</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sortedData.slice(0, 5).map((product, idx) => {
              const percentage = totalRepairs > 0 ? (product.repair_count / totalRepairs) * 100 : 0;
              return (
                <div key={product.product_id} className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1"><span className="font-medium truncate">{product.product_name}</span><span className="text-blue-600 font-medium">{product.repair_count} repairs</span></div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <span className="text-sm text-muted-foreground w-16 text-right">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="product_name" searchPlaceholder="Search products..." />
        )}
      </div>
    </ReportLayout>
  );
}
