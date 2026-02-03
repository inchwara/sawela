"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Edit, Plus, UserPlus } from "lucide-react"
import { updatePurchaseOrder, PurchaseOrder, PurchaseOrderItem, UpdatePurchaseOrderPayload } from "@/lib/purchaseorders"
import { useToast } from "@/hooks/use-toast"
import { getSuppliers, Supplier } from "@/lib/suppliers"
import { getStores, Store } from "@/lib/stores"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getProducts, Product as BaseProduct } from "@/lib/products"
import { formatCurrency } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface EditPurchaseOrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PurchaseOrder | null
  onPurchaseOrderUpdated: () => void
}

// Extend Product type locally to include variants
interface ProductWithVariants extends Omit<BaseProduct, 'variants'> {
  variants?: any[]
}

export function EditPurchaseOrderSheet({ open, onOpenChange, order, onPurchaseOrderUpdated }: EditPurchaseOrderSheetProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<{
    id: string
    order_number: string
    supplier_id: string
    discount: number
    order_date: string
    delivery_date: string
    currency_code: string
    status: string
    items: PurchaseOrderItem[]
  } | null>(null)
  
  const [newItem, setNewItem] = useState({
    product_id: '',
    variant_id: null,
    quantity: 1 as number,
    unit_price: 0,
    store_id: ''
  })

  // Resource states
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  
  // Loading states
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  
  // Search states
  const [supplierSearch, setSupplierSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [storeSearch, setStoreSearch] = useState("")
  
  // UI states
  const [storeId, setStoreId] = useState("")
  const [comments, setComments] = useState("")
  const [variantOptions, setVariantOptions] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showVariantModal, setShowVariantModal] = useState(false)

  useEffect(() => {
    if (open && order) {
      // Initialize form data
      setFormData({
        id: order.id,
        order_number: order.order_number,
        supplier_id: order.supplier_id,
        discount: order.discount ?? 0,
        order_date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : '',
        delivery_date: order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '',
        currency_code: order.currency_code ?? 'KES',
        status: order.status,
        items: order.items || [],
      })
      setComments(order.comments || "")
      setStoreId(order.store_id || "")

      // Fetch resources
      fetchSuppliers()
      fetchStores()
      fetchProducts()
    }
  }, [open, order])

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true)
    try {
      const data = await getSuppliers()
      setSuppliers(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load suppliers.",
        variant: "destructive",
      })
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const fetchStores = async () => {
    try {
      const data = await getStores()
      setStores(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load stores.",
        variant: "destructive",
      })
    }
  }

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const { data } = await getProducts(1, 10000, { status: "active" }) // Fetch all active products
      setProducts(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products.",
        variant: "destructive",
      })
    } finally {
      setLoadingProducts(false)
    }
  }

  if (!formData) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (!formData) return
      const payload = {
        supplier_id: formData.supplier_id,
        order_date: formData.order_date,
        delivery_date: formData.delivery_date,
        store_id: storeId,
        status: formData.status,
        comments,
        items: (formData.items || []).map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          store_id: storeId,
        })),
      }
      await updatePurchaseOrder(formData.id, payload)
      toast({
        title: "Success",
        description: "Purchase order updated successfully."
      })
      onPurchaseOrderUpdated()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update purchase order",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => prev ? ({
      ...prev,
      [field]: value
    }) : null)
  }

  const handleItemInputChange = (field: string, value: any) => {
    setNewItem(prev => ({
      ...prev,
      [field]: field === "quantity" ? (isNaN(Number(value)) ? 0 : Number(value)) : value || ""
    }))
  }

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
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
      unit_price: parseFloat(variant.price || selectedProduct?.price || "0")
    }))
    setShowVariantModal(false)
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
      if (!prev) return null
      // Check for existing item with same product_id and variant_id
      const existingIdx = (prev.items || []).findIndex(item =>
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
        return { 
          ...prev, 
          items: [...(prev.items || []), { 
            product_id: newItem.product_id,
            variant_id: newItem.variant_id || null,
            quantity: newItem.quantity,
            unit_price: newItem.unit_price,
            store_id: storeId,
            received_quantity: 0
          } as PurchaseOrderItem] 
        }
      }
    })
    
    // Reset item form
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
    setFormData(prev => prev ? ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index)
    }) : null)
  }

  const { quantity = 1, product_id = '' } = newItem;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[800px] max-w-[800px] !w-[800px] !max-w-[800px] flex flex-col h-full"
        style={{ width: 800, maxWidth: 800 }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Purchase Order
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-6">
        <form id="edit-po-form" onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order_number">Order Number *</Label>
                  <Input
                    id="order_number"
                    value={formData.order_number}
                    onChange={(e) => handleInputChange("order_number", e.target.value)}
                    placeholder="Enter order number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_id">Supplier</Label>
                  <Select
                      value={formData.supplier_id}
                      onValueChange={(value) => handleInputChange("supplier_id", value)}
                      onOpenChange={() => {
                        if (suppliers.length === 0) fetchSuppliers()
                        setSupplierSearch("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-2">
                          <Input
                            placeholder="Search suppliers..."
                            value={supplierSearch}
                            onChange={e => setSupplierSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        {loadingSuppliers ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : suppliers.length > 0 ? (
                          suppliers
                            .filter(s => (s.name?.toLowerCase() || "").includes(supplierSearch.toLowerCase()))
                            .map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))
                        ) : (
                          <SelectItem value="none" disabled>No suppliers found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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
                  <Label htmlFor="currency_code">Currency *</Label>
                  <Input
                    id="currency_code"
                    value={formData.currency_code}
                    onChange={(e) => handleInputChange("currency_code", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={formData.discount}
                    onChange={(e) => handleInputChange("discount", parseFloat(e.target.value))}
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
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-2">
                        <Input
                          placeholder="Search stores..."
                          value={storeSearch}
                          onChange={e => setStoreSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {stores.length > 0 ? (
                        stores
                          .filter(s => (s.name?.toLowerCase() || "").includes(storeSearch.toLowerCase()))
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                      ) : (
                        <SelectItem value="none" disabled>No stores found</SelectItem>
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
                  <Label htmlFor="product_id">Product</Label>
                  <Select
                    value={newItem.product_id}
                    onValueChange={handleProductSelect}
                    onOpenChange={() => {
                      if (products.length === 0) fetchProducts()
                      setProductSearch("")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-2">
                        <Input
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {loadingProducts ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : products.length > 0 ? (
                        products
                          .filter(p => (p.name?.toLowerCase() || "").includes(productSearch.toLowerCase()))
                          .map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</SelectItem>
                          ))
                      ) : (
                        <SelectItem value="none" disabled>No products found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                    {/* Variant handled by modal */}
                   <Label>Variant</Label>
                   <div className="text-sm py-2 px-3 border rounded-md bg-muted text-muted-foreground h-10 flex items-center">
                     {newItem.variant_id 
                       ? variantOptions.find(v => v.id === newItem.variant_id)?.name || 'Selected' 
                       : '-'}
                   </div>
                </div>
                <div className="col-span-1">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={Number(quantity)}
                    onChange={e => {
                      const val = parseInt(e.target.value)
                      handleItemInputChange("quantity", isNaN(val) ? 0 : val)
                    }}
                    disabled={variantOptions.length > 0 && !newItem.variant_id}
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="unit_price">Unit Price</Label>
                  <Input
                    id="unit_price"
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
                  <Button type="button" onClick={handleAddItem} className="w-full" disabled={
                    !newItem.product_id ||
                    (variantOptions.length > 0 && !newItem.variant_id) ||
                    !newItem.quantity ||
                    !newItem.unit_price
                  }>
                    <Plus className="h-4 w-4" /> Add
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

              <Separator />
              <div>
                {(formData.items || []).length === 0 && <div className="text-sm text-muted-foreground">No items added.</div>}
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Product</th>
                      <th className="text-left py-2">Variant</th>
                      <th className="text-right py-2">Quantity</th>
                      <th className="text-right py-2">Unit Price</th>
                      <th className="text-right py-2">Line Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.items || []).map((item, idx) => {
                        const product = products.find(p => p.id === item.product_id)
                        let variantName = "-"
                        if (item.variant_id && product && product.variants) {
                            const variant = product.variants.find((v: any) => v.id === item.variant_id)
                            if (variant) variantName = `${variant.name}${variant.sku ? ` (${variant.sku})` : ''}`
                        }
                        return (
                          <tr key={idx} className="border-b">
                            <td className="py-2">{item.product ? item.product.name : (product?.name || item.product_id)}</td>
                            <td className="py-2">{item.variant ? item.variant.name : variantName}</td>
                            <td className="text-right py-2">{item.quantity}</td>
                            <td className="text-right py-2">{formatCurrency(item.unit_price)}</td>
                            <td className="text-right py-2">{formatCurrency(item.unit_price * item.quantity)}</td>
                            <td className="text-right py-2">
                              <Button type="button" size="sm" variant="destructive" onClick={() => handleRemoveItem(idx)}>
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
        </form>
        </div>
        <SheetFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
            </Button>
            <Button type="submit" form="edit-po-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              Update Purchase Order
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 