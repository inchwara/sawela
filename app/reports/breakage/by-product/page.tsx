"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getBreakageByProduct, downloadReportAsCsv, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductBreakageItem { product: { id: number; name: string; sku: string }; breakage_count: number; total_quantity: number; total_value_lost: number; avg_per_breakage: number; }

const CHART_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"];

const columns: ColumnDef<ProductBreakageItem>[] = [
  { accessorKey: "product", header: "Product", cell: ({ row }) => <div><p className="font-medium">{row.original.product?.name}</p><p className="text-sm text-muted-foreground font-mono">{row.original.product?.sku}</p></div> },
  { accessorKey: "breakage_count", header: "Breakages", cell: ({ row }) => <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{formatNumber(row.original.breakage_count)}</Badge> },
  { accessorKey: "total_quantity", header: "Qty Lost", cell: ({ row }) => <span className="font-mono text-red-600">-{formatNumber(row.original.total_quantity)}</span> },
  { accessorKey: "total_value_lost", header: "Value Lost", cell: ({ row }) => <span className="font-mono text-red-600 font-medium">{formatCurrency(row.original.total_value_lost)}</span> },
  { accessorKey: "avg_per_breakage", header: "Avg/Breakage", cell: ({ row }) => <span className="text-muted-foreground">{row.original.avg_per_breakage?.toFixed(1) || "—"} units</span> },
];

export default function BreakageByProductReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month" });
  const [data, setData] = React.useState<ProductBreakageItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getBreakageByProduct(filters);
      if (response.success) { setData(response.data || []); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/breakages/by-product", filters, "breakages_by_product.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalBreakages = data.reduce((a, p) => a + p.breakage_count, 0);
  const totalQuantity = data.reduce((a, p) => a + p.total_quantity, 0);
  const totalValue = data.reduce((a, p) => a + p.total_value_lost, 0);
  const topProduct = data.length > 0 ? data.reduce((prev, curr) => prev.total_value_lost > curr.total_value_lost ? prev : curr) : null;

  const pieData = data.slice(0, 8).map((p, idx) => ({
    name: p.product?.name || "Unknown",
    value: p.total_value_lost,
    fill: CHART_COLORS[idx % CHART_COLORS.length]
  }));

  const barData = data.slice(0, 6).map(p => ({
    name: p.product?.name?.substring(0, 15) + (p.product?.name?.length > 15 ? "..." : "") || "Unknown",
    breakages: p.breakage_count,
    quantity: p.total_quantity,
    value: p.total_value_lost
  }));

  if (error && !data.length) {
    return <ReportLayout title="Breakages by Product" description="Product breakdown" category="breakage" categoryLabel="Breakage"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Breakages by Product" description="Identify products with highest breakage rates and losses" category="breakage" categoryLabel="Breakage" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Products Affected" value={data.length} icon="Package" loading={loading} />
          <SummaryCard title="Total Breakages" value={formatNumber(totalBreakages)} icon="AlertTriangle" variant="warning" loading={loading} />
          <SummaryCard title="Total Qty Lost" value={formatNumber(totalQuantity)} icon="Minus" variant="danger" loading={loading} />
          <SummaryCard title="Total Value Lost" value={formatCurrency(totalValue)} icon="DollarSign" variant="danger" loading={loading} />
        </SummaryGrid>

        {topProduct && (
          <Card className="border-2 border-red-200 bg-red-50/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-red-100"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Highest Loss Product</p>
                    <h3 className="text-xl font-bold">{topProduct.product?.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{topProduct.product?.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(topProduct.total_value_lost)}</p>
                  <p className="text-sm text-muted-foreground">{formatNumber(topProduct.breakage_count)} breakages • {formatNumber(topProduct.total_quantity)} units</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Value Lost by Product" description="Distribution of losses by product" data={pieData} loading={loading} height={300} showLegend />
          <BarChartCard title="Top Products by Breakage" description="Compare breakages and value lost" data={barData} dataKeys={[{ key: "breakages", name: "Breakages", color: "#ef4444" }, { key: "quantity", name: "Qty Lost", color: "#f97316" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Product Breakage Ranking</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.slice(0, 5).map((product, idx) => {
              const percentage = totalValue > 0 ? (product.total_value_lost / totalValue) * 100 : 0;
              return (
                <div key={product.product?.id} className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1"><span className="font-medium truncate">{product.product?.name}</span><span className="text-red-600 font-medium">{formatCurrency(product.total_value_lost)}</span></div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <span className="text-sm text-muted-foreground w-16 text-right">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="product" searchPlaceholder="Search products..." />
        )}
      </div>
    </ReportLayout>
  );
}
