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
import { Loader2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getProducts } from "@/lib/products"
import { createStockCount } from "@/lib/stock-counts"
import { getUsers } from "@/lib/users"
import { getStores } from "@/lib/stores"
import type { StockCount } from "@/app/types"
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
  const [productSelectionMode, setProductSelectionMode] = useState<"all" | "category" | "manual">("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [formState, setFormState] = useState({
    name: "",
    count_type: "cycle_count" as "cycle_count" | "full_count",
    location: "",
    scheduled_date: "",
    notes: "",
    assigned_to: "",
  })

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoadingProducts(true)
        const { data: productsList } = await getProducts()
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
        location: "",
        scheduled_date: "",
        notes: "",
        assigned_to: "",
      })
      setSelectedProducts([])
      setProductSelectionMode("all")
      setSelectedCategory("")
      setSearchTerm("")
    }
  }, [isOpen, toast])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleProductSelection = (productId: string, isChecked: boolean) => {
    setSelectedProducts((prev) => (isChecked ? [...prev, productId] : prev.filter((id) => id !== productId)))
  }

  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean))) as string[]

  // Filter products based on search and mode
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === "" || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (productSelectionMode === "category" && selectedCategory) {
      return matchesSearch && product.category?.name === selectedCategory
    }
    return matchesSearch
  })

  // Calculate products to count based on mode
  const getProductsToCount = () => {
    if (productSelectionMode === "all") {
      return products.length
    } else if (productSelectionMode === "category" && selectedCategory) {
      return products.filter(p => p.category?.name === selectedCategory).length
    } else {
      return selectedProducts.length
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    const { name, count_type, location, notes, assigned_to } = formState

    // Validation based on selection mode
    if (!name || !location) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      setSaving(false)
      return
    }

    if (productSelectionMode === "manual" && selectedProducts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one product for manual selection mode.",
        variant: "destructive",
      })
      setSaving(false)
      return
    }

    if (productSelectionMode === "category" && !selectedCategory) {
      toast({
        title: "Validation Error",
        description: "Please select a category.",
        variant: "destructive",
      })
      setSaving(false)
      return
    }

    try {
      // Get the selected store
      const selectedStore = stores.find(s => s.id === location)
      if (!selectedStore) throw new Error("Selected store not found")

      // Prepare items data based on selection mode
      let items: Array<{ product_id: string; expected_quantity: number; counted_quantity: null; notes: string }>
      
      if (productSelectionMode === "all") {
        items = products.map((product) => ({
          product_id: product.id,
          expected_quantity: product.stock_quantity || 0,
          counted_quantity: null,
          notes: "",
        }))
      } else if (productSelectionMode === "category" && selectedCategory) {
        const categoryProducts = products.filter(p => p.category?.name === selectedCategory)
        items = categoryProducts.map((product) => ({
          product_id: product.id,
          expected_quantity: product.stock_quantity || 0,
          counted_quantity: null,
          notes: "",
        }))
      } else {
        items = selectedProducts.map((productId) => ({
          product_id: productId,
          expected_quantity: products.find((p) => p.id === productId)?.stock_quantity || 0,
          counted_quantity: null,
          notes: "",
        }))
      }

      // Create stock count via API
      const payload = {
        company_id: selectedStore.company_id,
        store_id: selectedStore.id,
        name,
        description: notes || undefined,
        count_type,
        status: "draft" as const,
        location: selectedStore.name,
        assigned_to: assigned_to || undefined,
        items,
      }
      
      console.log("Creating stock count with payload:", JSON.stringify(payload, null, 2))
      
      const newStockCount = await createStockCount(payload)

      if (!newStockCount) throw new Error("Failed to create stock count")

      toast({
        title: "Success",
        description: `Stock count created successfully with ${items.length} products!`,
      })
      onStockCountCreated(newStockCount)
      onOpenChange(false)
      // Reset form state
      setFormState({
        name: "",
        count_type: "cycle_count",
        location: "",
        scheduled_date: "",
        notes: "",
        assigned_to: "",
      })
      setSelectedProducts([])
      setProductSelectionMode("all")
      setSelectedCategory("")
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
                <Input id="name" name="name" value={formState.name} onChange={handleFormChange} required placeholder="e.g., Monthly Inventory Count" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="count_type">Count Type *</Label>
                  <Select
                    name="count_type"
                    value={formState.count_type}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, count_type: value as "cycle_count" | "full_count" }))}
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
                  <Label htmlFor="location">Store/Location *</Label>
                  <Select
                    name="location"
                    value={formState.location}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, location: value }))}
                    required
                  >
                    <SelectTrigger id="location">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Scheduled Date *</Label>
                  <Input
                    id="scheduled_date"
                    name="scheduled_date"
                    type="date"
                    value={formState.scheduled_date}
                    onChange={handleFormChange}
                    required
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
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  value={formState.notes} 
                  onChange={handleFormChange} 
                  rows={3} 
                  placeholder="Add any special instructions or notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Products Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Products to Count *</CardTitle>
              <CardDescription>
                {getProductsToCount() > 0 
                  ? `${getProductsToCount()} product${getProductsToCount() !== 1 ? 's' : ''} will be counted`
                  : 'Select which products to include in this count'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Mode */}
              <div className="space-y-2">
                <Label>Selection Mode</Label>
                <Select value={productSelectionMode} onValueChange={(value: any) => setProductSelectionMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products (Full Inventory Count)</SelectItem>
                    <SelectItem value="category">By Category (Cycle Count)</SelectItem>
                    <SelectItem value="manual">Manual Selection (Specific Products)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Selection - shown when mode is "category" */}
              {productSelectionMode === "category" && (
                <div className="space-y-2">
                  <Label htmlFor="category">Select Category *</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

              {/* Manual Selection - shown when mode is "manual" */}
              {productSelectionMode === "manual" && (
                <div className="space-y-2">
                  <Label htmlFor="product-search">Search Products</Label>
                  <Input
                    id="product-search"
                    placeholder="Search by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
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

              {/* Summary for All/Category modes */}
              {productSelectionMode !== "manual" && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {productSelectionMode === "all" ? (
                      <>
                        <strong>Full inventory count:</strong> All {products.length} products in your inventory will be included in this count.
                      </>
                    ) : selectedCategory ? (
                      <>
                        <strong>Category count:</strong> All products in the "{selectedCategory}" category will be included ({products.filter(p => p.category?.name === selectedCategory).length} products).
                      </>
                    ) : (
                      'Select a category to see how many products will be counted.'
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
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
