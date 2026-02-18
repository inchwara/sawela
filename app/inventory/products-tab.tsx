"use client"

import { useState, useCallback } from "react"
import { getProducts, calculateProductSummary, type Product, type ProductSummary } from "@/lib/products"
import { ProductTable } from "./products/product-table"
import { useDataCache } from "@/lib/data-cache"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

type ProductsTabContentProps = {}

export function ProductsTab({}: ProductsTabContentProps) {
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    category: "all"
  })

  // Create a memoized fetch function that includes current filters
  const fetchProducts = useCallback(async () => {
    return getProducts(currentPage, pageSize, filters)
  }, [currentPage, pageSize, filters])

  // Use the data cache hook to fetch and cache products
  const {
    data: productsData,
    isLoading,
    error,
    refetch,
  } = useDataCache<{ data: Product[]; count: number }>(
    `products-list-${currentPage}-${pageSize}-${JSON.stringify(filters)}`, // cache key with filters
    fetchProducts, // fetch function
    {
      expirationMs: 2 * 60 * 1000, // 2 minutes cache (shorter for better responsiveness)
      retryOnError: true,
      onSuccess: (data) => {
        setLastRefreshTime(new Date())
      },
      onError: (error) => {
        toast.error(error.message || "Failed to load products")
      },
    },
  )

  // Calculate summary data from products
  const summaryData: ProductSummary = productsData?.data
    ? calculateProductSummary(productsData.data)
    : {
        totalProducts: 0,
        activeProducts: 0,
        totalValue: 0,
        lowStockProducts: 0,
      }

  const handleRefresh = () => {
    refetch()
  }

  const handleProductsChange = () => {
    refetch()
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
          {lastRefreshTime && !isLoading && <span>Last updated: {lastRefreshTime.toLocaleTimeString()}</span>}
          {isLoading && <span>Loading products...</span>}
          {productsData && <span> • {productsData.count} total products</span>}
        </div>
        {/* Removed duplicate Refresh and Add Product buttons as per UI update */}
      </div>

      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message || "Failed to load products"}.
            <Button variant="link" onClick={handleRefresh} className="p-0 h-auto font-normal">
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && !productsData?.data ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      ) : productsData?.data ? (
        <ProductTable 
          products={productsData.data} 
          summaryData={summaryData}
          onProductUpdated={handleRefresh}
          onRefresh={handleRefresh}
        />
      ) : null}
    </div>
  )
}