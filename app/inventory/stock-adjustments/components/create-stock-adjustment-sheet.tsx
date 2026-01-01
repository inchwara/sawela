"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Loader2, Check, ChevronsUpDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createStockAdjustmentAction } from "../actions"
import { getProducts } from "@/lib/products"
import { getStores } from "@/lib/stores"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/products"
import type { Store } from "@/lib/stores"

interface CreateStockAdjustmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateStockAdjustmentSheet({
  open,
  onOpenChange,
  onSuccess,
}: CreateStockAdjustmentSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [storeSearchOpen, setStoreSearchOpen] = useState(false)

  const [formData, setFormData] = useState({
    product_id: "",
    store_id: "",
    adjustment_type: "decrease" as "increase" | "decrease" | "set",
    reason_type: "damage" as any,
    quantity_adjusted: "",
    reason: "",
    notes: "",
    status: "draft" as "draft" | "pending",
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  // Retry helper function
  const retryFetch = async <T,>(
    fetchFn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000,
    name: string = "data"
  ): Promise<T> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await fetchFn()
        return result
      } catch (error) {
        const isLastAttempt = attempt === retries - 1
        
        if (isLastAttempt) {
          throw error
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = delay * Math.pow(1.5, attempt)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    throw new Error(`Failed to fetch ${name} after ${retries} attempts`)
  }

  const loadData = async () => {
    setLoadingData(true)
    const errors: string[] = []
    
    try {
      // Load each dropdown independently with retry logic
      const [productsResult, storesResult] = await Promise.allSettled([
        retryFetch(
          () => getProducts(1, 1000, {}),
          3,
          1000,
          "products"
        ).catch(err => {
          errors.push("products")
          console.error("Failed to load products after retries:", err)
          return { data: [], count: 0 }
        }),
        retryFetch(
          () => getStores(),
          3,
          1000,
          "stores"
        ).catch(err => {
          errors.push("stores")
          console.error("Failed to load stores after retries:", err)
          return []
        })
      ])
      
      // Extract data from settled promises
      const productsData = productsResult.status === 'fulfilled' ? productsResult.value : { data: [], count: 0 }
      const storesData = storesResult.status === 'fulfilled' ? storesResult.value : []
      
      setProducts(productsData.data)
      setStores(storesData)
      
      // Set default store if only one exists
      if (storesData.length === 1) {
        setFormData(prev => ({
          ...prev,
          store_id: storesData[0].id
        }))
      }
      
      // Show specific error message only if all dropdowns failed
      if (errors.length === 2) {
        toast({
          title: "Error",
          description: "Failed to load form data. Please check your connection and try again.",
          variant: "destructive",
        })
      } else if (errors.length > 0) {
        // Partial failure - show warning but allow continued use
        toast({
          title: "Warning",
          description: `Could not load: ${errors.join(", ")}. Some form fields may be unavailable.`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Failed to load form data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load form data",
        variant: "destructive",
      })
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const quantity = parseInt(formData.quantity_adjusted)
      if (isNaN(quantity)) {
        throw new Error("Please enter a valid quantity")
      }

      const result = await createStockAdjustmentAction({
        product_id: formData.product_id,
        store_id: formData.store_id || undefined,
        adjustment_type: formData.adjustment_type,
        reason_type: formData.reason_type,
        quantity_adjusted: formData.adjustment_type === "decrease" ? -Math.abs(quantity) : Math.abs(quantity),
        reason: formData.reason,
        notes: formData.notes || undefined,
        status: formData.status,
      })

      if (result.success) {
        toast({
          title: "Success",
          description: "Stock adjustment created successfully",
        })
        onOpenChange(false)
        onSuccess()
        // Reset form
        setFormData({
          product_id: "",
          store_id: "",
          adjustment_type: "decrease",
          reason_type: "damage",
          quantity_adjusted: "",
          reason: "",
          notes: "",
          status: "draft",
        })
      } else {
        throw new Error(result.message || "Failed to create stock adjustment")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create stock adjustment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[800px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Create Stock Adjustment</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Product & Store Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product & Store Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product_id">Product *</Label>
                  <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productSearchOpen}
                        className="w-full justify-between"
                      >
                        {formData.product_id
                          ? products.find((product) => product.id === formData.product_id)?.name
                          : "Select product..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0">
                      <Command>
                        <CommandInput placeholder="Search products by name, SKU, or code..." />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {products.map((product) => (
                              <CommandItem
                                key={product.id}
                                value={`${product.name} ${product.sku || ""} ${product.product_code || ""}`}
                                onSelect={() => {
                                  setFormData({ ...formData, product_id: product.id })
                                  setProductSearchOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.product_id === product.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-1 items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{product.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      SKU: {product.sku || "N/A"} | Code: {product.product_code || "N/A"}
                                    </span>
                                  </div>
                                  <div className="ml-4 flex items-center gap-2">
                                    <span className={cn(
                                      "text-xs font-medium px-2 py-1 rounded",
                                      (product.stock_quantity || 0) <= (product.low_stock_threshold || 0)
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700"
                                    )}>
                                      Stock: {product.stock_quantity || 0}
                                    </span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formData.product_id && (
                    <p className="text-sm text-muted-foreground">
                      Current stock: <span className="font-medium">
                        {products.find((p) => p.id === formData.product_id)?.stock_quantity || 0}
                      </span> units
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_id">Store</Label>
                  <Popover open={storeSearchOpen} onOpenChange={setStoreSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={storeSearchOpen}
                        className="w-full justify-between"
                      >
                        {formData.store_id
                          ? stores.find((store) => store.id === formData.store_id)?.name
                          : "Select store (optional)..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0">
                      <Command>
                        <CommandInput placeholder="Search stores..." />
                        <CommandList>
                          <CommandEmpty>No store found.</CommandEmpty>
                          <CommandGroup>
                            {stores.map((store) => (
                              <CommandItem
                                key={store.id}
                                value={store.name}
                                onSelect={() => {
                                  setFormData({ ...formData, store_id: store.id })
                                  setStoreSearchOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.store_id === store.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {store.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Adjustment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adjustment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adjustment_type">Adjustment Type *</Label>
                    <Select
                      value={formData.adjustment_type}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, adjustment_type: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="increase">Increase</SelectItem>
                        <SelectItem value="decrease">Decrease</SelectItem>
                        <SelectItem value="set">Set</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity_adjusted">Quantity *</Label>
                    <Input
                      id="quantity_adjusted"
                      type="number"
                      value={formData.quantity_adjusted}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity_adjusted: e.target.value })
                      }
                      placeholder="Enter quantity"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason_type">Reason Type *</Label>
                  <Select
                    value={formData.reason_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, reason_type: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="damage">Damage</SelectItem>
                      <SelectItem value="expiry">Expiry</SelectItem>
                      <SelectItem value="theft">Theft</SelectItem>
                      <SelectItem value="loss">Loss</SelectItem>
                      <SelectItem value="found">Found</SelectItem>
                      <SelectItem value="recount">Recount</SelectItem>
                      <SelectItem value="correction">Correction</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="donation">Donation</SelectItem>
                      <SelectItem value="sample">Sample</SelectItem>
                      <SelectItem value="write_off">Write-off</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Reason & Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reason & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Provide a detailed reason for this adjustment"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional information (optional)"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submission Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submission Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Save as Draft</SelectItem>
                      <SelectItem value="pending">Submit for Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <SheetFooter className="px-6 py-4 border-t bg-background mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loadingData}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Adjustment
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
