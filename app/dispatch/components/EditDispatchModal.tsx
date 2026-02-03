"use client";
import { useState, useEffect } from "react";
import { updateDispatch, type Dispatch } from "@/lib/dispatch";
import { fetchUsers, type UserData as User } from "@/lib/users";
import { getStores } from "@/lib/stores";
import { getProducts } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { X, Package, Loader2, Plus, Minus, Search, Building2, Calendar } from "lucide-react";
import { cn, toSentenceCase } from "@/lib/utils";
import { format } from "date-fns";

interface EditDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispatch: Dispatch | null;
  onSuccess?: () => void;
}

interface Store {
  id: string;
  name: string;
  description?: string;
  location?: string;
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
  id?: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  is_returnable: boolean;
  return_date?: string;
  notes?: string;
  product?: Product;
  variant?: any;
}

interface EditFormData {
  from_store_id: string;
  to_entity: string;
  to_user_id: string;
  type: "internal" | "external";
  notes: string;
  items: DispatchItem[];
}

export function EditDispatchModal({ open, onOpenChange, dispatch, onSuccess }: EditDispatchModalProps) {
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    from_store_id: "",
    to_entity: "",
    to_user_id: "",
    type: "internal",
    notes: "",
    items: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Handle visibility for animation
  useEffect(() => {
    if (open) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Initialize form data when dispatch changes
  useEffect(() => {
    if (dispatch) {
      setFormData({
        from_store_id: dispatch.from_store_id || "",
        to_entity: dispatch.to_entity || "",
        to_user_id: dispatch.to_user_id || "",
        type: dispatch.type as "internal" | "external",
        notes: dispatch.notes || "",
        items: dispatch.dispatch_items?.map(item => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id || undefined,
          quantity: item.quantity,
          is_returnable: item.is_returnable,
          return_date: item.return_date || undefined,
          notes: item.notes || "",
          product: {
            ...item.product,
            image_url: item.product.image_url || undefined,
          } as Product,
          variant: item.variant,
        })) || [],
      });
    }
  }, [dispatch]);

  // Fetch initial data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Load stores
        const storesData = await getStores();
        setStores(storesData);

        // Load users
        const usersData = await fetchUsers();
        setUsers(usersData);
        
        // Load products for item management
        const productsResponse = await getProducts(1, 10000); // Fetch all products
        setProducts((productsResponse.data || []) as unknown as Product[]);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchInitialData();
    }
  }, [open, toast]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dispatch || !validateForm()) return;

    setLoading(true);
    
    try {
      const response = await updateDispatch(dispatch.id, {
        from_store_id: formData.from_store_id,
        to_entity: formData.to_entity,
        to_user_id: formData.to_user_id,
        type: formData.type,
        notes: formData.notes || undefined,
        items: formData.items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id || undefined,
          quantity: item.quantity,
          is_returnable: item.is_returnable,
          return_date: item.return_date || undefined,
          notes: item.notes || undefined,
        })),
      });

      toast({
        title: "Success",
        description: response.message || "Dispatch updated successfully!",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating dispatch:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update dispatch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      from_store_id: "",
      to_entity: "",
      to_user_id: "",
      type: "internal",
      notes: "",
      items: [],
    });
    setErrors({});
    setSearchQuery("");
    onOpenChange(false);
  };

  // Item management functions
  const addItem = (product: Product, variant?: any) => {
    const availableStock = variant ? variant.stock_quantity : product.stock_quantity;
    
    if (availableStock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name}${variant ? ` (${variant.name})` : ""} is out of stock`,
        variant: "destructive",
      });
      return;
    }

    const newItem: DispatchItem = {
      product_id: product.id,
      variant_id: variant?.id,
      quantity: 1,
      is_returnable: false,
      notes: "",
      product,
      variant,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setSearchQuery("");
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, updates: Partial<DispatchItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, ...updates } : item
      )
    }));
  };

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    searchQuery && (
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (!dispatch || !isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => onOpenChange(false)}
      />
      
      {/* Sliding Modal */}
      <div
        className={cn(
          "fixed inset-0 w-full max-w-4xl bg-white shadow-2xl z-[100] transition-transform duration-300 ease-in-out flex flex-col ml-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Dispatch {dispatch.dispatch_number}
              </h2>
              <p className="text-sm text-gray-500">
                Update all dispatch information including basic details and items
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Dispatch Information</span>
              </CardTitle>
              <CardDescription>
                Update the basic dispatch details
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
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          <div>
                            <div className="font-medium">{store.name}</div>
                            {store.location && (
                              <div className="text-xs text-gray-500">{store.location}</div>
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

          {/* Items Management */}
          <div className="space-y-6">
            {/* Add Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Products</CardTitle>
                <CardDescription>
                  Search and add products to update this dispatch
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
                  Dispatch Items ({formData.items.length})
                </CardTitle>
                {errors.items && (
                  <p className="text-sm text-red-600">{errors.items}</p>
                )}
              </CardHeader>
              <CardContent>
                {formData.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No items in this dispatch</p>
                    <p className="text-sm">Search and add products above</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={`${item.product_id}-${item.variant_id || 'no-variant'}-${index}`} className="border rounded-lg p-4">
                        <div className="flex items-start space-x-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{item.product?.name || 'Unknown Product'}</h4>
                                {item.variant && (
                                  <p className="text-sm text-gray-600">Variant: {item.variant?.name || 'Unknown Variant'}</p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Quantity *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 0 })}
                                  className={errors[`item_${index}_quantity`] || errors[`item_${index}_stock`] ? "border-red-500" : ""}
                                />
                                {(errors[`item_${index}_quantity`] || errors[`item_${index}_stock`]) && (
                                  <p className="text-sm text-red-600">
                                    {errors[`item_${index}_quantity`] || errors[`item_${index}_stock`]}
                                  </p>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`returnable-${index}`}
                                    checked={item.is_returnable}
                                    onCheckedChange={(checked) => updateItem(index, { is_returnable: checked as boolean })}
                                  />
                                  <Label htmlFor={`returnable-${index}`}>Returnable</Label>
                                </div>
                                {item.is_returnable && (
                                  <Input
                                    type="date"
                                    value={item.return_date || ""}
                                    onChange={(e) => updateItem(index, { return_date: e.target.value })}
                                    placeholder="Return date"
                                  />
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Item Notes</Label>
                                <Input
                                  value={item.notes || ""}
                                  onChange={(e) => updateItem(index, { notes: e.target.value })}
                                  placeholder="Optional notes for this item"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t bg-white px-6 py-4">
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#E30040] hover:bg-[#E30040]/90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Dispatch"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}