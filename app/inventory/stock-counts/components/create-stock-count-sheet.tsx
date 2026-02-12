"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Search, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getProducts } from "@/lib/products"
import { createStockCount } from "@/lib/stock-counts"
import { getUsers } from "@/lib/users"
import { getStores } from "@/lib/stores"
import type { StockCount, StockCountStatus, StockCountType, CreateStockCountItem } from "@/app/types"
import type { Product } from "@/lib/products"
import type { UserData } from "@/lib/users"
import type { Store } from "@/lib/stores"

interface CreateStockCountSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onStockCountCreated: (newCount: StockCount) => void
}

export function CreateStockCountSheet({ isOpen, onOpenChange, onStockCountCreated }: CreateStockCountSheetProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingStores, setLoadingStores] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formState, setFormState] = useState({
    name: "",
    count_type: "cycle_count" as StockCountType,
    status: "draft" as StockCountStatus,
    store_id: "",
    location: "",
    scheduled_date: "",
    description: "",
    assigned_to: "",
    category_filter: "",
  })

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoadingProducts(true)
        const { data: productsList } = await getProducts(1, 10000)
        setProducts(productsList || [])
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load products for selection. " + (error.message || "Please try again."),
          variant: "destructive",
        })
      } finally {
        setLoadingProducts(false)
      }
    }

    async function fetchUsers() {
      try {
        setLoadingUsers(true)
        const usersList = await getUsers()
        setUsers(usersList || [])
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load users. " + (error.message || "Please try again."),
          variant: "destructive",
        })
      } finally {
        setLoadingUsers(false)
      }
    }

    async function fetchStores() {
      try {
        setLoadingStores(true)
        const storesList = await getStores()
        setStores(storesList || [])
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load stores. " + (error.message || "Please try again."),
          variant: "destructive",
        })
      } finally {
        setLoadingStores(false)
      }
    }

    if (isOpen) {
      fetchProducts()
      fetchUsers()
      fetchStores()
      // Reset form when opening
      setFormState({
        name: "",
        count_type: "cycle_count",
        status: "draft",
        store_id: "",
        location: "",
        scheduled_date: "",
        description: "",
        assigned_to: "",
        category_filter: "",
      })
      setSelectedProducts([])
      setSearchTerm("")
    }
  }, [isOpen, toast])

  // Update location when store changes
  useEffect(() => {
    if (formState.store_id) {
      const selectedStore = stores.find(s => s.id === formState.store_id)
      if (selectedStore) {
        setFormState(prev => ({ ...prev, location: selectedStore.name }))
      }
    }
  }, [formState.store_id, stores])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleProductSelection = (productId: string, isChecked: boolean) => {
    setSelectedProducts((prev) => (isChecked ? [...prev, productId] : prev.filter((id) => id !== productId)))
  }

  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean))) as string[]

  // Filter products based on search
  const filteredProducts = products.filter(product => {
    return searchTerm === "" || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  })

  // Get products to count for cycle_count
  const getCycleCountProducts = () => {
    if (formState.category_filter) {
      return products.filter(p => p.category?.name === formState.category_filter)
    }
    return selectedProducts.length > 0 
      ? products.filter(p => selectedProducts.includes(p.id))
      : []
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    const { name, count_type, status, store_id, location, description, assigned_to, scheduled_date, category_filter } = formState

    // Basic validation
    if (!name || !store_id) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name and Store).",
        variant: "destructive",
      })
      setSaving(false)
      return
    }

    const selectedStore = stores.find(s => s.id === store_id)
    if (!selectedStore) {
      toast({
        title: "Validation Error",
        description: "Please select a valid store.",
        variant: "destructive",
      })
      setSaving(false)
      return
    }

    // Validate cycle_count with in_progress status requires items
    if (count_type === "cycle_count" && status === "in_progress") {
      const hasItems = category_filter 
        ? products.some(p => p.category?.name === category_filter)
        : selectedProducts.length > 0
        
      if (!hasItems) {
        toast({
          title: "Validation Error",
          description: "Cycle count in progress requires at least one product. Please select products or a category.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }
    }

    try {
      // Prepare base payload
      const payload: {
        company_id: string
        store_id: string
        name: string
        description?: string
        count_type: StockCountType
        status: StockCountStatus
        location?: string
        category_filter?: string | null
        scheduled_date?: string | null
        assigned_to?: string
        items?: CreateStockCountItem[]
      } = {
        company_id: selectedStore.company_id,
        store_id: selectedStore.id,
        name,
        description: description || undefined,
        count_type,
        status,
        location: location || selectedStore.name,
        category_filter: category_filter || null,
        scheduled_date: scheduled_date ? new Date(scheduled_date).toISOString() : null,
        assigned_to: assigned_to || undefined,
      }

      // Handle items based on count_type and status
      if (count_type === "cycle_count" && status === "in_progress") {
        // Cycle count in progress: must include items
        let itemsToInclude: Product[] = []
        
        if (category_filter) {
          itemsToInclude = products.filter(p => p.category?.name === category_filter)
        } else {
          itemsToInclude = products.filter(p => selectedProducts.includes(p.id))
        }
        
        payload.items = itemsToInclude.map((product): CreateStockCountItem => ({
          product_id: product.id,
          expected_quantity: product.stock_quantity ?? 0,
          counted_quantity: null,
          notes: "",
          requires_recount: false,
        }))
      }
      // full_count with in_progress: items array is optional - backend auto-populates
      // draft status: items not required

      console.log("Creating stock count with payload:", JSON.stringify(payload, null, 2))
      
      const newStockCount = await createStockCount(payload)

      if (!newStockCount) throw new Error("Failed to create stock count")

      const itemCount = payload.items?.length || (count_type === "full_count" && status === "in_progress" ? "auto-populated" : 0)
      toast({
        title: "Success",
        description: `Stock count created successfully${payload.items ? ` with ${payload.items.length} products` : count_type === "full_count" && status === "in_progress" ? " (products will be auto-populated)" : "!"}`,
      })
      onStockCountCreated(newStockCount)
      onOpenChange(false)
      
      // Reset form state
      setFormState({
        name: "",
        count_type: "cycle_count",
        status: "draft",
        store_id: "",
        location: "",
        scheduled_date: "",
        description: "",
        assigned_to: "",
        category_filter: "",
      })
      setSelectedProducts([])
      setSearchTerm("")
    } catch (error: any) {
      console.error("Stock count creation error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create stock count.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Show product selection for cycle_count in_progress
  const showProductSelection = formState.count_type === "cycle_count" && formState.status === "in_progress"
  
  // Show category filter for full_count
  const showCategoryFilter = formState.count_type === "full_count"

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Create New Stock Count</SheetTitle>
          <SheetDescription>Define the details for your new stock count.</SheetDescription>
        </SheetHeader>
        <form id="create-stock-count-form" onSubmit={handleSubmit} className="grid gap-4 py-4 flex-grow overflow-y-auto">
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
              <CardDescription>Enter the basic details for this stock count</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Count Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formState.name} 
                  onChange={handleFormChange} 
                  required 
                  placeholder="e.g., Monthly Inventory Count" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="count_type">Count Type *</Label>
                  <Select
                    name="count_type"
                    value={formState.count_type}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, count_type: value as StockCountType }))}
                    required
                  >
                    <SelectTrigger id="count_type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_count">Full Count</SelectItem>
                      <SelectItem value="cycle_count">Cycle Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    name="status"
                    value={formState.status}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value as StockCountStatus }))}
                    required
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft (Plan Later)</SelectItem>
                      <SelectItem value="in_progress">In Progress (Start Counting)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store_id">Store *</Label>
                  <Select
                    name="store_id"
                    value={formState.store_id}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, store_id: value }))}
                    required
                  >
                    <SelectTrigger id="store_id">
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingStores ? (
                        <SelectItem value="loading" disabled>Loading stores...</SelectItem>
                      ) : stores.length === 0 ? (
                        <SelectItem value="none" disabled>No stores available</SelectItem>
                      ) : (
                        stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formState.location}
                    onChange={handleFormChange}
                    placeholder="e.g., Warehouse A - Shelf B12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Scheduled Date</Label>
                  <Input
                    id="scheduled_date"
                    name="scheduled_date"
                    type="datetime-local"
                    value={formState.scheduled_date}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select
                    name="assigned_to"
                    value={formState.assigned_to || "unassigned"}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, assigned_to: value === "unassigned" ? "" : value }))}
                  >
                    <SelectTrigger id="assigned_to">
                      <SelectValue placeholder="Select user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {loadingUsers ? (
                        <SelectItem value="loading" disabled>Loading users...</SelectItem>
                      ) : users.length === 0 ? (
                        <SelectItem value="none" disabled>No users available</SelectItem>
                      ) : (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.email}>
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name} (${user.email})`
                              : user.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Details</CardTitle>
              <CardDescription>Add any additional notes or instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formState.description} 
                  onChange={handleFormChange} 
                  rows={3} 
                  placeholder="Add any special instructions or notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Category Filter for Full Count */}
          {showCategoryFilter && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Filter (Optional)</CardTitle>
                <CardDescription>Filter full count by product category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category_filter">Filter by Category</Label>
                  <Select
                    name="category_filter"
                    value={formState.category_filter || "none"}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, category_filter: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger id="category_filter">
                      <SelectValue placeholder="All categories (no filter)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md flex gap-2">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {formState.status === "in_progress" 
                      ? <>Full count items will be <strong>auto-populated</strong> by the system from products with inventory at this store.{formState.category_filter && <> Only <strong>{formState.category_filter}</strong> products will be included.</>}</>
                      : <>Create as draft now. When you start the count, the system will auto-populate items from products with inventory.{formState.category_filter && <> Only <strong>{formState.category_filter}</strong> products will be included.</>}</>
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Selection for Cycle Count */}
          {showProductSelection && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Products to Count *</CardTitle>
                <CardDescription>
                  Select products to include in this cycle count
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selection Mode */}
                <div className="space-y-2">
                  <Label>Selection Mode</Label>
                  <Select 
                    value={formState.category_filter ? "category" : "manual"} 
                    onValueChange={(value: "category" | "manual") => {
                      if (value === "manual") {
                        setFormState(prev => ({ ...prev, category_filter: "" }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Selection (Specific Products)</SelectItem>
                      <SelectItem value="category">By Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Selection */}
                {formState.category_filter !== undefined && (
                  <div className="space-y-2">
                    <Label htmlFor="category">Select Category *</Label>
                    <Select 
                      value={formState.category_filter || ""} 
                      onValueChange={(value) => setFormState(prev => ({ ...prev, category_filter: value }))}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <SelectItem value="none" disabled>No categories available</SelectItem>
                        ) : (
                          categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category} ({products.filter(p => p.category?.name === category).length} products)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Manual Selection */}
                {!formState.category_filter && (
                  <div className="space-y-2">
                    <Label htmlFor="product-search">Search Products</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="product-search"
                        placeholder="Search by name or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-md p-4 bg-muted/20">
                      {loadingProducts ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-muted-foreground">Loading products...</span>
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          {searchTerm ? 'No products match your search' : 'No products available'}
                        </p>
                      ) : (
                        filteredProducts.map((product) => (
                          <div key={product.id} className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50 transition-colors">
                            <input
                              type="checkbox"
                              id={`product-${product.id}`}
                              checked={selectedProducts.includes(product.id)}
                              onChange={(e) => handleProductSelection(product.id, e.target.checked)}
                              className="mt-0.5 h-4 w-4 text-[#1E2764] border-gray-300 rounded focus:ring-[#1E2764]"
                            />
                            <label
                              htmlFor={`product-${product.id}`}
                              className="text-sm leading-tight cursor-pointer flex-1"
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {product.sku || 'No SKU'} • Stock: {product.stock_quantity || 0}
                                {product.category?.name && ` • ${product.category.name}`}
                              </div>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedProducts.length > 0 && (
                      <div className="flex items-center justify-between pt-2 text-sm">
                        <span className="text-muted-foreground">{selectedProducts.length} products selected</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProducts([])}
                        >
                          Clear selection
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {formState.category_filter ? (
                      <>
                        <strong>Category count:</strong> {products.filter(p => p.category?.name === formState.category_filter).length} products in "{formState.category_filter}" category will be included.
                      </>
                    ) : selectedProducts.length > 0 ? (
                      <>
                        <strong>Manual selection:</strong> {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} will be included in this count.
                      </>
                    ) : (
                      <>
                        <strong>Warning:</strong> Please select at least one product or a category for the cycle count.
                      </>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
        <SheetFooter className="mt-auto pt-4 border-t bg-background dark:bg-gray-950">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="create-stock-count-form" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Stock Count"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
