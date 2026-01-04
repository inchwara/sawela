"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  getStockMovement,
  downloadReportAsCsv,
  StockMovementItem,
  StockMovementSummary,
  ReportFilters,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber } from "../../components/report-table";
import { SummaryCard, SummaryGrid, StatusIndicator } from "../../components/report-summary-cards";
import { BarChartCard, AreaChartCard } from "../../components/report-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Movement type badge colors
const movementTypeColors: Record<string, { bg: string; text: string; icon: React.ComponentType<any> }> = {
  receipt: { bg: "bg-green-100", text: "text-green-700", icon: ArrowDownCircle },
  dispatch: { bg: "bg-blue-100", text: "text-blue-700", icon: ArrowUpCircle },
  adjustment: { bg: "bg-yellow-100", text: "text-yellow-700", icon: RefreshCw },
  transfer: { bg: "bg-purple-100", text: "text-purple-700", icon: ArrowRightLeft },
};

// Table columns definition
const columns: ColumnDef<StockMovementItem>[] = [
  {
    accessorKey: "movement_date",
    header: "Date",
    cell: ({ row }) => format(new Date(row.original.movement_date), "MMM d, yyyy HH:mm"),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type.toLowerCase();
      const config = movementTypeColors[type] || { bg: "bg-gray-100", text: "text-gray-700", icon: RefreshCw };
      const Icon = config.icon;
      return (
        <Badge className={cn(config.bg, config.text, "gap-1 border-0")}>
          <Icon className="h-3 w-3" />
          <span className="capitalize">{type}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "product",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.product.name}</p>
        <p className="text-sm text-muted-foreground">{row.original.product.sku}</p>
      </div>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
      const qty = row.original.quantity;
      const isPositive = qty > 0;
      return (
        <span className={cn("font-mono font-medium", isPositive ? "text-green-600" : "text-red-600")}>
          {isPositive ? "+" : ""}{formatNumber(qty)}
        </span>
      );
    },
  },
  {
    accessorKey: "store",
    header: "Store",
    cell: ({ row }) => row.original.store?.name || "—",
  },
  {
    accessorKey: "reference_type",
    header: "Reference",
    cell: ({ row }) => (
      <span className="capitalize text-sm">
        {row.original.reference_type?.replace(/_/g, " ") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground line-clamp-1">
        {row.original.notes || "—"}
      </span>
    ),
  },
  {
    accessorKey: "created_by",
    header: "Created By",
    cell: ({ row }) => {
      const user = row.original.created_by;
      return user ? `${user.first_name} ${user.last_name}` : "—";
    },
  },
];

export default function StockMovementReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters & { type?: string }>({
    period: "this_month",
    per_page: 25,
    page: 1,
  });
  
  const [data, setData] = React.useState<StockMovementItem[]>([]);
  const [summary, setSummary] = React.useState<StockMovementSummary | null>(null);
  const [meta, setMeta] = React.useState<any>(null);
  const [pagination, setPagination] = React.useState({
    total: 0,
    currentPage: 1,
    lastPage: 1,
  });

  // Fetch stores on mount
  React.useEffect(() => {
    getStores().then(setStores).catch(console.error);
  }, []);

  // Fetch report data
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getStockMovement(filters);
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
      await downloadReportAsCsv("/inventory/movement", filters, "stock_movement.csv");
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

  // Handle page change
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Calculate totals from summary
  const totalInbound = summary?.by_type
    ?.filter((t) => ["receipt", "return"].includes(t.type.toLowerCase()))
    .reduce((acc, t) => acc + Math.abs(t.total_quantity), 0) || 0;

  const totalOutbound = summary?.by_type
    ?.filter((t) => ["dispatch", "transfer_out"].includes(t.type.toLowerCase()))
    .reduce((acc, t) => acc + Math.abs(t.total_quantity), 0) || 0;

  const totalAdjustments = summary?.by_type
    ?.filter((t) => t.type.toLowerCase() === "adjustment")
    .reduce((acc, t) => acc + t.total_quantity, 0) || 0;

  const totalMovements = summary?.by_type?.reduce((acc, t) => acc + t.count, 0) || 0;

  // Prepare chart data
  const movementTypeChartData = (summary?.by_type || []).map((item) => ({
    name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    count: item.count,
    quantity: Math.abs(item.total_quantity),
  }));

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Stock Movement"
        description="Inventory movement history"
        category="inventory"
        categoryLabel="Inventory"
      >
        <ReportErrorState message={error} onRetry={fetchReport} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Stock Movement"
      description="Track all inventory movements including receipts, dispatches, and adjustments"
      category="inventory"
      categoryLabel="Inventory"
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
          additionalFilters={
            <Select
              value={filters.type || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  type: value === "all" ? undefined : value,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="dispatch">Dispatch</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Movements"
            value={totalMovements}
            icon="Package"
            loading={loading}
          />
          <SummaryCard
            title="Inbound (Received)"
            value={formatNumber(totalInbound)}
            subtitle="units"
            icon="Package"
            variant="success"
            loading={loading}
          />
          <SummaryCard
            title="Outbound (Dispatched)"
            value={formatNumber(totalOutbound)}
            subtitle="units"
            icon="Truck"
            variant="info"
            loading={loading}
          />
          <SummaryCard
            title="Net Adjustments"
            value={formatNumber(totalAdjustments)}
            subtitle="units"
            icon="TrendingUp"
            variant={totalAdjustments >= 0 ? "success" : "warning"}
            loading={loading}
          />
        </SummaryGrid>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartCard
            title="Movement by Type"
            description="Number of movements and total quantity"
            data={movementTypeChartData}
            dataKeys={[
              { key: "count", name: "Movements", color: "#3b82f6" },
              { key: "quantity", name: "Quantity", color: "#10b981" },
            ]}
            xAxisKey="name"
            loading={loading}
            height={300}
          />

          {/* Movement type breakdown cards */}
          <Card>
            <CardHeader>
              <CardTitle>Movement Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(summary?.by_type || []).map((item, index) => {
                const type = item.type.toLowerCase();
                const config = movementTypeColors[type] || { bg: "bg-gray-100", text: "text-gray-700", icon: RefreshCw };
                const Icon = config.icon;
                const percentage = totalMovements > 0 ? (item.count / totalMovements) * 100 : 0;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded", config.bg)}>
                          <Icon className={cn("h-4 w-4", config.text)} />
                        </div>
                        <span className="font-medium capitalize">{item.type}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{item.count} movements</span>
                        <span className="text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pl-8">
                      <span>Total quantity: {formatNumber(Math.abs(item.total_quantity))} units</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", config.bg.replace("100", "500"))}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        {data.length === 0 && !loading ? (
          <ReportEmptyState />
        ) : (
          <ReportTable
            columns={columns}
            data={data}
            loading={loading}
            searchColumn="product"
            searchPlaceholder="Search by product..."
            pageSize={filters.per_page}
            totalItems={pagination.total}
            currentPage={pagination.currentPage}
            onPageChange={handlePageChange}
            serverPagination
          />
        )}
      </div>
    </ReportLayout>
  );
}
