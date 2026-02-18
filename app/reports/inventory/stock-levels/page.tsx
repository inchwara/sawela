"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { getStores, Store } from "@/lib/stores";
import {
  getStockLevels,
  downloadReportAsCsv,
  StockLevelsSummary,
  ReportFilters,
  GroupBy,
} from "@/lib/reports-api";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatCurrency, formatNumber } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Warehouse, AlertTriangle, CheckCircle, TrendingDown, DollarSign, Layers } from "lucide-react";
import Image from "next/image";

// Extended type to include optional fields from API
interface ExtendedStockLevelItem {
  id: string;
  name: string;
  sku: string | null;
  product_code: string | null;
  category: string;
  store_id: string | null;
  stock_quantity: number;
  on_hand: number;
  allocated: number;
  low_stock_threshold: number;
  unit_cost: string;
  price: string;
  available_quantity: number;
  stock_value: number | string;
  primary_image_url?: string | null;
  image_urls?: string[];
}

// Stock status badge component
function StockStatusBadge({ item }: { item: ExtendedStockLevelItem }) {
  const onHand = item.on_hand;
  const threshold = item.low_stock_threshold;

  if (onHand === 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Out of Stock
      </Badge>
    );
  }

  if (onHand <= threshold) {
    return (
      <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30">
        <TrendingDown className="h-3 w-3" />
        Low Stock
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30">
      <CheckCircle className="h-3 w-3" />
      Adequate
    </Badge>
  );
}

// Table columns definition
const columns: ColumnDef<ExtendedStockLevelItem>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        {row.original.primary_image_url ? (
          <div className="relative h-10 w-10 rounded-md overflow-hidden border">
            <Image
              src={row.original.primary_image_url}
              alt={row.original.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="font-medium">{row.original.name}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {row.original.product_code && (
              <span className="font-mono">{row.original.product_code}</span>
            )}
            {row.original.sku && (
              <>
                <span>•</span>
                <span>SKU: {row.original.sku}</span>
              </>
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.category || "—"}</Badge>
    ),
  },
  {
    accessorKey: "stock_quantity",
    header: "Total Stock",
    cell: ({ row }) => (
      <span className="font-medium">{formatNumber(row.original.stock_quantity)}</span>
    ),
  },
  {
    accessorKey: "on_hand",
    header: "On Hand",
    cell: ({ row }) => (
      <span className={row.original.on_hand === 0 ? "text-red-600 font-bold" : ""}>
        {formatNumber(row.original.on_hand)}
      </span>
    ),
  },
  {
    accessorKey: "allocated",
    header: "Allocated",
    cell: ({ row }) => formatNumber(row.original.allocated),
  },
  {
    accessorKey: "available_quantity",
    header: "Available",
    cell: ({ row }) => (
      <span className="font-semibold text-primary">
        {formatNumber(row.original.available_quantity)}
      </span>
    ),
  },
  {
    accessorKey: "low_stock_threshold",
    header: "Min Threshold",
    cell: ({ row }) => formatNumber(row.original.low_stock_threshold),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StockStatusBadge item={row.original} />,
  },
  {
    accessorKey: "unit_cost",
    header: "Unit Cost",
    cell: ({ row }) => formatCurrency(parseFloat(row.original.unit_cost)),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => formatCurrency(parseFloat(row.original.price)),
  },
  {
    accessorKey: "stock_value",
    header: "Stock Value",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(typeof row.original.stock_value === 'string' 
          ? parseFloat(row.original.stock_value) 
          : row.original.stock_value)}
      </span>
    ),
  },
];

// Group by options
const GROUP_BY_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "category", label: "Category" },
  { value: "store", label: "Store" },
];

export default function StockLevelsReport() {
  ;
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
  });
  const [groupBy, setGroupBy] = React.useState<string>("none");

  const [data, setData] = React.useState<ExtendedStockLevelItem[]>([]);
  const [summary, setSummary] = React.useState<StockLevelsSummary | null>(null);
  const [meta, setMeta] = React.useState<any>(null);
  const [totalItems, setTotalItems] = React.useState(0);

  // Fetch stores on mount
  React.useEffect(() => {
    getStores().then(setStores).catch(console.error);
  }, []);

  // Fetch report data - load all items for client-side search/pagination
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters: ReportFilters = {
        ...filters,
        per_page: 10000, // Fetch all items like products page
        page: 1,
      };
      
      // Add group_by if selected
      if (groupBy && groupBy !== "none") {
        apiFilters.group_by = groupBy as GroupBy;
      }

      const response = await getStockLevels(apiFilters);
      if (response.success) {
        setData(response.data.data as ExtendedStockLevelItem[]);
        setTotalItems(response.data.total);
        setSummary(response.summary || null);
        setMeta(response.meta);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report");
      toast.error(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [filters, groupBy, toast]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle export
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const exportFilters = { ...filters };
      if (groupBy && groupBy !== "none") {
        exportFilters.group_by = groupBy as GroupBy;
      }
      await downloadReportAsCsv("/inventory/stock-levels", exportFilters, "stock_levels.csv");
      toast.success("The report has been downloaded as CSV");
    } catch (err: any) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Handle group by change
  const handleGroupByChange = (value: string) => {
    setGroupBy(value);
  };

  if (error && !data.length) {
    return (
      <ReportLayout
        title="Stock Levels"
        description="Current inventory levels by product"
        category="inventory"
        categoryLabel="Inventory"
      >
        <ReportErrorState message={error} onRetry={() => fetchReport()} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Stock Levels"
      description="View current inventory levels across all products and stores"
      category="inventory"
      categoryLabel="Inventory"
      loading={loading}
      generatedAt={meta?.generated_at}
      onExport={handleExport}
      onRefresh={() => fetchReport()}
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
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Select value={groupBy} onValueChange={handleGroupByChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Group by..." />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_BY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* Alert Banner for critical stock */}
        {summary && (summary.out_of_stock > 0 || summary.low_stock > 0) && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                  Stock Attention Required
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {summary.out_of_stock > 0 && (
                    <span className="font-medium">{summary.out_of_stock} products out of stock. </span>
                  )}
                  {summary.low_stock > 0 && (
                    <span>{summary.low_stock} products below minimum threshold.</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard
            title="Total Products"
            value={summary?.total_products || 0}
            icon="Package"
            loading={loading}
          />
          <SummaryCard
            title="Out of Stock"
            value={summary?.out_of_stock || 0}
            icon="AlertCircle"
            variant="danger"
            loading={loading}
          />
          <SummaryCard
            title="Low Stock"
            value={summary?.low_stock || 0}
            icon="TrendingDown"
            variant="warning"
            loading={loading}
          />
          <SummaryCard
            title="Adequate Stock"
            value={summary?.adequate_stock || 0}
            icon="CheckCircle2"
            variant="success"
            loading={loading}
          />
        </SummaryGrid>

        {/* Stock Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Units in Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatNumber(summary?.total_units || 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">across all products</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Stock Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatCurrency(
                  typeof summary?.total_stock_value === 'string'
                    ? parseFloat(summary.total_stock_value)
                    : summary?.total_stock_value || 0
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">current inventory value</p>
            </CardContent>
          </Card>
        </div>

        {/* Store Filter Info */}
        {filters.store_id && stores.length > 0 && (
          <Card className="bg-muted/30">
            <CardContent className="flex items-center gap-3 py-3">
              <Warehouse className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                Showing stock levels for:{" "}
                <span className="font-medium">
                  {stores.find((s) => s.id === filters.store_id)?.name || "Selected Store"}
                </span>
              </span>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        {data.length === 0 && !loading ? (
          <ReportEmptyState
            title="No Stock Data"
            description="No inventory data found for the selected filters."
          />
        ) : (
          <ReportTable
            columns={columns}
            data={data}
            loading={loading}
            searchColumn="name"
            searchPlaceholder="Search products..."
            totalItems={totalItems}
            serverPagination={false}
          />
        )}
      </div>
    </ReportLayout>
  );
}
