"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Package } from "lucide-react"
import { receiptPurchaseOrder, PurchaseOrder, PurchaseOrderItem } from "@/lib/purchaseorders"
import { toast } from "sonner"
import { getSuppliers, Supplier } from "@/lib/suppliers"
import { getStores, Store } from "@/lib/stores"
import { getProducts, Product as ProductType } from "@/lib/products"
import { formatCurrency } from "@/lib/utils"

interface ReceiptPurchaseOrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PurchaseOrder | null
  onPurchaseOrderReceipted: () => void
}

interface ReceiptItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  received_quantity: number
  variant_id: string | null
}

export function ReceiptPurchaseOrderSheet({ open, onOpenChange, order, onPurchaseOrderReceipted }: ReceiptPurchaseOrderSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])

  useEffect(() => {
    if (order) {
      setReceiptItems(order.items.map(item => ({
        id: item.id || "",
        product_id: item.product_id || "",
        quantity: item.quantity,
        unit_price: item.unit_price,
        received_quantity: 0,
        variant_id: item.variant_id || null
      })))
    }
  }, [order])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (!order) return
      await receiptPurchaseOrder(order.id, {
        items: receiptItems.map(item => ({
          id: item.id,
          received_quantity: item.received_quantity
        }))
      })
      toast.success("Purchase order receipted successfully.")
      onPurchaseOrderReceipted()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to receipt purchase order")
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuantityChange = (index: number, value: number) => {
    setReceiptItems(prev => prev.map((item, i) => 
      i === index ? { ...item, received_quantity: value } : item
    ))
  }

  const getTotalReceived = () => {
    return receiptItems.reduce((sum, item) => sum + item.received_quantity, 0)
  }

  const getTotalOrdered = () => {
    return receiptItems.reduce((sum, item) => sum + item.quantity, 0)
  }

  const isPartialReceipt = () => {
    const totalReceived = getTotalReceived()
    const totalOrdered = getTotalOrdered()
    return totalReceived > 0 && totalReceived < totalOrdered
  }

  const isFullReceipt = () => {
    const totalReceived = getTotalReceived()
    const totalOrdered = getTotalOrdered()
    return totalReceived === totalOrdered
  }

  if (!order) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[800px] max-w-[800px] !w-[800px] !max-w-[800px] overflow-y-auto"
        style={{ width: 800, maxWidth: 800 }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Receipt Purchase Order
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order Number</Label>
                  <div className="text-sm font-medium">{order.order_number}</div>
                </div>
                <div>
                  <Label>Supplier</Label>
                  <div className="text-sm font-medium">{order.supplier?.name || '-'}</div>
                </div>
                <div>
                  <Label>Order Date</Label>
                  <div className="text-sm font-medium">{order.order_date}</div>
                </div>
                <div>
                  <Label>Delivery Date</Label>
                  <div className="text-sm font-medium">{order.delivery_date}</div>
                </div>
                <div>
                  <Label>Store</Label>
                  <div className="text-sm font-medium">{order.store?.name || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Receipt Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {receiptItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-6 gap-4 items-center p-4 border rounded-lg">
                    <div className="col-span-2">
                      <Label>Product</Label>
                      <div className="text-sm font-medium">{order.items[index]?.product?.name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{order.items[index]?.variant?.name || '-'}</div>
                    </div>
                    <div>
                      <Label>Ordered Qty</Label>
                      <div className="text-sm font-medium">{item.quantity}</div>
                    </div>
                    <div>
                      <Label>Price</Label>
                      <div className="text-sm font-medium">{formatCurrency(item.unit_price)}</div>
                    </div>
                    <div>
                      <Label htmlFor={`received-${index}`}>Received Qty *</Label>
                      <Input
                        id={`received-${index}`}
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={item.received_quantity}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <div className="text-sm font-medium">{formatCurrency(item.received_quantity * item.unit_price)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">Total Ordered: {getTotalOrdered()}</div>
                  <div className="text-sm text-muted-foreground">Total Received: {getTotalReceived()}</div>
                </div>
                <div className="text-right">
                  {isFullReceipt() && (
                    <div className="text-sm text-green-600 font-medium">Full Receipt</div>
                  )}
                  {isPartialReceipt() && (
                    <div className="text-sm text-orange-600 font-medium">Partial Receipt</div>
                  )}
                  {getTotalReceived() === 0 && (
                    <div className="text-sm text-primary font-medium">No Items Receipted</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || getTotalReceived() === 0}>
              {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Package className="h-4 w-4 mr-2" />}
              {isFullReceipt() ? "Complete Receipt" : "Partial Receipt"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
} 