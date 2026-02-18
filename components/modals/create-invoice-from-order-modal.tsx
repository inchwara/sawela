"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createInvoiceFromOrder, CreateInvoiceFromOrderRequest } from "@/lib/invoices"
import { fetchOrders, fetchOrderById, Order, OrderDetail } from "@/lib/orders"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/utils"

const invoiceFromOrderSchema = z.object({
  order_id: z.string().min(1, "Order is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
})

type InvoiceFromOrderFormData = z.infer<typeof invoiceFromOrderSchema>

interface CreateInvoiceFromOrderModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateInvoiceFromOrderModal({ open, onClose, onSuccess }: CreateInvoiceFromOrderModalProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  

  const form = useForm<InvoiceFromOrderFormData>({
    resolver: zodResolver(invoiceFromOrderSchema),
    defaultValues: {
      order_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      payment_terms: 'Net 30',
      notes: '',
    }
  })

  // Load orders when modal opens
  useEffect(() => {
    if (open) {
      loadOrders()
      // Reset form when modal opens
      form.reset({
        order_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_terms: 'Net 30',
        notes: '',
      })
      setSelectedOrder(null)
    }
  }, [open, form])

  const loadOrders = async () => {
    try {
      const ordersData = await fetchOrders()
      
      // Filter orders that can be invoiced (completed/confirmed orders that haven't been invoiced yet)
      const availableOrders = ordersData.filter((order: Order) => {
        const isValidStatus = order.status.toLowerCase() === 'completed' || 
                             order.status.toLowerCase() === 'confirmed'
        const hasCustomer = order.customer_id && order.customer
        const hasValidAmount = order.final_amount || order.total_amount
        
        return isValidStatus && hasCustomer && hasValidAmount
      })
      
      setOrders(availableOrders)
      
      if (availableOrders.length === 0) {
        toast.error("No completed or confirmed orders are available for invoicing.")
      }
    } catch (error) {
      toast.error("Failed to load orders")
    }
  }

  // Watch for order selection changes
  const watchedOrderId = form.watch('order_id')
  useEffect(() => {
    if (watchedOrderId) {
      const order = orders.find(o => o.id === watchedOrderId)
      setSelectedOrder(order || null)
    } else {
      setSelectedOrder(null)
    }
  }, [watchedOrderId, orders])

  const onSubmit: SubmitHandler<InvoiceFromOrderFormData> = async (data) => {
    // Prevent submission if no valid order is selected
    if (!data.order_id || data.order_id === 'no-orders') {
      toast.error("Please select a valid order to create an invoice")
      return
    }

    // Validate that the selected order exists and has required data
    const selectedOrderData = orders.find(o => o.id === data.order_id)
    if (!selectedOrderData) {
      toast.error("Selected order not found. Please refresh and try again.")
      return
    }

    // Check if order has customer information
    if (!selectedOrderData.customer_id && !selectedOrderData.customer) {
      toast.error("Selected order is missing customer information required for invoice creation.")
      return
    }

    try {
      setIsLoading(true)
      
      // Prepare simplified invoice data for the new API
      // The backend will handle all line item conversion automatically
      const invoiceData = {
        invoice_date: data.invoice_date,
        due_date: data.due_date,
        payment_terms: data.payment_terms || 'Net 30',
        notes: data.notes || '',
      }

      const result = await createInvoiceFromOrder(data.order_id, invoiceData)
      
      toast.success("Invoice created from order successfully")
      
      // Dispatch event for automatic cache refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('invoice-created', { 
          detail: { invoiceId: result?.id, timestamp: Date.now() } 
        }))
      }
      
      form.reset()
      setSelectedOrder(null)
      onSuccess()
    } catch (error: any) {
      // Extract the API error message directly
      let errorMessage = "Failed to create invoice from order"
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // Show the API error message directly
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getOrderStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Invoice from Order</SheetTitle>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="order_id">Select Order</Label>
              <Select 
                value={form.watch('order_id')} 
                onValueChange={(value) => form.setValue('order_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an order to invoice" />
                </SelectTrigger>
                <SelectContent>
                  {orders.length === 0 ? (
                    <SelectItem value="no-orders" disabled>No available orders</SelectItem>
                  ) : (
                    orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{order.order_number}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {order.customer?.name} - {formatCurrency(parseFloat(order.final_amount || order.total_amount))}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.order_id && (
                <p className="text-sm text-red-600">{form.formState.errors.order_id.message}</p>
              )}
            </div>

            {/* Selected Order Preview */}
            {selectedOrder && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Order Number</Label>
                      <p className="text-sm">{selectedOrder.order_number}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge className={getOrderStatusColor(selectedOrder.status)}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Customer</Label>
                      <p className="text-sm">{selectedOrder.customer?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Order Date</Label>
                      <p className="text-sm">{formatDate(selectedOrder.created_at)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Amount</Label>
                      <p className="text-sm font-bold">
                        {formatCurrency(parseFloat(selectedOrder.final_amount || selectedOrder.total_amount))}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Payment Status</Label>
                      <p className="text-sm">{selectedOrder.payment_status || 'Pending'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                type="date"
                {...form.register('invoice_date')}
              />
              {form.formState.errors.invoice_date && (
                <p className="text-sm text-red-600">{form.formState.errors.invoice_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                type="date"
                {...form.register('due_date')}
              />
              {form.formState.errors.due_date && (
                <p className="text-sm text-red-600">{form.formState.errors.due_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Input
              placeholder="e.g., Net 30, Due on receipt"
              {...form.register('payment_terms')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              placeholder="Additional notes for the invoice"
              {...form.register('notes')}
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !selectedOrder}
            >
              {isLoading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
