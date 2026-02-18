"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { rejectStockAdjustmentAction } from "../actions"
import type { StockAdjustment } from "@/lib/stock-adjustments"

interface RejectAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adjustment: StockAdjustment
  onSuccess: () => void
}

export function RejectAdjustmentDialog({
  open,
  onOpenChange,
  adjustment,
  onSuccess,
}: RejectAdjustmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await rejectStockAdjustmentAction(adjustment.id, rejectionReason)

      if (result.success) {
        toast.success("Stock adjustment rejected successfully")
        onOpenChange(false)
        setRejectionReason("")
        onSuccess()
      } else {
        throw new Error(result.message || "Failed to reject adjustment")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reject adjustment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Stock Adjustment</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to reject this stock adjustment?</p>
            <div className="mt-4 p-3 bg-muted rounded-md space-y-1 text-sm">
              <p><strong>Adjustment #:</strong> {adjustment.adjustment_number}</p>
              <p><strong>Product:</strong> {adjustment.product.name}</p>
              <p><strong>Quantity:</strong> {adjustment.quantity_adjusted > 0 ? '+' : ''}{adjustment.quantity_adjusted}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="rejection-reason">Rejection Reason *</Label>
          <Textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Provide a reason for rejecting this adjustment"
            rows={3}
            required
          />
        </div>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setRejectionReason("")
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
