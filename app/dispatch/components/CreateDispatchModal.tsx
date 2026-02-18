"use client";

import { useState, useEffect } from "react";
import { createDispatch } from "@/lib/dispatch";
import { getStores } from "@/lib/stores";
import { getProducts } from "@/lib/products";
import { fetchUsers, type UserData } from "@/lib/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { 
  Package, 
  Building2, 
  Plus,
  Minus,
  Loader2,
  Search,
  X
} from "lucide-react";
import { format } from "date-fns";
import { cn, toSentenceCase } from "@/lib/utils";

interface CreateDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Store {
  id: string;
  name: string;
  description?: string;
  address?: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  price: string | number;
  stock_quantity: number;
  has_variations: boolean;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    price: string;
    stock_quantity: number;
  }>;
  image_url?: string;
  unit_of_measurement: string;
}

interface DispatchItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
  is_returnable: boolean;
  return_date?: string;
  notes?: string;
  product?: Product;
  variant?: any;
}

interface FormData {
  from_store_id: string;
  to_entity: string;
  to_user_id: string;
  type: "internal" | "external";
  notes: string;
  items: DispatchItem[];
}

export function CreateDispatchModal({ open, onOpenChange, onSuccess }: CreateDispatchModalProps) {
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  ;

  const [formData, setFormData] = useState<FormData>({
    from_store_id: "",
    to_entity: "",
    to_user_id: "",
    type: "internal",
    notes: "",
    items: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      loadInitialData();
    } else {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      from_store_id: "",
      to_entity: "",
      to_user_id: "",
      type: "internal" as "internal" | "external",
      notes: "",
      items: []
    });
    setErrors({});
    setSearchQuery("");
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load stores
      const storesData = await getStores();
      setStores(storesData);

      // Load users from company
      const usersData = await fetchUsers();
      setUsers(usersData);

      // Load products with inventory - type cast to handle interface mismatch
      const productsResponse = await getProducts(1, 10000); // Fetch all products
      setProducts((productsResponse.data || []) as unknown as Product[]);
      
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic information validation
    if (!formData.from_store_id) newErrors.from_store_id = "From store is required";
    if (!formData.to_entity) newErrors.to_entity = "To entity is required";
    if (!formData.to_user_id) newErrors.to_user_id = "To user is required";

    // Items validation
    if (formData.items.length === 0) {
      newErrors.items = "At least one item is required";
    } else {
      formData.items.forEach((item, index) => {
        if (item.quantity <= 0) {
          newErrors[`item_${index}_quantity`] = "Quantity must be greater than 0";
        }
        
        // Check stock availability
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const availableStock = item.variant_id 
            ? product.variants?.find(v => v.id === item.variant_id)?.stock_quantity || 0
            : product.stock_quantity;
          
          if (item.quantity > availableStock) {
            newErrors[`item_${index}_stock`] = `Only ${availableStock} units available`;
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id || undefined,
          quantity: item.quantity,
          is_returnable: item.is_returnable,
          return_date: item.return_date || undefined,
          notes: item.notes || undefined
        }))
      };

      await createDispatch(payload);
      
      toast.success("Dispatch created successfully");
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating dispatch:", error);
      toast.error("Failed to create dispatch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addItem = (product: Product, variant?: any) => {
    const availableStock = variant ? variant.stock_quantity : product.stock_quantity;
    
    if (availableStock <= 0) {
      toast.error(`${product.name}${variant ? ` (${variant.name})` : ''} is out of stock.`);
      return;
    }

    // Check if product/variant combination already exists
    const existingItemIndex = formData.items.findIndex(item => 
      item.product_id === product.id && 
      item.variant_id === (variant?.id || undefined)
    );

    if (existingItemIndex !== -1) {
      // Update existing item quantity
      const existingItem = formData.items[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      
      if (newQuantity > availableStock) {
        toast.error(`Only ${availableStock} units available for ${product.name}${variant ? ` (${variant.name})` : ''}.`);
        return;
      }

      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: newQuantity }
            : item
        )
      }));

      toast.success(`${product.name}${variant ? ` (${variant.name})` : ''} quantity updated.`);
    } else {
      // Add new item
      const newItem: DispatchItem = {
        product_id: product.id,
        variant_id: variant?.id,
        quantity: 1,
        is_returnable: true,
        return_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        notes: "",
        product,
        variant
      };

      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));

      toast.success(`${product.name}${variant ? ` (${variant.name})` : ''} added to dispatch.`);
    }
  };

  const updateItem = (index: number, updates: Partial<DispatchItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, ...updates } : item)
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-4xl sm:max-w-4xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#E30040]/10 rounded-lg">
              <Package className="h-5 w-5 text-[#E30040]" />
            </div>
            <div>
              <SheetTitle className="text-xl font-semibold text-gray-900">Create Dispatch</SheetTitle>
              <SheetDescription className="text-sm text-gray-500">Create a new warehouse dispatch</SheetDescription>
            </div>
          </div>
        </SheetHeader>



        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Dispatch Information</span>
              </CardTitle>
              <CardDescription>
                Set up the basic dispatch details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From Store */}
                <div className="space-y-2">
                  <Label htmlFor="from_store_id">From Store *</Label>
                  <Select 
                    value={formData.from_store_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, from_store_id: value }))}
                  >
                    <SelectTrigger className={errors.from_store_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select store to dispatch from" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          <div>
                            <div className="font-medium">{store.name}</div>
                            {store.description && (
                              <div className="text-xs text-muted-foreground">{store.description}</div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.from_store_id && (
                    <p className="text-sm text-red-600">{errors.from_store_id}</p>
                  )}
                </div>

                {/* Dispatch Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Dispatch Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => {
                      const newType = value as "internal" | "external";
                      setFormData(prev => ({ 
                        ...prev, 
                        type: newType,
                        to_entity: "" // Reset to_entity when type changes
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select dispatch type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Transfer</SelectItem>
                      <SelectItem value="external">External Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* To Entity */}
                <div className="space-y-2">
                  <Label htmlFor="to_entity">To Entity *</Label>
                  <Select 
                    value={formData.to_entity} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, to_entity: value }))}
                  >
                    <SelectTrigger className={errors.to_entity ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select entity/department">
                        {formData.to_entity ? toSentenceCase(formData.to_entity) : "Select entity/department"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {formData.type === "internal" ? (
                        <>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                          <SelectItem value="sales">Sales Department</SelectItem>
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="external_company">External Company</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.to_entity && (
                    <p className="text-sm text-red-600">{errors.to_entity}</p>
                  )}
                </div>

                {/* To User */}
                <div className="space-y-2">
                  <Label htmlFor="to_user_id">Assign to User *</Label>
                  <Select 
                    value={formData.to_user_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, to_user_id: value }))}
                  >
                    <SelectTrigger className={errors.to_user_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select user to acknowledge dispatch" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div>
                            <div className="font-medium">{user.first_name} {user.last_name}</div>
                            
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.to_user_id && (
                    <p className="text-sm text-red-600">{errors.to_user_id}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this dispatch..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Selection and Items */}
          <div className="space-y-6">
            <div className="space-y-6">
              {/* Product Search */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Products</CardTitle>
                  <CardDescription>
                    Search and select products to include in this dispatch
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products by name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {searchQuery && (
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No products found matching "{searchQuery}"
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredProducts.map((product) => (
                            <div key={product.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <div>
                                      <h4 className="font-medium">{product.name}</h4>
                                      <p className="text-sm text-gray-500">
                                        SKU: {product.sku || 'N/A'} • Stock: {product.stock_quantity} {product.unit_of_measurement}
                                      </p>
                                    </div>
                                    {product.stock_quantity <= 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        Out of Stock
                                      </Badge>
                                    )}
                                    {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                                      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                        Low Stock
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {product.has_variations && product.variants ? (
                                    <>
                                      <Select onValueChange={(variantId) => {
                                        const variant = product.variants?.find(v => v.id === variantId);
                                        if (variant) addItem(product, variant);
                                      }}>
                                        <SelectTrigger className="w-40">
                                          <SelectValue placeholder="Select variant" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {product.variants.map((variant) => (
                                            <SelectItem 
                                              key={variant.id} 
                                              value={variant.id}
                                              disabled={variant.stock_quantity <= 0}
                                            >
                                              <div className="flex items-center justify-between w-full">
                                                <span>{variant.name}</span>
                                                <span className="text-xs text-gray-500 ml-2">
                                                  Stock: {variant.stock_quantity}
                                                </span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="sm"
                                        onClick={() => addItem(product)}
                                        disabled={product.stock_quantity <= 0}
                                        className="bg-[#E30040] hover:bg-[#E30040]/90"
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => addItem(product)}
                                      disabled={product.stock_quantity <= 0}
                                      className="bg-[#E30040] hover:bg-[#E30040]/90"
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Selected Items ({formData.items.length})
                  </CardTitle>
                  {errors.items && (
                    <p className="text-sm text-red-600">{errors.items}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {formData.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No items selected yet</p>
                      <p className="text-sm">Search and add products above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.items.map((item, index) => {
                        const product = item.product;
                        const variant = item.variant;
                        const availableStock = variant ? variant.stock_quantity : product?.stock_quantity || 0;
                        
                        return (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-medium">{product?.name || "Unknown Product"}</h4>
                                {variant && (
                                  <p className="text-sm text-gray-600">Variant: {variant.name}</p>
                                )}
                                <p className="text-xs text-gray-500">
                                  Available: {availableStock} {product?.unit_of_measurement}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Quantity */}
                              <div className="space-y-2">
                                <Label>Quantity *</Label>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    max={availableStock}
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                                    className={cn(
                                      "text-center w-20",
                                      (errors[`item_${index}_quantity`] || errors[`item_${index}_stock`]) && "border-red-500"
                                    )}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateItem(index, { quantity: Math.min(availableStock, item.quantity + 1) })}
                                    disabled={item.quantity >= availableStock}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                {(errors[`item_${index}_quantity`] || errors[`item_${index}_stock`]) && (
                                  <p className="text-xs text-red-600">
                                    {errors[`item_${index}_quantity`] || errors[`item_${index}_stock`]}
                                  </p>
                                )}
                              </div>

                              {/* Returnable */}
                              <div className="space-y-2">
                                <Label>Return Settings</Label>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={item.is_returnable}
                                    onCheckedChange={(checked) => updateItem(index, { is_returnable: !!checked })}
                                  />
                                  <span className="text-sm">Returnable</span>
                                </div>
                                {item.is_returnable && (
                                  <Input
                                    type="date"
                                    value={item.return_date}
                                    onChange={(e) => updateItem(index, { return_date: e.target.value })}
                                    className="text-sm"
                                  />
                                )}
                              </div>

                              {/* Notes */}
                              <div className="space-y-2">
                                <Label>Item Notes</Label>
                                <Input
                                  placeholder="Optional notes for this item..."
                                  value={item.notes}
                                  onChange={(e) => updateItem(index, { notes: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || formData.items.length === 0}
            className="bg-[#E30040] hover:bg-[#E30040]/90"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            Create Dispatch
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}