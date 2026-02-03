"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Search, ShoppingCart, Trash2, X } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import apiCall from "@/lib/api"
import { Product, ProductVariant, getProducts } from "@/lib/products"
import { getCustomers, Customer as LibCustomer, createCustomer } from "@/lib/customers"
import { formatPackagingForDisplay } from "@/lib/packaging-utils"

type Customer = LibCustomer

type OrderItem = {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  variant_id?: string
}

type Company = { id: string; name: string }

type ProductWithVariants = Product & { variants?: ProductVariant[] }

export function CreateOrderModal({ 
  children, 
  onOrderCreated 
}: { 
  children: React.ReactNode
  onOrderCreated?: () => void 
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("existing")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [notes, setNotes] = useState("")
  const [includeTax, setIncludeTax] = useState(true)
  const [taxRate, setTaxRate] = useState(16) // 16% default tax rate
  const [searchQuery, setSearchQuery] = useState("")
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [openProductDropdown, setOpenProductDropdown] = useState(false)

  // New customer form state
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerEmail, setNewCustomerEmail] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [newCustomerAddress, setNewCustomerAddress] = useState("")

  // Order specific fields
  const [trackingNumber, setTrackingNumber] = useState("")
  const [status, setStatus] = useState("Pending")
  const [paymentStatus, setPaymentStatus] = useState("Unpaid")
  const [amountPaid, setAmountPaid] = useState(0)
  const [discount, setDiscount] = useState(0)

  // Fetch products only once per modal open
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await getProducts(1, 10000) // Fetch all products
        setProducts(Array.isArray(response.data) ? response.data.map(p => ({
          ...p,
          variants: Array.isArray(p.variants) ? p.variants as ProductVariant[] : []
        })) : [])
      } catch (error) {
        setProducts([])
        toast.error("Failed to load products")
      }
    }
    if (open) {
      fetchProducts()
    } else {
      setProducts([])
    }
  }, [open])

  const [customersLoaded, setCustomersLoaded] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(false)

  // Only fetch customers when user starts searching
  useEffect(() => {
    async function fetchCustomersOnSearch() {
      setCustomersLoading(true)
      try {
        const allCustomers = await getCustomers()
        setCustomers(
          Array.isArray(allCustomers)
            ? allCustomers.map((c) => ({
                ...c,
                email: c.email || "",
                phone: c.phone || "",
                address: c.address || "",
              }))
            : []
        )
        setCustomersLoaded(true)
      } catch (error) {
        setCustomers([])
        toast.error("Failed to load customers")
      } finally {
        setCustomersLoading(false)
      }
    }
    if (searchQuery.trim() && !customersLoaded && !customersLoading) {
      fetchCustomersOnSearch()
    }
  }, [searchQuery, customersLoaded, customersLoading])

  // Filter customers in memory
  const filteredCustomers = Array.isArray(customers)
    ? customers.filter((customer) => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return false // Don't show any until search
        return (
          (customer?.name && customer.name.toLowerCase().includes(query)) ||
          (customer?.email && customer.email.toLowerCase().includes(query)) ||
          (customer?.phone && customer.phone.toLowerCase().includes(query))
        )
      })
    : []

  const filteredProducts = Array.isArray(products)
    ? products.filter((product) => {
        const query = productSearchQuery.toLowerCase().trim()
        return product.name?.toLowerCase().includes(query) || product.sku?.toLowerCase().includes(query)
      })
    : []

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setSearchQuery("")
  }

  // Change selectedVariants to use a unique key per order item
  const getOrderItemKey = (item: OrderItem) => `${item.product_id}_${item.variant_id || ''}`
  const [selectedVariants, setSelectedVariants] = useState<{ [key: string]: string }>({})
  const [pendingProduct, setPendingProduct] = useState<ProductWithVariants | null>(null)
  const [pendingVariant, setPendingVariant] = useState<string>("")

  const handleAddProduct = (product: ProductWithVariants, variantId?: string) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const existingItemIndex = orderItems.findIndex((item) => item.product_id === product.id && (!hasVariants || item.variant_id === variantId))

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...orderItems]
      updatedItems[existingItemIndex].quantity += 1
      updatedItems[existingItemIndex].total_price =
        updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unit_price
      setOrderItems(updatedItems)
    } else {
      // Add new item
      let unitPrice = 0;
      if (typeof product.price === 'number') {
        unitPrice = product.price;
      } else if (typeof product.price === 'string') {
        unitPrice = parseFloat(product.price);
      } else {
        unitPrice = 0;
      }
      if (hasVariants && variantId) {
        const variant = product.variants?.find((v: any) => v.id === variantId);
        if (variant && variant.price) {
          unitPrice = parseFloat(typeof variant.price === 'number' ? variant.price.toString() : variant.price);
        }
      }
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice,
        ...(variantId ? { variant_id: variantId } : {}),
      }
      setOrderItems([
        ...orderItems,
        newItem,
      ])
      setSelectedVariants((prev) => ({ ...prev, [getOrderItemKey(newItem)]: variantId || "" }))
    }
    setOpenProductDropdown(false)
    setProductSearchQuery("")
    setPendingProduct(null)
    setPendingVariant("")
  }

  const handleSelectVariant = (productId: string, variantId: string, orderItemIndex: number) => {
    setOrderItems((items) =>
      items.map((item, idx) =>
        idx === orderItemIndex ? { ...item, variant_id: variantId } : item
      )
    )
    setSelectedVariants((prev) => {
      const item = orderItems[orderItemIndex]
      return { ...prev, [getOrderItemKey({ ...item, variant_id: variantId })]: variantId }
    })
  }

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return

    const updatedItems = [...orderItems]
    updatedItems[index].quantity = quantity
    updatedItems[index].total_price = quantity * updatedItems[index].unit_price
    setOrderItems(updatedItems)
  }

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0)
  }

  const calculateTax = () => {
    return includeTax ? calculateSubtotal() * (taxRate / 100) : 0
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax()
    const discountAmount = (discount / 100) * subtotal
    return subtotal + tax - discountAmount
  }

  const handleCreateOrder = async () => {
    // Validation
    if (!selectedCustomer && activeTab === "existing") {
      toast.error("Please select a customer")
      return
    }

    if (activeTab === "new" && !newCustomerName) {
      toast.error("Please enter customer name")
      return
    }

    if (orderItems.length === 0) {
      toast.error("Please add at least one product")
      return
    }

    setLoading(true)

    try {
      let customerId = selectedCustomer?.id

      // Create new customer if needed
      if (activeTab === "new") {
        // Create customer via API
        const newCustomer = await apiCall<Customer>("/customers", "POST", {
          name: newCustomerName,
          email: newCustomerEmail,
          phone: newCustomerPhone,
          address: newCustomerAddress,
          company_id: null, // Set to null if not needed
        })
        customerId = newCustomer.id
      }

      // Use the first company as store_id (adjust if you have a separate store selector)
      const storeId = companies.length > 0 ? companies[0].id : null
      // TODO: Add UI for delivery_location_id, delivery_person_id, estimated_delivery if needed
      const payload = {
        customer_id: customerId,
        store_id: storeId,
        status: status.toLowerCase(),
        payment_status: paymentStatus.toLowerCase(),
        // delivery_location_id: ...,
        // delivery_person_id: ...,
        // estimated_delivery: ...,
        discount,
        currency: "KES",
        notes,
        items: orderItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          ...(item.variant_id ? { variant_id: item.variant_id } : {}),
        })),
      }
      await apiCall("/orders", "POST", payload)
      toast.success("Order created successfully!", { position: "bottom-left" })
      setOpen(false)
      resetForm()
      if (onOrderCreated) {
        onOrderCreated()
      }
      router.refresh()
    } catch (error: any) {
      let errorMessage = "Error creating order: "
      if (error?.message) {
        errorMessage += error.message
      } else if (typeof error === 'string') {
        errorMessage += error
      } else if (error?.response?.data?.message) {
        errorMessage += error.response.data.message
      } else if (error?.response?.data?.error) {
        errorMessage += error.response.data.error
      } else {
        errorMessage += "Unknown error"
      }
      toast.error(errorMessage, { position: "bottom-left" })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewCustomer = async () => {
    if (!newCustomerName) {
      toast.error("Please enter customer name")
      return
    }
    try {
      // Use the updated createCustomer function instead of direct API call
      const customerData = {
        name: newCustomerName,
        email: newCustomerEmail || null,
        phone: newCustomerPhone || null,
        address: newCustomerAddress || null,
        city: null,
        state: null,
        country: null,
        postal_code: null,
        company: null,
        notes: null,
        tags: [],
        customer_type: null,
        preferred_communication_channel: null,
        last_contact_date: null,
      };

      const newCustomer = await createCustomer(customerData as any);
      setCustomers((prev) => [newCustomer, ...prev])
      setSelectedCustomer(newCustomer)
      setActiveTab("existing")
      toast.success("Customer created successfully!")
    } catch (error) {
      toast.error("Failed to create customer")
    }
  }

  const resetForm = () => {
    setSelectedCustomer(null)
    setOrderItems([])
    setNotes("")
    setIncludeTax(true)
    setTaxRate(16)
    setSearchQuery("")
    setProductSearchQuery("")
    setActiveTab("existing")
    setNewCustomerName("")
    setNewCustomerEmail("")
    setNewCustomerPhone("")
    setNewCustomerAddress("")
    setTrackingNumber("")
    setStatus("Pending")
    setPaymentStatus("Unpaid")
    setAmountPaid(0)
    setDiscount(0)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Create New Order
          </SheetTitle>
          <SheetDescription>
            Create a new order for a customer. Add products, set quantities, and specify order details.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer Information</h3>
            <Tabs defaultValue="existing" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Existing Customer</TabsTrigger>
                <TabsTrigger value="new">New Customer</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-search">Search Customers</Label>
                  <div className="space-y-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="customer-search"
                        placeholder="Search by name, email (e.g., john@example.com) or phone (e.g., 0712345678)..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Examples: "John Doe", "john@example.com", "0712345678"</p>
                  </div>

                  {customersLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading customers...</div>
                  ) : filteredCustomers.length === 0 && searchQuery.trim() ? (
                    <div className="p-4 text-center text-gray-500">No customers found matching "{searchQuery}"</div>
                  ) : (
                    // Only show the list if no customer is selected
                    !selectedCustomer && filteredCustomers.length > 0 && (
                      <div className="divide-y max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
                        {filteredCustomers.map((customer: Customer) => (
                          <div
                            key={customer.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {selectedCustomer ? (
                    <div className="mt-4 p-4 border rounded-md bg-gray-50">
                      <div className="flex justify-between iteppms-start">
                        <div>
                          <div className="font-medium">{selectedCustomer.name}</div>
                          <div className="text-sm text-gray-500">{selectedCustomer.email}</div>
                          <div className="text-sm text-gray-500">{selectedCustomer.phone}</div>
                          <div className="text-sm text-gray-500">{selectedCustomer.address}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab("new")
                      setSearchQuery("")
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Customer
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="new" className="space-y-4 pt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Customer name"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="customer@example.com"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="+254 712 345 678"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Customer address"
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                    />
                  </div>
                  <Button className="mt-2 w-full" onClick={handleCreateNewCustomer}>
                    Create Customer
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Order Items</h3>
              <Popover open={openProductDropdown} onOpenChange={(open) => {
  setOpenProductDropdown(open)
  if (!open) {
    setPendingProduct(null)
    setPendingVariant("")
  }
}}>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      <Plus className="mr-2 h-4 w-4" />
      Add Product
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[300px] p-0" align="end">
    {pendingProduct && pendingProduct.variants && pendingProduct.variants.length > 0 ? (
      <div className="p-4 space-y-2">
        <div className="font-medium mb-2">Select Variant for {pendingProduct.name}</div>
        <Select
          value={pendingVariant}
          onValueChange={(value) => setPendingVariant(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select variant" />
          </SelectTrigger>
          <SelectContent>
            {pendingProduct.variants?.map((variant: ProductVariant) => (
              <SelectItem key={variant.id} value={String(variant.id)}>
                {variant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="w-full mt-2"
          disabled={!pendingVariant}
          onClick={() => handleAddProduct(pendingProduct, pendingVariant)}
        >
          Add to Order
        </Button>
        <Button
          className="w-full mt-2"
          variant="outline"
          onClick={() => {
            setPendingProduct(null)
            setPendingVariant("")
          }}
        >
          Cancel
        </Button>
      </div>
    ) : (
      <Command>
        <CommandInput
          placeholder="Search products..."
          value={productSearchQuery}
          onValueChange={setProductSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No products found</CommandEmpty>
          <CommandGroup>
            {filteredProducts.map((product) => (
              <CommandItem
                key={product.id}
                onSelect={() => {
                  if (product.variants && product.variants.length > 0) {
                    setPendingProduct(product)
                    setPendingVariant("")
                  } else {
                    handleAddProduct(product)
                  }
                }}
              >
                <div className="flex flex-col">
                  <span>{product.name}</span>
                  <span className="text-sm text-gray-500">
                    {product.sku} - Ksh. {parseFloat(product.price || '0').toFixed(2)}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    )}
  </PopoverContent>
</Popover>
            </div>

            {orderItems.length === 0 ? (
              <div className="text-center p-6 border border-dashed rounded-md">
                <p className="text-gray-500">No items added yet. Click "Add Product" to add items to this order.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                        {/* Variation column header, only if any product has variations */}
                        {orderItems.some(item => {
                          const product = products.find((p) => p.id === item.product_id)
                          return product && Array.isArray(product.variants) && product.variants.length > 0
                        }) && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variation</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderItems.map((item, index) => {
                        const product = products.find((p) => p.id === item.product_id)
                        const variants = product?.variants || []
                        const itemKey = getOrderItemKey(item)
                        return (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">Ksh. {item.unit_price.toFixed(2)}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(index, Number.parseInt(e.target.value) || 1)}
                                  className="h-8 w-16 mx-2 text-center"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                                >
                                  +
                                </Button>
                              </div>
                              {/* Packaging Breakdown Display */}
                              {(() => {
                                const product = products.find((p) => p.id === item.product_id)
                                if (product && product.has_packaging && product.packaging_units && item.quantity > 0) {
                                  const packagingDisplay = formatPackagingForDisplay(item.quantity, product.packaging_units)
                                  if (packagingDisplay.hasPackaging && packagingDisplay.shortText) {
                                    return (
                                      <div className="mt-1.5 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-center gap-1">
                                          <ShoppingCart className="h-3 w-3 flex-shrink-0" />
                                          <span className="font-medium">{packagingDisplay.shortText}</span>
                                        </div>
                                      </div>
                                    )
                                  }
                                }
                                return null
                              })()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">Ksh. {item.total_price.toFixed(2)}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </td>
                            {variants.length > 0 && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Select
                                  value={selectedVariants[itemKey] || item.variant_id || ""}
                                  onValueChange={(value) => handleSelectVariant(item.product_id, value, index)}
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Select variant" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {variants.map((variant: ProductVariant) => (
                                      <SelectItem key={variant.id} value={String(variant.id)}>
                                        {variant.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border rounded-md p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Subtotal:</span>
                    <span className="font-medium">Ksh. {calculateSubtotal().toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch id="tax-toggle" checked={includeTax} onCheckedChange={setIncludeTax} />
                      <Label htmlFor="tax-toggle">Include Tax</Label>
                    </div>

                    {includeTax && (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={taxRate.toString()}
                          onValueChange={(value) => setTaxRate(Number.parseInt(value))}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Tax Rate" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="16">16%</SelectItem>
                            <SelectItem value="8">8%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="0">0%</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="font-medium">Ksh. {calculateTax().toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="discount">Discount (%):</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        value={discount}
                        onChange={(e) => setDiscount(Number.parseFloat(e.target.value) || 0)}
                        className="w-[80px]"
                      />
                    </div>
                    <span className="font-medium">-Ksh. {((discount / 100) * calculateSubtotal()).toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total:</span>
                      <span className="text-lg font-bold">Ksh. {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Order Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-status">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger id="payment-status">
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount-paid">Amount Paid</Label>
                <Input
                  id="amount-paid"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number.parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking-number">Tracking Number</Label>
                <Input
                  id="tracking-number"
                  placeholder="Enter tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes or special instructions for this order"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </div>
        
        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-auto">
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} disabled={loading}>
              {loading && <Plus className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
