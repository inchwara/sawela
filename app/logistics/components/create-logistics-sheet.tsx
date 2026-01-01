"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { fetchOrders, Order } from "@/lib/orders"
import { createLogistics, CreateLogisticsData } from "@/lib/logistics"

interface CreateLogisticsSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onLogisticsCreated: () => void
}

export function CreateLogisticsSheet({ isOpen, onOpenChange, onLogisticsCreated }: CreateLogisticsSheetProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<CreateLogisticsData>>({
    order_id: "",
    delivery_address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    delivery_status: "pending",
    delivery_method: "Standard",
    tracking_number: "",
    estimated_delivery_time: "",
    notes: "",
  })

  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const loadOrders = async () => {
    setLoadingOrders(true)
    try {
      const fetchedOrders = await fetchOrders()
      setOrders(fetchedOrders)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load orders.",
        variant: "destructive",
      })
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    if (isOpen && orders.length === 0) {
      loadOrders()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const selectedOrder = orders.find((o) => o.id === formData.order_id)
    if (!selectedOrder) {
      toast({ title: "Error", description: "Please select a valid order.", variant: "destructive" })
      setLoading(false)
      return
    }

    const logisticsData: CreateLogisticsData = {
      order_id: formData.order_id!,
      delivery_address: formData.delivery_address!,
      delivery_status: formData.delivery_status!,
      tracking_number: formData.tracking_number || `TRK-${Date.now()}`,
      notes: formData.notes,
      delivery_method: formData.delivery_method!,
      recipient_name: selectedOrder.customer?.name || "N/A",
      recipient_phone: selectedOrder.customer?.phone || "N/A",
      city: formData.city,
      state: formData.state,
      country: formData.country,
      postal_code: formData.postal_code,
      estimated_delivery_time: formData.estimated_delivery_time ? new Date(formData.estimated_delivery_time).toISOString() : null,
      dispatch_time: new Date().toISOString(),
    }

    try {
      await createLogistics(logisticsData)

      toast({
        title: "Success",
        description: "Logistics entry created successfully",
      })

      onLogisticsCreated()
      onOpenChange(false)

      // Reset form
      setFormData({
        order_id: "",
        delivery_address: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        delivery_status: "pending",
        delivery_method: "Standard",
        tracking_number: "",
        estimated_delivery_time: "",
        notes: "",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create logistics entry",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Delivery</SheetTitle>
          <SheetDescription>Create a new delivery entry for an order. Fill in the details below.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="order_id">Order</Label>
            <Select
              value={formData.order_id}
              onValueChange={(value) => handleSelectChange("order_id", value)}
              onOpenChange={() => {
                if (orders.length === 0) {
                  loadOrders()
                }
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an order" />
              </SelectTrigger>
              <SelectContent>
                {loadingOrders ? (
                  <SelectItem value="loading" disabled>
                    Loading orders...
                  </SelectItem>
                ) : orders.length > 0 ? (
                  orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_number} - {order.customer?.name || "Unknown Customer"}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No orders found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_address">Delivery Address</Label>
            <Input
              id="delivery_address"
              name="delivery_address"
              value={formData.delivery_address || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" value={formData.city || ''} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" value={formData.state || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                name="postal_code"
                value={formData.postal_code || ''}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" value={formData.country || ''} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_status">Status</Label>
              <Select
                value={formData.delivery_status}
                onValueChange={(value) => handleSelectChange("delivery_status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_method">Delivery Method</Label>
              <Select
                value={formData.delivery_method}
                onValueChange={(value) => handleSelectChange("delivery_method", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Express">Express</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking_number">Tracking Number</Label>
            <Input
              id="tracking_number"
              name="tracking_number"
              value={formData.tracking_number || ''}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated_delivery_time">Estimated Delivery Date</Label>
            <Input
              id="estimated_delivery_time"
              name="estimated_delivery_time"
              type="date"
              value={formData.estimated_delivery_time || ''}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} />
          </div>

          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#1E2764] hover:bg-[#1E2764]/90" disabled={loading}>
              {loading ? "Creating..." : "Create Delivery"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
