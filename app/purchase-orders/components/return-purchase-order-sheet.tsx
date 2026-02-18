"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, RotateCcw } from "lucide-react"
import { returnPurchaseOrder, PurchaseOrder, PurchaseOrderItem } from "@/lib/purchaseorders"
import { toast } from "sonner"
import { getSuppliers, Supplier } from "@/lib/suppliers"
import { getStores, Store } from "@/lib/stores"
import { getProducts, Product as ProductType } from "@/lib/products"
import { formatCurrency } from "@/lib/utils"

interface ReturnPurchaseOrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PurchaseOrder | null
  onPurchaseOrderReturned: () => void
}

interface ReturnItem {
  product_id: string
  variant_id: string | null
  received_quantity: number
  returned_quantity: number
  price: number
}

export function ReturnPurchaseOrderSheet({ open, onOpenChange, order, onPurchaseOrderReturned }: ReturnPurchaseOrderSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [returnReason, setReturnReason] = useState("")

  useEffect(() => {
    if (order && order.items) {
      setReturnItems(order.items.map(item => ({
        product_id: item.product_id || "",
        variant_id: item.variant_id || null,
        received_quantity: item.received_quantity || 0,
        returned_quantity: 0,
        price: item.unit_price // use unit_price if price is not present
      })))
    }
  }, [order])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (!order) return
      
      await returnPurchaseOrder(order.id, {
        items: returnItems.map(item => ({
          id: item.product_id,
          returned_quantity: item.returned_quantity
        })),
        reason: returnReason
      })
      
      toast.success("Purchase order return processed successfully.")
      onPurchaseOrderReturned()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process return")
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuantityChange = (index: number, value: number) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === index ? { ...item, returned_quantity: value } : item
    ))
  }

  const getTotalReturned = () => {
    return returnItems.reduce((sum, item) => sum + item.returned_quantity, 0)
  }

  const getTotalReceived = () => {
    return returnItems.reduce((sum, item) => sum + item.received_quantity, 0)
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
            <RotateCcw className="h-5 w-5" />
            Return Purchase Order
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
              <CardTitle>Return Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {returnItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-6 gap-4 items-center p-4 border rounded-lg">
                    <div className="col-span-2">
                      <Label>Product</Label>
                      <div className="text-sm font-medium">{order.items[index]?.product?.name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{order.items[index]?.variant?.name || '-'}</div>
                    </div>
                    <div>
                      <Label>Received Qty</Label>
                      <div className="text-sm font-medium">{item.received_quantity}</div>
                    </div>
                    <div>
                      <Label>Price</Label>
                      <div className="text-sm font-medium">{formatCurrency(item.price)}</div>
                    </div>
                    <div>
                      <Label htmlFor={`returned-${index}`}>Return Qty *</Label>
                      <Input
                        id={`returned-${index}`}
                        type="number"
                        min="0"
                        max={item.received_quantity}
                        value={item.returned_quantity}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <div className="text-sm font-medium">{formatCurrency(item.returned_quantity * item.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">Total Received: {getTotalReceived()}</div>
                  <div className="text-sm text-muted-foreground">Total Returned: {getTotalReturned()}</div>
                </div>
                <div className="text-right">
                  {getTotalReturned() === 0 && (
                    <div className="text-sm text-primary font-medium">No Items Returned</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Return Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter the reason for the return..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || getTotalReturned() === 0}>
              {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Process Return
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
} 