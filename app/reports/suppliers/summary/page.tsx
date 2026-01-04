"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import {
  getSupplierSummary,
  downloadReportAsCsv,
  SupplierSummaryItem,
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
import { Building2, Package, DollarSign, TrendingUp, Star, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// Status badge
const statusStyles: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700" },
  inactive: { bg: "bg-gray-100", text: "text-gray-700" },
  suspended: { bg: "bg-red-100", text: "text-red-700" },
};

// Table columns
const columns: ColumnDef<SupplierSummaryItem>[] = [
  {
    accessorKey: "name",
    header: "Supplier",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.contact_person && (
            <p className="text-sm text-muted-foreground">{row.original.contact_person}</p>
          )}
        </div>
      </div>
    ),
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
  {
    accessorKey: "product_count",
    header: "Products",
    cell: ({ row }) => formatNumber(row.original.product_count || 0),
  },
  {
    accessorKey: "total_orders",
    header: "Orders",
    cell: ({ row }) => formatNumber(row.original.total_orders || 0),
  },
  {
    accessorKey: "total_spend",
    header: "Total Spend",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.total_spend || 0)}</span>
    ),
  },
  {
    accessorKey: "pending_orders",
    header: "Pending",
    cell: ({ row }) => (
      <Badge variant={row.original.pending_orders > 0 ? "secondary" : "outline"}>
        {row.original.pending_orders || 0}
      </Badge>
    ),
  },
  {
    accessorKey: "avg_delivery_days",
    header: "Avg Delivery",
    cell: ({ row }) => (
      <span>{row.original.avg_delivery_days ? `${row.original.avg_delivery_days} days` : "—"}</span>
    ),
  },
];

export default function SupplierSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    per_page: 50,
    page: 1,
  });
  
  const [data, setData] = React.useState<SupplierSummaryItem[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<any>(null);

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSupplierSummary(filters);
      if (response.success) {
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
      await downloadReportAsCsv("/suppliers/summary", filters, "supplier_summary.csv");
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
  const activeSuppliers = data.filter(s => s.status?.toLowerCase() === "active").length;
  const totalSpend = data.reduce((acc, s) => acc + (s.total_spend || 0), 0);
  const totalProducts = data.reduce((acc, s) => acc + (s.product_count || 0), 0);
  const totalOrders = data.reduce((acc, s) => acc + (s.total_orders || 0), 0);

  // Sort by spend
  const topSuppliers = [...data].sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0)).slice(0, 8);
  const topSupplier = topSuppliers[0];

  // Chart data
  const spendChartData = topSuppliers.map((s, idx) => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + "..." : s.name,
    value: s.total_spend || 0,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const comparisonChartData = topSuppliers.map((s) => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + "..." : s.name,
    products: s.product_count || 0,
    orders: s.total_orders || 0,
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Supplier Summary"
        description="Overview of all suppliers"
        category="suppliers"
        categoryLabel="Suppliers"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Supplier Summary"
      description="Comprehensive overview of supplier relationships and spending"
      category="suppliers"
      categoryLabel="Suppliers"
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
            title="Total Suppliers"
            value={totalSuppliers}
            subtitle={`${activeSuppliers} active`}
            icon="Building2"
            loading={loading}
          />
          <SummaryCard
            title="Total Spend"
            value={formatCurrency(totalSpend)}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Products Supplied"
            value={formatNumber(totalProducts)}
            icon="Package"
            loading={loading}
          />
          <SummaryCard
            title="Total Orders"
            value={formatNumber(totalOrders)}
            icon="ShoppingCart"
            loading={loading}
          />
        </SummaryGrid>

        {/* Top Supplier Highlight */}
        {topSupplier && (
          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500 text-white">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Supplier by Spend</p>
                    <h3 className="text-xl font-bold">{topSupplier.name}</h3>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      {topSupplier.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {topSupplier.email}
                        </span>
                      )}
                      {topSupplier.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {topSupplier.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-600">{formatCurrency(topSupplier.total_spend || 0)}</p>
                  <p className="text-muted-foreground">
                    {topSupplier.product_count} products • {topSupplier.total_orders} orders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Spend Distribution"
            description="Total spend by supplier"
            data={spendChartData}
            loading={loading}
            height={320}
            showLegend
          />
          <BarChartCard
            title="Supplier Comparison"
            description="Products and orders per supplier"
            data={comparisonChartData}
            dataKeys={[
              { key: "products", name: "Products", color: "#3b82f6" },
              { key: "orders", name: "Orders", color: "#22c55e" },
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
              Supplier Analysis
            </CardTitle>
            <CardDescription>
              Detailed breakdown of supplier metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSuppliers.map((supplier, index) => {
                const spendShare = totalSpend > 0 ? ((supplier.total_spend || 0) / totalSpend) * 100 : 0;
                const productShare = totalProducts > 0 ? ((supplier.product_count || 0) / totalProducts) * 100 : 0;
                
                return (
                  <div key={index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{supplier.name}</span>
                          <Badge className={cn(
                            statusStyles[supplier.status?.toLowerCase() || "active"]?.bg,
                            statusStyles[supplier.status?.toLowerCase() || "active"]?.text,
                            "border-0 capitalize text-xs"
                          )}>
                            {supplier.status || "active"}
                          </Badge>
                          {index === 0 && (
                            <Badge className="bg-purple-100 text-purple-700 border-0">
                              <Star className="h-3 w-3 mr-1" />
                              Top
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{formatCurrency(supplier.total_spend || 0)}</span>
                        <span className="text-muted-foreground ml-2">({spendShare.toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Spend Share</p>
                        <Progress value={spendShare} className="h-2" />
                        <p className="mt-1 font-medium">{spendShare.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Products</p>
                        <p className="font-bold text-lg">{supplier.product_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Orders</p>
                        <p className="font-bold text-lg">{supplier.total_orders || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending</p>
                        <p className={cn("font-bold text-lg", supplier.pending_orders > 0 ? "text-amber-600" : "")}>
                          {supplier.pending_orders || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Delivery</p>
                        <p className="font-bold text-lg">
                          {supplier.avg_delivery_days ? `${supplier.avg_delivery_days}d` : "—"}
                        </p>
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
            searchPlaceholder="Search suppliers..."
          />
        )}
      </div>
    </ReportLayout>
  );
}
