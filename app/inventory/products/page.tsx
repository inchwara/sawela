"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, PackageCheck, DollarSign, AlertTriangle } from "lucide-react"
import { ProductTable } from "./product-table"
import { useState, useEffect } from "react"
import { getProducts, calculateProductSummary, type Product } from "@/lib/products"
import { PermissionGuard } from "@/components/PermissionGuard"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [pagination, setPagination] = useState<{ current_page: number, per_page: number, total: number, last_page: number } | undefined>(undefined)
  const { toast } = useToast()

  // Fetch products on mount and when pagination changes
  useEffect(() => {
    fetchProducts()
  }, [currentPage, itemsPerPage])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      console.log("Fetching products...")
      const result = await getProducts(currentPage, itemsPerPage, {})
      console.log("Products data received:", result)
      
      // Ensure we always have an array
      setProducts(Array.isArray(result.data) ? result.data : [])
      setPagination(result.pagination)
    } catch (error: any) {
      console.error("Error fetching products:", error)
      setProducts([])
      toast({
        title: "Error",
        description: error.message || "Failed to load products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchProducts()
  }

  // Calculate summary from current products
  const calculatedSummary = calculateProductSummary(products)
  
  const keyMetrics = {
    totalProducts: pagination?.total || calculatedSummary.totalProducts,
    activeProducts: calculatedSummary.activeProducts,
    lowStockProducts: calculatedSummary.lowStockProducts,
    totalValue: calculatedSummary.totalValue
  }

  if (loading) {
    return (
      <PermissionGuard permissions={["can_view_products_menu","can_view_products",  "can_manage_system", "can_manage_company"]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permissions={["can_view_products_menu","can_view_products",  "can_manage_system", "can_manage_company"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-600">
            Manage your product inventory and catalog
          </p>
        </div>

        {/* Summary Cards - Only 4 key metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyMetrics.totalProducts}
              </div>
              <p className="text-xs text-muted-foreground">All products in inventory</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyMetrics.activeProducts}
              </div>
              <p className="text-xs text-muted-foreground">Currently available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyMetrics.lowStockProducts}
              </div>
              <p className="text-xs text-muted-foreground">Products below threshold</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {`KES ${keyMetrics.totalValue.toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Inventory value</p>
            </CardContent>
          </Card>
        </div>

        <ProductTable 
          products={products} 
          summaryData={{
            totalProducts: keyMetrics.totalProducts,
            activeProducts: keyMetrics.activeProducts,
            totalValue: keyMetrics.totalValue,
            lowStockProducts: keyMetrics.lowStockProducts
          }}
          onProductUpdated={handleRefresh}
          isLoading={loading}
          onRefresh={handleRefresh}
          pagination={pagination}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </PermissionGuard>
  )
}