"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import {
  ReportFilters,
} from "@/lib/reports-api";
import { getProductSummary } from "@/lib/products";
import {
  ReportLayout,
  ReportErrorState,
  ReportEmptyState,
} from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, FileText, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

// Product type from the API response
interface ProductItem {
  id: string;
  product_number: string;
  product_code: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit_cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_featured: boolean;
  track_inventory: boolean;
  category: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  store: { id: string; name: string } | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  inventory_value: number;
  primary_image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface FilterOption {
  id: string;
  name: string;
  product_count?: number;
}

interface FilterOptions {
  categories: FilterOption[];
  suppliers: FilterOption[];
  stores: FilterOption[];
}

interface ProductSummary {
  total_products: number;
  active_products: number;
  inactive_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_inventory_value: number;
  total_potential_value: number;
  potential_profit: number;
}

// Stock status badge styling
const stockStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
  in_stock: { bg: "bg-green-100", text: "text-green-700", label: "In Stock" },
  low_stock: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Low Stock" },
  out_of_stock: { bg: "bg-red-100", text: "text-red-700", label: "Out of Stock" },
};

// Table columns
const columns: ColumnDef<ProductItem>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        {row.original.primary_image_url ? (
          <img 
            src={row.original.primary_image_url} 
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
          <p className="text-sm text-muted-foreground">
            {row.original.product_code || row.original.product_number}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => row.original.sku || "—",
  },
  {
    accessorKey: "product_code",
    header: "Product Code",
    cell: ({ row }) => row.original.product_code || "—",
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
    accessorKey: "store",
    header: "Store",
    cell: ({ row }) => row.original.store?.name || "—",
  },
  {
    accessorKey: "stock_quantity",
    header: "Stock",
    cell: ({ row }) => (
      <span className="font-mono">{formatNumber(row.original.stock_quantity || 0)}</span>
    ),
  },
  {
    accessorKey: "unit_cost",
    header: "Unit Cost",
    cell: ({ row }) => formatCurrency(row.original.unit_cost || 0),
  },
  {
    accessorKey: "stock_status",
    header: "Stock Status",
    cell: ({ row }) => {
      const status = row.original.stock_status || "in_stock";
      const style = stockStatusStyles[status] || stockStatusStyles.in_stock;
      return (
        <Badge className={cn(style.bg, style.text, "border-0")}>
          {style.label}
        </Badge>
      );
    },
  },
];

export default function ProductSummaryReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [reportGenerated, setReportGenerated] = React.useState(false);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({
    period: "this_month",
    per_page: 25,
    page: 1,
  });
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState<string>("created_at");
  const [sortOrder, setSortOrder] = React.useState<string>("desc");
  
  const [data, setData] = React.useState<ProductItem[]>([]);
  const [summary, setSummary] = React.useState<ProductSummary | null>(null);
  const [filterOptions, setFilterOptions] = React.useState<FilterOptions>({
    categories: [],
    suppliers: [],
    stores: [],
  });
  const [generatedAt, setGeneratedAt] = React.useState<string | null>(null);
  const [pagination, setPagination] = React.useState({
    total: 0,
    currentPage: 1,
    lastPage: 1,
  });

  // Fetch stores
  React.useEffect(() => {
    getStores().then(setStores).catch(console.error);
  }, []);

  // Fetch filter options on mount (without generating full report)
  React.useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response: any = await getProductSummary({ per_page: 1 });
        const responseData = response?.data || response;
        if (responseData?.filter_options) {
          setFilterOptions({
            categories: responseData.filter_options.categories || [],
            suppliers: responseData.filter_options.suppliers || [],
            stores: responseData.filter_options.stores || [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
      }
    };
    fetchFilterOptions();
  }, []);

  // Fetch report data
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build filter parameters to pass to API
      const apiFilters = {
        store_id: filters.store_id,
        category_id: selectedCategory !== "all" ? selectedCategory : undefined,
        supplier_id: selectedSupplier !== "all" ? selectedSupplier : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        search: searchQuery || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        per_page: filters.per_page,
        page: filters.page,
      };
      
      const response: any = await getProductSummary(apiFilters);
      // API returns { status: "success", data: { products, summary, ... } }
      const responseData = response?.data || response;
      if (responseData) {
        setData(responseData.products || []);
        setSummary(responseData.summary || null);
        setGeneratedAt(responseData.generated_at || null);
        setReportGenerated(true);
        if (responseData.filter_options) {
          setFilterOptions({
            categories: responseData.filter_options.categories || [],
            suppliers: responseData.filter_options.suppliers || [],
            stores: responseData.filter_options.stores || [],
          });
        }
        if (responseData.pagination) {
          setPagination({
            total: responseData.pagination.total,
            currentPage: responseData.pagination.current_page,
            lastPage: responseData.pagination.last_page,
          });
        }
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
  }, [toast, filters.store_id, filters.per_page, filters.page, selectedCategory, selectedSupplier, selectedStatus, searchQuery, sortBy, sortOrder]);

  // Handle export - export the data shown in the table
  const handleExport = () => {
    setExportLoading(true);
    try {
      // Define CSV headers
      const headers = [
        "Product Name",
        "Product Number",
        "SKU",
        "Product Code",
        "Category",
        "Supplier",
        "Store",
        "Stock Quantity",
        "Unit Cost",
        "Stock Status",
        "Inventory Value",
        "Created At",
        "Updated At"
      ];

      // Map data to CSV rows
      const rows = data.map((product) => [
        product.name || "",
        product.product_number || "",
        product.sku || "",
        product.product_code || "",
        product.category?.name || "Uncategorized",
        product.supplier?.name || "",
        product.store?.name || "",
        product.stock_quantity?.toString() || "0",
        product.unit_cost?.toString() || "0",
        product.stock_status || "",
        product.inventory_value?.toString() || "0",
        product.created_at || "",
        product.updated_at || ""
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => 
          row.map((cell) => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped = String(cell).replace(/"/g, '""');
            return escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")
              ? `"${escaped}"`
              : escaped;
          }).join(",")
        )
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `product_summary_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Exported ${data.length} products to CSV`,
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

  // Summary values with safe fallbacks
  const totalProducts = summary?.total_products || 0;
  const activeProducts = summary?.active_products || 0;
  const lowStockProducts = summary?.low_stock_products || 0;
  const outOfStockProducts = summary?.out_of_stock_products || 0;
  const totalInventoryValue = summary?.total_inventory_value || 0;
  const totalPotentialValue = summary?.total_potential_value || 0;
  const potentialProfit = summary?.potential_profit || 0;

  // Data is now filtered server-side, use data directly
  const filteredData = data;

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
      description="Comprehensive overview of all products with inventory status"
      category="products"
      categoryLabel="Products"
      loading={loading}
      generatedAt={generatedAt || undefined}
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
            <div className="flex flex-wrap gap-2">
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {filterOptions.categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Supplier Filter */}
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {filterOptions.suppliers.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="unit_cost">Unit Cost</SelectItem>
                  <SelectItem value="stock_quantity">Stock Qty</SelectItem>
                  <SelectItem value="created_at">Date Added</SelectItem>
                  <SelectItem value="updated_at">Last Updated</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Asc</SelectItem>
                  <SelectItem value="desc">Desc</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedSupplier("all");
                  setSelectedStatus("all");
                  setSortBy("created_at");
                  setSortOrder("desc");
                  setFilters(prev => ({ ...prev, store_id: undefined }));
                }}
                className="h-9 gap-1"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          }
        />

        {/* Generate Report Button */}
        <div className="flex justify-end gap-2">
          <Button 
            onClick={fetchReport} 
            disabled={loading}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {loading ? "Generating..." : "Generate Report"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportLoading || !reportGenerated}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {exportLoading ? "Exporting..." : "Export CSV"}
          </Button>
        </div>

        {/* Show placeholder if report not generated yet */}
        {!reportGenerated && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/30">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Report Generated</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Select your filters above and click "Generate Report" to view the product summary.
            </p>
          </div>
        ) : (
          <>
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
            title="Low Stock"
            value={lowStockProducts}
            icon="AlertTriangle"
            variant="warning"
            loading={loading}
          />
          <SummaryCard
            title="Out of Stock"
            value={outOfStockProducts}
            icon="XCircle"
            variant="danger"
            loading={loading}
          />
          <SummaryCard
            title="Inventory Value"
            value={formatCurrency(totalInventoryValue)}
            subtitle={`Potential: ${formatCurrency(totalPotentialValue)}`}
            icon="DollarSign"
            variant="success"
            loading={loading}
          />
        </SummaryGrid>

        {/* Data Table */}
        {filteredData.length === 0 && !loading ? (
          <ReportEmptyState />
        ) : (
          <ReportTable
            columns={columns}
            data={filteredData}
            loading={loading}
            searchColumn="name"
            searchPlaceholder="Search products..."
            pageSize={filters.per_page}
            totalItems={filteredData.length}
            currentPage={pagination.currentPage}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
          />
        )}
          </>
        )}
      </div>
    </ReportLayout>
  );
}
