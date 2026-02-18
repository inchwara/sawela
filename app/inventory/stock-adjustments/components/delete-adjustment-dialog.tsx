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
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { deleteStockAdjustmentAction } from "../actions"
import type { StockAdjustment } from "@/lib/stock-adjustments"

interface DeleteAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adjustment: StockAdjustment
  onSuccess: () => void
}

export function DeleteAdjustmentDialog({
  open,
  onOpenChange,
  adjustment,
  onSuccess,
}: DeleteAdjustmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDelete = async () => {
    setIsSubmitting(true)

    try {
      const result = await deleteStockAdjustmentAction(adjustment.id)

      if (result.success) {
        toast.success("Stock adjustment deleted successfully")
        onOpenChange(false)
        onSuccess()
      } else {
        throw new Error(result.message || "Failed to delete adjustment")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete adjustment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Stock Adjustment</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete this stock adjustment? This action cannot be undone.</p>
            <div className="mt-4 p-3 bg-muted rounded-md space-y-1 text-sm">
              <p><strong>Adjustment #:</strong> {adjustment.adjustment_number}</p>
              <p><strong>Product:</strong> {adjustment.product.name}</p>
              <p><strong>Quantity:</strong> {adjustment.quantity_adjusted > 0 ? '+' : ''}{adjustment.quantity_adjusted}</p>
              <p><strong>Status:</strong> {adjustment.status}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
