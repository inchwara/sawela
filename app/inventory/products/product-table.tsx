"use client"

import { useState, useEffect, useMemo } from "react"
import { createProductsBulk } from "@/lib/products"
import Image from "next/image"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Search, Download, ChevronLeft, ChevronRight, Eye, Edit, Loader2, Plus, AlertTriangle, RefreshCw, Delete } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { getProductById, type Product, type ProductSummary } from "@/lib/products"
import * as XLSX from "xlsx"
import { PermissionGuard } from "@/components/PermissionGuard"
import { usePermissions } from "@/hooks/use-permissions"
import { useRouter } from "next/navigation"
import { deleteProduct } from "@/lib/products"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { CreateProductSheet } from "./components/create-product-sheet"
import { EditProductSheet } from "./components/edit-product-sheet"
import { ProductDetailsSheet } from "./components/product-details-sheet"
import { DeleteProductConfirmationDialog } from "./components/DeleteProductConfirmationDialog"
import { ProductTableSkeleton } from "./components/product-table-skeleton"

// Helper function to normalize image URLs
function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return "/placeholder.svg"
  if (url.startsWith("http")) return url
  if (url.startsWith("/")) return url
  return `/${url}`
}

// Helper function to get primary image from product
function getPrimaryImage(product: Product): string {
  // Prioritize primary_image_url from API if available
  if (product.primary_image_url) {
    return product.primary_image_url
  }
  
  // Fall back to image_urls array if available
  if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
    const primaryIndex = product.primary_image_index || 0
    return product.image_urls[primaryIndex] || product.image_urls[0]
  }
  
  // Fall back to images array
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const primaryIndex = product.primary_image_index || 0
    const primaryImage = product.images[primaryIndex]
    return normalizeImageUrl(primaryImage)
  }
  
  // Final fallback to image_url
  return normalizeImageUrl(product.image_url)
}

// Helper function to check if a product matches search criteria
function productMatchesSearch(product: Product, searchTerm: string): boolean {
  const term = searchTerm.toLowerCase()
  
  // Get supplier name for search, handling both string and object cases
  let supplierName = ""
  if (product.supplier) {
    if (typeof product.supplier === 'object') {
      supplierName = product.supplier.name || ""
    } else if (typeof product.supplier === 'string') {
      supplierName = product.supplier
    }
  }
  
  return (
    product.name.toLowerCase().includes(term) ||
    (Boolean(product.sku) && product.sku!.toLowerCase().includes(term)) ||
    (Boolean(product.category?.name) && product.category?.name.toLowerCase().includes(term)) ||
    (Boolean(product.brand) && product.brand!.toLowerCase().includes(term)) ||
    (Boolean(supplierName) && supplierName.toLowerCase().includes(term)) ||
    (Boolean(product.product_number) && product.product_number!.toLowerCase().includes(term)) ||
    (Boolean(product.product_code) && product.product_code!.toLowerCase().includes(term))
  )
}

// Helper function to download CSV template
function downloadCSVTemplate(products: Product[], searchTerm: string) {
  // Filter products based on search term
  const filteredProducts = searchTerm 
    ? products.filter(product => productMatchesSearch(product, searchTerm))
    : products

  // Create CSV content
  const headers = ["Name", "SKU", "Category", "Price", "Stock Quantity", "Description"]
  const csvContent = [
    headers.join(","),
    ...filteredProducts.map(product => 
      [
        `"${product.name}"`,
        `"${product.sku || ""}"`,
        `"${product.category?.name || ""}"`,
        `"${product.price}"`,
        `"${product.stock_quantity}"`,
        `"${product.description || ""}"`
      ].join(",")
    )
  ].join("\n")

  // Create Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `products_${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Helper function to download Excel template
function downloadExcelTemplate(products: Product[], searchTerm: string) {
  // Filter products based on search term
  const filteredProducts = searchTerm 
    ? products.filter(product => productMatchesSearch(product, searchTerm))
    : products

  // Create worksheet data
  const worksheetData = [
    ["Name", "SKU", "Category", "Price", "Stock Quantity", "Description"],
    ...filteredProducts.map(product => [
      product.name,
      product.sku || "",
      product.category?.name || "",
      product.price,
      product.stock_quantity,
      product.description || ""
    ])
  ]

  // Create workbook and worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Products")

  // Download Excel file
  XLSX.writeFile(wb, `products_${new Date().toISOString().split("T")[0]}.xlsx`)
}

interface ProductTableProps {
  products: Product[]
  summaryData: ProductSummary
  onProductUpdated: () => void
  isLoading?: boolean
  onRefresh?: () => void
  // Legacy props kept optional for compatibility but not used for logic anymore
  pagination?: any
  onPageChange?: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  currentPage?: number
  itemsPerPage?: number
}

export function ProductTable({ 
  products, 
  summaryData,
  onProductUpdated,
  isLoading = false,
  onRefresh
}: ProductTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  // Client-side pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false)
  const [isLoadingProductDetails, setIsLoadingProductDetails] = useState(false)
  const router = useRouter()
  const { hasPermission } = usePermissions()
  // Handler to fetch complete product details including packaging
  const handleViewProductDetails = async (product: Product) => {
    setIsDetailsSheetOpen(true)
    setIsLoadingProductDetails(true)
    setSelectedProduct(product) // Show basic info immediately
    
    try {
      const result = await getProductById(product.id)
      if (result.status === "success" && result.data) {
        setSelectedProduct(result.data) // Update with complete data including packaging
      } else {
        toast.error(result.message || "Failed to load complete product details")
      }
    } catch (error) {
      console.error("Error loading product details:", error)
      toast.error("An error occurred while loading product details")
    } finally {
      setIsLoadingProductDetails(false)
    }
  }

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products]
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(product => 
        productMatchesSearch(product, searchTerm)
      )
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(product => {
        // Ensure product.is_active is treated as boolean
        const isActive = Boolean(product.is_active);
        return statusFilter === "active" ? isActive : !isActive;
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "price":
          comparison = parseFloat(a.price || "0") - parseFloat(b.price || "0")
          break
        case "stock":
          comparison = (a.stock_quantity || 0) - (b.stock_quantity || 0)
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
    
    return result
  }, [products, searchTerm, statusFilter, sortBy, sortOrder])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])
  
  // Calculate pagination
  const totalItems = filteredAndSortedProducts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Handle delete success
  const handleDeleteSuccess = () => {
    setProductToDelete(null)
    setIsDeleteDialogOpen(false)
    onProductUpdated()
    toast.success("Product deleted successfully")
  }

  // Handle export
  const handleExport = (format: "csv" | "excel") => {
    if (format === "csv") {
      downloadCSVTemplate(products, searchTerm)
    } else {
      downloadExcelTemplate(products, searchTerm)
    }
  }

  if (isLoading) {
    return <ProductTableSkeleton />
  }

  return (
    <>
      <div className="space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-') as [typeof sortBy, typeof sortOrder]
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
              }}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                  <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                  <SelectItem value="stock-asc">Stock (Low-High)</SelectItem>
                  <SelectItem value="stock-desc">Stock (High-Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <PermissionGuard permissions={["can_create_products", "can_manage_system", "can_manage_company"]} hideOnDenied>
              <Button 
                onClick={() => setIsCreateSheetOpen(true)}
                size="sm"
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </PermissionGuard>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {onRefresh && (
              <Button size="sm" className="bg-primary text-white hover:bg-primary/90" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Image</TableHead>
                <TableHead className="font-semibold">Product #</TableHead>
                <TableHead className="font-semibold">Product Code</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Stock</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Store</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    <div className="text-gray-500">
                      <p className="font-semibold">No products found</p>
                      <p className="text-sm">Create your first product to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow 
                    key={product.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewProductDetails(product)}
                  >
                    <TableCell>
                      <div className="relative h-10 w-10 rounded-md overflow-hidden">
                        <Image
                          src={getPrimaryImage(product)}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="text-sm font-semibold text-[#1E2764]">
                        {product.product_number || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.product_code || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        KES {parseFloat(product.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span>{product.stock_quantity || 0}</span>
                        {product.stock_quantity === 0 ? (
                          <AlertTriangle className="ml-2 h-4 w-4 text-red-500" />
                        ) : (product.stock_quantity || 0) <= product.low_stock_threshold ? (
                          <AlertTriangle className="ml-2 h-4 w-4 text-yellow-500" />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category?.name || "Uncategorized"}
                    </TableCell>
                    <TableCell>
                      {product.store?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"} className={product.is_active ? "bg-green-500" : ""}>
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product)
                            setIsDetailsSheetOpen(true)
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <PermissionGuard permissions={["can_update_products", "can_manage_system", "can_manage_company"]} hideOnDenied>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product)
                              setIsEditSheetOpen(true)
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Product
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard permissions={["can_delete_products", "can_manage_system", "can_manage_company"]} hideOnDenied>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductToDelete(product)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Delete className="mr-2 h-4 w-4" />
                              Delete Product
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                {totalItems} products
              </p>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  const newItemsPerPage = Number(value)
                  // Reset to first page when changing items per page
                  setItemsPerPage(newItemsPerPage)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={itemsPerPage.toString()} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize.toString()}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center justify-center text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateProductSheet 
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        onProductCreated={onProductUpdated}
      />
      
      {selectedProduct && (
        <EditProductSheet 
          open={isEditSheetOpen}
          onOpenChange={setIsEditSheetOpen}
          product={selectedProduct}
          onProductUpdated={onProductUpdated}
        />
      )}
      
      {selectedProduct && (
        <ProductDetailsSheet 
          open={isDetailsSheetOpen}
          onOpenChange={setIsDetailsSheetOpen}
          product={selectedProduct}
          isLoading={isLoadingProductDetails}
          onEdit={(product) => {
            setSelectedProduct(product);
            setIsDetailsSheetOpen(false);
            setIsEditSheetOpen(true);
          }}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <DeleteProductConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        product={productToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </>
  )
}