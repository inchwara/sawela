"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Edit } from "lucide-react"
import { updatePurchaseOrder, PurchaseOrder, PurchaseOrderItem, UpdatePurchaseOrderPayload } from "@/lib/purchaseorders"
import { useToast } from "@/hooks/use-toast"
import { getSuppliers, Supplier } from "@/lib/suppliers"
import { getStores, Store } from "@/lib/stores"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getProducts, Product as ProductType } from "@/lib/products"
import { formatCurrency } from "@/lib/utils"

interface EditPurchaseOrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PurchaseOrder | null
  onPurchaseOrderUpdated: () => void
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState("")
  const [comments, setComments] = useState("")
  // No need for products state for displaying names

  useEffect(() => {
    if (order) {
      setFormData({
        id: order.id,
        order_number: order.order_number,
        supplier_id: order.supplier_id,
        discount: order.discount ?? 0,
        order_date: order.order_date,
        delivery_date: order.delivery_date,
        currency_code: order.currency_code ?? '',
        status: order.status,
        items: order.items || [],
      })
      setComments(order.comments || "")
      setStoreId(order.store_id)
    }
    fetchStores()
  }, [order])

  const fetchStores = async () => {
    try {
      const data = await getStores()
      setStores(data)
      if (!storeId && data.length > 0) setStoreId(data[0].id)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load stores.",
        variant: "destructive",
      })
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

  const handleAddItem = () => {
    if (!newItem.product_id) return
    setFormData(prev => prev ? ({
      ...prev,
      items: [...(prev.items || []), {
        product_id: newItem.product_id,
        variant_id: newItem.variant_id,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
        store_id: storeId,
        received_quantity: 0 // default if needed
      }]
    }) : null)
    setNewItem({
      product_id: '',
      variant_id: null,
      quantity: 1 as number,
      unit_price: 0,
      store_id: storeId
    })
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
        className="w-[800px] max-w-[800px] !w-[800px] !max-w-[800px] overflow-y-auto"
        style={{ width: 800, maxWidth: 800 }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Purchase Order
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
                  <div className="font-medium">{order?.supplier?.name || '-'}</div>
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
                  <div className="font-medium">{order?.store?.name || '-'}</div>
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
                <div className="col-span-1">
                  <Label htmlFor="product_id">Product ID</Label>
                  <Input
                    id="product_id"
                    value={String(product_id)}
                    onChange={(e) => handleItemInputChange("product_id", e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="variant_id">Variant ID</Label>
                  <Input
                    id="variant_id"
                    value={newItem.variant_id || ""}
                    onChange={(e) => handleItemInputChange("variant_id", e.target.value ? parseInt(e.target.value) : null)}
                  />
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
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" onClick={handleAddItem} className="w-full">
                    Add Item
                  </Button>
                </div>
              </div>
              <Separator />
              <div>
                {(formData.items || []).length === 0 && <div className="text-sm text-muted-foreground">No items added.</div>}
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Variant</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Store</th>
                      <th>Line Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.product?.name || '-'}</td>
                        <td>{item.variant?.name || '-'}</td>
                        <td>{item.quantity ?? 0}</td>
                        <td>{formatCurrency(item.unit_price ?? 0)}</td>
                        <td>{item.store?.name || '-'}</td>
                        <td>{formatCurrency((item.unit_price ?? 0) * (item.quantity ?? 0))}</td>
                        <td>
                          <Button type="button" size="sm" variant="destructive" onClick={() => handleRemoveItem(idx)}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              Update Purchase Order
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
} 