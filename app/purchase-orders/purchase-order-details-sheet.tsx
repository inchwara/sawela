"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ReceiptText, Edit, Trash2, Loader2, Package, RotateCcw } from "lucide-react"
import { getPurchaseOrder, PurchaseOrder } from "@/lib/purchaseorders"
import { useToast } from "@/hooks/use-toast"
import { getSuppliers, Supplier } from "@/lib/suppliers"
import { getStores, Store, getStoreById } from "@/lib/stores"
import { getProducts, Product as ProductType, getProductById } from "@/lib/products"
import { formatDate, formatCurrency } from "@/lib/utils"

interface PurchaseOrderDetailsSheetProps {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReceiptClick?: (order: PurchaseOrder) => void
  onReturnClick?: (order: PurchaseOrder) => void
  onEditClick?: (order: PurchaseOrder) => void
}

export function PurchaseOrderDetailsSheet({ orderId, open, onOpenChange, onReceiptClick, onReturnClick, onEditClick }: PurchaseOrderDetailsSheetProps) {
  const { toast } = useToast()
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails()
    } else {
      setOrder(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId])

  async function fetchOrderDetails() {
    if (!orderId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getPurchaseOrder(orderId)
      setOrder(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch purchase order details'))
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to fetch purchase order details',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[800px] max-w-[800px] !w-[800px] !max-w-[800px] flex flex-col h-full"
        style={{ width: 800, maxWidth: 800 }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5" />
            Purchase Order Details
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : order ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{order.order_number}</h2>
                  <Badge className="mt-2">{order.status}</Badge>
                </div>
              </div>
              <Separator />
              {/* PO Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Supplier</div>
                      <div className="font-medium">{order.supplier?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Order Date</div>
                      <div className="font-medium">{formatDate(order.order_date)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Delivery Date</div>
                      <div className="font-medium">{formatDate(order.delivery_date)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Store</div>
                      <div className="font-medium">{order.store?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Currency</div>
                      <div className="font-medium">{order.currency_code}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Discount</div>
                      <div className="font-medium">{order.discount}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left font-semibold">Product</th>
                        <th className="text-left font-semibold">Variant</th>
                        <th className="text-right font-semibold">Unit Price</th>
                        <th className="text-right font-semibold">Ordered</th>
                        <th className="text-right font-semibold">Received</th>
                        <th className="text-right font-semibold">Store</th>
                        <th className="text-right font-semibold">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product?.name || '-'}</td>
                          <td>{item.variant?.name || '-'}</td>
                          <td className="text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">{item.received_quantity ?? 0}</td>
                          <td className="text-right">{item.store?.name || '-'}</td>
                          <td className="text-right">{formatCurrency(item.unit_price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
        {order && (
          <SheetFooter>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (onReceiptClick && order) {
                  onOpenChange(false)
                  onReceiptClick(order)
                }
              }}
            >
              <Package className="h-4 w-4 mr-2" />
              Receipt
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (onReturnClick && order) {
                  onOpenChange(false)
                  onReturnClick(order)
                }
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Return
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (onEditClick && order) {
                  onOpenChange(false)
                  onEditClick(order)
                }
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
} 