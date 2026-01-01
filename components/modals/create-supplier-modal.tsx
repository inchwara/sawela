"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { createSupplier, CreateSupplierPayload, Supplier } from "@/lib/suppliers"
import { Loader2, Building2, CreditCard, FileText } from "lucide-react"

interface CreateSupplierModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSupplierCreated: (supplier: Supplier) => void
}

export function CreateSupplierModal({ open, onOpenChange, onSupplierCreated }: CreateSupplierModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [formData, setFormData] = useState<CreateSupplierPayload>({
    name: "",
    email: "",
    phone: "",
    address: "",
    contact_person: "",
    notes: "",
    is_active: true,
    bank_name: "",
    bank_account_number: "",
    bank_branch: "",
    bank_swift_code: "",
    payment_terms_type: "Net",
    payment_terms_days: 30,
    payment_terms_description: "Payment due in 30 days",
    tax_information: "",
  })

  const handleInputChange = (field: keyof CreateSupplierPayload, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      contact_person: "",
      notes: "",
      is_active: true,
      bank_name: "",
      bank_account_number: "",
      bank_branch: "",
      bank_swift_code: "",
      payment_terms_type: "Net",
      payment_terms_days: 30,
      payment_terms_description: "Payment due in 30 days",
      tax_information: "",
    })
    setActiveTab("basic")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Supplier name is required",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const supplier = await createSupplier(formData)
      
      toast({
        title: "Success",
        description: "Supplier created successfully"
      })
      
      // Reset form
      resetForm()
      
      // Notify parent component
      onSupplierCreated(supplier)
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Supplier</DialogTitle>
          <DialogDescription>
            Add a new supplier to your system. Fill in the required information to get started.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Basic Info</span>
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Bank</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Payment</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter company name"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => handleInputChange("contact_person", e.target.value)}
                    placeholder="Enter contact person name"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Enter email address"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter full address"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Enter any additional notes"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="is_active">Active Supplier</Label>
              </div>
            </TabsContent>
            
            <TabsContent value="bank" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => handleInputChange("bank_name", e.target.value)}
                    placeholder="Enter bank name"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => handleInputChange("bank_account_number", e.target.value)}
                    placeholder="Enter account number"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_branch">Branch</Label>
                  <Input
                    id="bank_branch"
                    value={formData.bank_branch}
                    onChange={(e) => handleInputChange("bank_branch", e.target.value)}
                    placeholder="Enter branch name"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_swift_code">Swift Code</Label>
                  <Input
                    id="bank_swift_code"
                    value={formData.bank_swift_code}
                    onChange={(e) => handleInputChange("bank_swift_code", e.target.value)}
                    placeholder="Enter swift code"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="payment" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_terms_type">Terms Type</Label>
                  <Select
                    value={formData.payment_terms_type}
                    onValueChange={(value) => handleInputChange("payment_terms_type", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select terms type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net">Net</SelectItem>
                      <SelectItem value="Due">Due</SelectItem>
                      <SelectItem value="Immediate">Immediate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_terms_days">Days</Label>
                  <Input
                    id="payment_terms_days"
                    type="number"
                    value={formData.payment_terms_days}
                    onChange={(e) => handleInputChange("payment_terms_days", parseInt(e.target.value) || 0)}
                    placeholder="Enter number of days"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_terms_description">Payment Terms Description</Label>
                <Input
                  id="payment_terms_description"
                  value={formData.payment_terms_description}
                  onChange={(e) => handleInputChange("payment_terms_description", e.target.value)}
                  placeholder="Enter payment terms description"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_information">Tax Information</Label>
                <Input
                  id="tax_information"
                  value={formData.tax_information}
                  onChange={(e) => handleInputChange("tax_information", e.target.value)}
                  placeholder="Enter tax information (e.g., PIN)"
                  disabled={isSubmitting}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Supplier"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
