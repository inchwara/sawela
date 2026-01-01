"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, UserPlus } from "lucide-react"
import { createPurchaseOrder, CreatePurchaseOrderPayload, PurchaseOrderItem } from "@/lib/purchaseorders"
import { getSuppliers, Supplier } from "@/lib/suppliers"
import { getProducts, Product as BaseProduct } from "@/lib/products"
import { getStores } from "@/lib/stores"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreateSupplierModal } from "@/components/modals/create-supplier-modal"

interface CreatePurchaseOrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPurchaseOrderCreated: () => void
}

// Extend Product type locally to include variants
interface ProductWithVariants extends BaseProduct {
  variants?: any[]
}

export function CreatePurchaseOrderSheet({ open, onOpenChange, onPurchaseOrderCreated }: CreatePurchaseOrderSheetProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  // Remove order_number, currency_code, discount from formData
  const [formData, setFormData] = useState<CreatePurchaseOrderPayload>({
    supplier_id: "",
    order_date: "",
    delivery_date: "",
    store_id: "",
    comments: "",
    items: [],
  })
  // Remove product_name, variant_name, variant_sku from newItem
  const [newItem, setNewItem] = useState({
    product_id: "",
    variant_id: null,
    quantity: 1,
    unit_price: 0,
    store_id: ""
  })

  // State for suppliers and products
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  // Use ProductWithVariants for products state
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [stores, setStores] = useState<any[]>([])
  const [storeId, setStoreId] = useState("")
  const [storeSearch, setStoreSearch] = useState("")
  const [comments, setComments] = useState("")
  const [variantOptions, setVariantOptions] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false)

  // Load suppliers and products when the sheet is opened
  useEffect(() => {
    if (open) {
      fetchSuppliers()
      fetchProducts()
      fetchStores()
    }
  }, [open])

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true)
    try {
      const data = await getSuppliers()
      setSuppliers(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load suppliers. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const handleSupplierCreated = (supplier: Supplier) => {
    // Add the new supplier to the list
    setSuppliers(prev => [...prev, supplier])
    // Set the new supplier as selected
    handleInputChange("supplier_id", supplier.id)
    toast({
      title: "Success",
      description: `Supplier "${supplier.name}" has been added and selected.`
    })
  }

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const { data } = await getProducts(1, 100, { status: "active" })
      setProducts(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingProducts(false)
    }
  }

  const fetchStores = async () => {
    try {
      const data = await getStores()
      setStores(data)
      setStoreId("") // Do not prefill
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load stores.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const payload = {
        supplier_id: formData.supplier_id,
        order_date: formData.order_date,
        delivery_date: formData.delivery_date,
        store_id: storeId || "",
        comments,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          store_id: storeId || "",
        })),
      }
      await createPurchaseOrder(payload)
      toast({
        title: "Success",
        description: "Purchase order created successfully."
      })
      onPurchaseOrderCreated()
      onOpenChange(false)
      setFormData({
        supplier_id: "",
        order_date: "",
        delivery_date: "",
        store_id: "",
        comments: "",
        items: [],
      })
      setComments("")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create purchase order",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreatePurchaseOrderPayload, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleItemInputChange = (field: keyof typeof newItem, value: any) => {
    setNewItem(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddItem = () => {
    // Prevent adding if required fields are missing
    if (!newItem.product_id || (variantOptions.length > 0 && !newItem.variant_id) || !newItem.quantity || !newItem.unit_price || newItem.quantity <= 0 || newItem.unit_price <= 0) {
      toast({
        title: "Error",
        description: "Please select a product, variant (if required), and enter a valid quantity and price.",
        variant: "destructive"
      })
      return
    }
    setFormData(prev => {
      // Check for existing item with same product_id and variant_id
      const existingIdx = prev.items.findIndex(item =>
        item.product_id === newItem.product_id &&
        (item.variant_id || null) === (newItem.variant_id || null)
      )
      if (existingIdx !== -1) {
        // Update quantity of existing item
        const updatedItems = prev.items.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        )
        return { ...prev, items: updatedItems }
      } else {
        // Add as new row
        return { ...prev, items: [...prev.items, { ...newItem, store_id: storeId }] }
      }
    })
    setNewItem({
      product_id: "",
      variant_id: null,
      quantity: 1,
      unit_price: 0,
      store_id: storeId
    })
    setVariantOptions([])
    setSelectedProduct(null)
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
    console.log('Selected product:', product)
    setSelectedProduct(product || null)
    if (product) {
      setNewItem({
        product_id: product.id,
        variant_id: null,
        quantity: 1,
        unit_price: parseFloat(product.price || "0"),
        store_id: storeId
      })
      if (product.has_variations && product.variants && product.variants.length > 0) {
        setVariantOptions(product.variants)
        setShowVariantModal(true)
      } else {
        setVariantOptions([])
        setShowVariantModal(false)
      }
    } else {
      setVariantOptions([])
      setShowVariantModal(false)
    }
  }

  const handleVariantSelectModal = (variant: any) => {
    setNewItem(prev => ({
      ...prev,
      variant_id: variant.id,
      unit_price: parseFloat(variant.price || product.price || "0")
    }))
    setShowVariantModal(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[800px] max-w-[800px] !w-[800px] !max-w-[800px] overflow-y-auto"
        style={{ width: 800, maxWidth: 800 }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Purchase Order
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_id">Supplier *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.supplier_id}
                      onValueChange={(value) => handleInputChange("supplier_id", value)}
                      onOpenChange={() => {
                        if (suppliers.length === 0) {
                          fetchSuppliers()
                        }
                        setSupplierSearch("")
                      }}
                      required
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Search or select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-2">
                          <Input
                            placeholder="Type to search by name, email, or phone"
                            value={supplierSearch}
                            onChange={e => setSupplierSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        {loadingSuppliers ? (
                          <SelectItem value="loading" disabled>
                            Loading suppliers...
                          </SelectItem>
                        ) : suppliers.length > 0 ? (
                          suppliers
                            .filter((supplier) => {
                              const search = supplierSearch.toLowerCase();
                              return (
                                (supplier.name?.toLowerCase() || "").includes(search) ||
                                (supplier.email?.toLowerCase() || "").includes(search) ||
                                (supplier.phone?.toLowerCase() || "").includes(search)
                              );
                            })
                            .map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name} {supplier.phone ? `(${supplier.phone})` : ""} {supplier.email ? `(${supplier.email})` : ""}
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No suppliers found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCreateSupplierModal(true)}
                      title="Add New Supplier"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order_date">Order Date *</Label>
                  <Input
                    id="order_date"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => handleInputChange("order_date", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_date">Delivery Date *</Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => handleInputChange("delivery_date", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_id">Store</Label>
                  <Select
                    value={storeId}
                    onValueChange={setStoreId}
                    onOpenChange={() => setStoreSearch("")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search or select a store (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-2">
                        <Input
                          placeholder="Type to search by name, code, or city"
                          value={storeSearch}
                          onChange={e => setStoreSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {stores.length > 0 ? (
                        stores
                          .filter((store) => {
                            const search = storeSearch.toLowerCase();
                            return (
                              (store.name?.toLowerCase() || "").includes(search) ||
                              (store.store_code?.toLowerCase() || "").includes(search) ||
                              (store.city?.toLowerCase() || "").includes(search)
                            );
                          })
                          .map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name} {store.store_code ? `(${store.store_code})` : ""} {store.city ? `(${store.city})` : ""}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="no-stores" disabled>
                          No stores available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments</Label>
                  <Input
                    id="comments"
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="Add comments (optional)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-6 gap-2 items-end">
                <div className="col-span-2">
                  <Label htmlFor="product">Product *</Label>
                  <Select
                    value={newItem.product_id}
                    onValueChange={handleProductSelect}
                    onOpenChange={() => {
                      if (products.length === 0) {
                        fetchProducts()
                      }
                      setProductSearch("")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search or select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-2">
                        <Input
                          placeholder="Type to search by name, SKU, or description"
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {loadingProducts ? (
                        <SelectItem value="loading" disabled>
                          Loading products...
                        </SelectItem>
                      ) : products.length > 0 ? (
                        products
                          .filter((product) => {
                            const search = productSearch.toLowerCase();
                            return (
                              (product.name?.toLowerCase() || "").includes(search) ||
                              (product.sku?.toLowerCase() || "").includes(search) ||
                              (product.description?.toLowerCase() || "").includes(search)
                            );
                          })
                          .map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} {product.sku ? `(${product.sku})` : ""}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No products found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {/* Remove inline variant dropdown, replaced by modal */}
                <div className="col-span-1">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={isNaN(newItem.unit_price) ? "" : newItem.unit_price}
                    onChange={e => {
                      const val = parseFloat(e.target.value)
                      handleItemInputChange("unit_price", isNaN(val) ? 0 : val)
                    }}
                    disabled={variantOptions.length > 0 && !newItem.variant_id}
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="order_quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={isNaN(newItem.quantity) ? "" : newItem.quantity}
                    onChange={e => {
                      const val = parseInt(e.target.value)
                      handleItemInputChange("quantity", isNaN(val) ? 0 : val)
                    }}
                    disabled={variantOptions.length > 0 && !newItem.variant_id}
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" onClick={handleAddItem} disabled={
                    !newItem.product_id ||
                    (variantOptions.length > 0 && !newItem.variant_id) ||
                    !newItem.quantity ||
                    !newItem.unit_price ||
                    newItem.quantity <= 0 ||
                    newItem.unit_price <= 0
                  }>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
              {/* Variant Selection Modal */}
              <Dialog open={showVariantModal} onOpenChange={setShowVariantModal}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Variant</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {variantOptions.map((variant) => (
                      <Card
                        key={variant.id}
                        className="p-4 cursor-pointer hover:shadow-lg transition flex justify-between items-center"
                        onClick={() => handleVariantSelectModal(variant)}
                      >
                        <div>
                          <div className="font-semibold">{variant.name}</div>
                          <div className="text-gray-500 text-sm">{variant.sku}</div>
                        </div>
                        <div className="font-bold text-primary">KES {(() => {
                          const priceNum = Number(variant.price);
                          return !isNaN(priceNum) && priceNum > 0 ? priceNum.toLocaleString() : "N/A";
                        })()}</div>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <div className="mt-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-semibold">Product</th>
                      <th className="text-left font-semibold">Variant</th>
                      <th className="text-right font-semibold">Price</th>
                      <th className="text-right font-semibold">Quantity</th>
                      <th className="text-right font-semibold">Line Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => {
                      const product = products.find(p => p.id === item.product_id)
                      let variantName = "-"
                      if (item.variant_id && product && product.variants) {
                        const variant = product.variants.find((v: any) => v.id === item.variant_id)
                        if (variant) variantName = `${variant.name}${variant.sku ? ` (${variant.sku})` : ''}`
                      }
                      return (
                        <tr key={idx}>
                          <td>{product ? product.name : item.product_id}</td>
                          <td>{variantName}</td>
                          <td className="text-right">{item.unit_price}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">{item.unit_price * item.quantity}</td>
                          <td>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveItem(idx)}>
                              Remove
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Separator />
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>

      {/* Create Supplier Modal */}
      <CreateSupplierModal
        open={showCreateSupplierModal}
        onOpenChange={setShowCreateSupplierModal}
        onSupplierCreated={handleSupplierCreated}
      />
    </Sheet>
  )
} 