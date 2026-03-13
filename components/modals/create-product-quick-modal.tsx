"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, PlusCircle, X } from "lucide-react"
import { createProduct } from "@/app/inventory/actions"
import { getCachedStores, createStore, type Store } from "@/lib/stores"
import { getProductCategories, createProductCategory, type ProductCategory } from "@/lib/product-categories"

interface CreateProductQuickModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateProductQuickModal({ isOpen, onClose, onSuccess }: CreateProductQuickModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [selectedStoreId, setSelectedStoreId] = useState("")

  const [stores, setStores] = useState<Store[]>([])
  const [isLoadingStores, setIsLoadingStores] = useState(false)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  // Inline category creation
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  // Inline store creation
  const [showCreateStore, setShowCreateStore] = useState(false)
  const [newStoreName, setNewStoreName] = useState("")
  const [isCreatingStore, setIsCreatingStore] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadStores()
      loadCategories()
    }
  }, [isOpen])

  const loadStores = async () => {
    setIsLoadingStores(true)
    try {
      const data = await getCachedStores()
      setStores(data)
      if (data.length > 0 && !selectedStoreId) {
        setSelectedStoreId(data[0].id)
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load stores")
    } finally {
      setIsLoadingStores(false)
    }
  }

  const loadCategories = async () => {
    setIsLoadingCategories(true)
    try {
      const data = await getProductCategories()
      setCategories(data)
    } catch (error: any) {
      toast.error(error.message || "Failed to load categories")
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setIsCreatingCategory(true)
    try {
      const result = await createProductCategory({ name: newCategoryName.trim() })
      if (result.success && result.category) {
        setCategories((prev) => [result.category!, ...prev])
        setCategoryId(result.category.id)
        toast.success("Category created.")
        setShowCreateCategory(false)
        setNewCategoryName("")
      } else {
        toast.error(result.message || "Failed to create category")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create category")
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return
    setIsCreatingStore(true)
    try {
      const result = await createStore({ name: newStoreName.trim(), is_active: true })
      if (result.success && result.store) {
        setStores((prev) => [...prev, result.store!])
        setSelectedStoreId(result.store.id)
        toast.success("Store created.")
        setShowCreateStore(false)
        setNewStoreName("")
      } else {
        toast.error(result.message || "Failed to create store")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create store")
    } finally {
      setIsCreatingStore(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Product name is required")
      return
    }
    if (!selectedStoreId) {
      toast.error("Please select a store")
      return
    }

    setIsLoading(true)
    try {
      const result = await createProduct({
        name: name.trim(),
        category_id: categoryId || undefined,
        store_id: selectedStoreId,
        price: 0,
        cost: 0,
        stock: 0,
        lowStockThreshold: 0,
        trackInventory: true,
        isActive: true,
        tags: [],
        images: [],
        primaryImageIndex: 0,
        hasVariations: false,
        variants: [],
        dimensions: { length: "", width: "", height: "" },
      })

      if (result.success) {
        toast.success("Product created successfully.")
        resetForm()
        onClose()
        onSuccess?.()
      } else {
        toast.error(result.message || "Failed to create product")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create product")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setName("")
    setCategoryId("")
    setSelectedStoreId("")
    setShowCreateCategory(false)
    setShowCreateStore(false)
    setNewCategoryName("")
    setNewStoreName("")
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    if (open) {
      // handled by useEffect
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="quickProductName">Product Name <span className="text-destructive">*</span></Label>
            <Input
              id="quickProductName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              disabled={isLoading}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            {showCreateCategory ? (
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  disabled={isCreatingCategory}
                />
                <Button size="sm" onClick={handleCreateCategory} disabled={isCreatingCategory || !newCategoryName.trim()}>
                  {isCreatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowCreateCategory(false); setNewCategoryName("") }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
                disabled={isLoadingCategories || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select category (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-left text-sm"
                    onClick={() => setShowCreateCategory(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" /> Create Category
                  </Button>
                  <div className="border-t my-1" />
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: cat.color || '#6B7280' }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Store */}
          <div className="space-y-2">
            <Label>Store <span className="text-destructive">*</span></Label>
            {showCreateStore ? (
              <div className="flex gap-2">
                <Input
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="New store name"
                  disabled={isCreatingStore}
                />
                <Button size="sm" onClick={handleCreateStore} disabled={isCreatingStore || !newStoreName.trim()}>
                  {isCreatingStore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowCreateStore(false); setNewStoreName("") }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Select
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
                disabled={isLoadingStores || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingStores ? "Loading..." : "Select a store"} />
                </SelectTrigger>
                <SelectContent>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-left text-sm"
                    onClick={() => setShowCreateStore(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" /> Create Store
                  </Button>
                  <div className="border-t my-1" />
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
