"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { recordInvoicePayment, RecordPaymentRequest, PaymentRecordResponse } from "@/lib/invoices"
import { Loader2 } from "lucide-react"

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  invoiceNumber: string
  totalAmount: number
  balanceAmount: number
  onPaymentRecorded?: (result: PaymentRecordResponse) => void
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "check", label: "Check" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "other", label: "Other" },
]

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  totalAmount,
  balanceAmount,
  onPaymentRecorded
}: RecordPaymentModalProps) {
  const [formData, setFormData] = useState<RecordPaymentRequest>({
    amount: balanceAmount,
    payment_method: "",
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: "",
    notes: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.payment_method) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive",
      })
      return
    }

    if (formData.amount <= 0) {
      toast({
        title: "Error",
        description: "Payment amount must be greater than zero",
        variant: "destructive",
      })
      return
    }

    if (formData.amount > balanceAmount) {
      toast({
        title: "Error",
        description: `Payment amount cannot exceed balance of KES ${balanceAmount.toFixed(2)}`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await recordInvoicePayment(invoiceId, {
        ...formData,
        transaction_id: formData.transaction_id || undefined,
        notes: formData.notes || undefined
      })

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      })

      onPaymentRecorded?.(result)
      onClose()
      
      // Reset form
      setFormData({
        amount: balanceAmount,
        payment_method: "",
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: "",
        notes: ""
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Invoice #{invoiceNumber} • Balance: KES {balanceAmount.toFixed(2)}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={balanceAmount}
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  amount: parseFloat(e.target.value) || 0 
                }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  payment_date: e.target.value 
                }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method *</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                payment_method: value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_id">Transaction ID</Label>
            <Input
              id="transaction_id"
              type="text"
              value={formData.transaction_id}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                transaction_id: e.target.value 
              }))}
              placeholder="Optional transaction reference"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                notes: e.target.value 
              }))}
              placeholder="Optional payment notes"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
