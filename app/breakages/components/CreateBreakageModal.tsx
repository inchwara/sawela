"use client";

import { useState, useEffect, useMemo } from "react";
import { createBreakage } from "@/lib/breakages";
import { fetchUsers, type UserData as UserType } from "@/lib/users";
import { getStores, type Store } from "@/lib/stores";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  Plus,
  Loader2,
  Package,
  Trash2,
  Search,
} from "lucide-react";

interface CreateBreakageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AssignableItem {
  id: string;
  dispatch_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  received_quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_returnable: boolean | string;
  is_returned: boolean | string;
  return_date: string | null;
  returned_quantity: number | null;
  return_notes: string | null;
  reminder_status: string | null;
  dispatch_number: string;
  type: string;
  from_store_id: string;
  to_entity: string;
  product_name: string;
  variant_name: string | null;
  product?: {
    name: string;
    sku?: string;
    unit_of_measurement?: string;
  };
  variant?: {
    name: string;
    sku?: string;
    price?: number;
  };
  product_variant?: string;
}

interface BreakageItem {
  assignable_item_id: string;
  quantity: number;
  cause: string;
  replacement_requested: boolean;
  notes?: string;
  assignableItem?: AssignableItem;
}

interface FormData {
  store_id: string;
  approver_id: string;
  notes?: string;
  items: BreakageItem[];
}

const BREAKAGE_CAUSES = [
  "handling_error",
  "equipment_malfunction", 
  "transport_damage",
  "storage_issue",
  "manufacturing_defect",
  "normal_wear",
  "accident",
  "other"
];

const CAUSE_LABELS: Record<string, string> = {
  handling_error: "Handling Error",
  equipment_malfunction: "Equipment Malfunction",
  transport_damage: "Transport Damage", 
  storage_issue: "Storage Issue",
  manufacturing_defect: "Manufacturing Defect",
  normal_wear: "Normal Wear",
  accident: "Accident",
  other: "Other"
};

export function CreateBreakageModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: CreateBreakageModalProps) {
  const [loading, setLoading] = useState(false);
  const [assignableItemsLoading, setAssignableItemsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(false);
  const [assignableItems, setAssignableItems] = useState<AssignableItem[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const { toast } = useToast();
  const { isSystemAdmin } = usePermissions();

  const [formData, setFormData] = useState<FormData>({
    store_id: "",
    approver_id: "",
    notes: "",
    items: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      loadAssignableItems();
      loadUsers();
      // Only load stores if user has system admin permission
      if (isSystemAdmin()) {
        loadStores();
      }
    } else {
      resetForm();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setFormData({
      store_id: "",
      approver_id: "",
      notes: "",
      items: []
    });
    setErrors({});
    setItemSearch("");
    setStoreSearch("");
  };

  const loadAssignableItems = async () => {
    try {
      setAssignableItemsLoading(true);
      // Import the function dynamically to avoid circular dependencies
      const { getAssignableItems } = await import("@/lib/breakages");
      
      // Backend automatically returns all items for system admins, user-specific items for regular users
      const response = await getAssignableItems();
      // Filter out fully returned items (is_returned can be string "true"/"false" or boolean)
      const availableItems = response.items.filter(item => {
        const isReturned = item.is_returned === true || item.is_returned === "true";
        // Also check if there's available quantity (received - returned)
        const availableQty = item.received_quantity - (item.returned_quantity || 0);
        return !isReturned && availableQty > 0;
      });
      setAssignableItems(availableItems);
    } catch (error) {
      console.error("Error loading assignable items:", error);
      toast({
        title: "Error",
        description: "Failed to load assignable items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssignableItemsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetchUsers();
      setUsers(response || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      setStoresLoading(true);
      const response = await getStores();
      setStores(response || []);
    } catch (error) {
      console.error("Error loading stores:", error);
      toast({
        title: "Error",
        description: "Failed to load stores. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStoresLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Approver validation
    if (!formData.approver_id) {
      newErrors.approver_id = "Approver is required";
    }

    // Items validation
    if (formData.items.length === 0) {
      newErrors.items = "At least one item is required";
    } else {
      formData.items.forEach((item, index) => {
        if (!item.assignable_item_id) {
          newErrors[`item_${index}_item`] = "Item is required";
        }
        if (item.quantity <= 0) {
          newErrors[`item_${index}_quantity`] = "Quantity must be greater than 0";
        }
        if (!item.cause) {
          newErrors[`item_${index}_cause`] = "Cause is required";
        }
        
        // Check if quantity exceeds available quantity
        const selectedItem = assignableItems.find(i => i.id === item.assignable_item_id);
        if (selectedItem) {
          const availableQuantity = selectedItem.received_quantity - (selectedItem.returned_quantity || 0);
          if (item.quantity > availableQuantity) {
            newErrors[`item_${index}_quantity`] = `Quantity cannot exceed available quantity (${availableQuantity})`;
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
      // Map form data to API payload
      const payload = {
        store_id: formData.store_id,
        approver_id: formData.approver_id,
        notes: formData.notes,
        items: formData.items.map(item => {
          const selectedItem = assignableItems.find(i => i.id === item.assignable_item_id) || item.assignableItem;
          if (!selectedItem?.product_id) {
            throw new Error('Product ID is required for breakage item');
          }
          return {
            assignable_item_id: item.assignable_item_id,
            product_id: selectedItem.product_id,
            quantity: item.quantity,
            cause: item.cause,
            replacement_requested: item.replacement_requested,
            notes: item.notes || undefined
          };
        })
      };

      await createBreakage(payload);
      
      toast({
        title: "Success",
        description: "Breakage report created successfully.",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating breakage:", error);
      toast({
        title: "Error",
        description: "Failed to create breakage report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index: number, updates: Partial<BreakageItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, ...updates };
          
          // If item changed, reset quantity to 1
          if (updates.assignable_item_id && updates.assignable_item_id !== item.assignable_item_id) {
            updatedItem.quantity = 1;
            const selectedItem = assignableItems.find(i => i.id === updates.assignable_item_id);
            updatedItem.assignableItem = selectedItem;
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  // Get available quantity for a specific item
  const getAvailableQuantity = (itemId: string) => {
    const item = assignableItems.find(i => i.id === itemId);
    if (!item) return 0;
    return item.received_quantity - (item.returned_quantity || 0);
  };

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!itemSearch) return assignableItems;
    return assignableItems.filter(item => 
      item.product_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.variant_name && item.variant_name.toLowerCase().includes(itemSearch.toLowerCase()))
    );
  }, [assignableItems, itemSearch]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Report Breakage</SheetTitle>
          <SheetDescription>
            Create a new breakage report with damaged items
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Store Selection - Only for System Admins */}
          {isSystemAdmin() && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Store</CardTitle>
                <CardDescription>
                  Select the store where this breakage occurred
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="store_id">Store</Label>
                  <Select 
                    value={formData.store_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, store_id: value }))}
                    disabled={storesLoading}
                  >
                    <SelectTrigger className={errors.store_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="flex items-center px-2 pb-2 border-b">
                        <Search className="h-4 w-4 mr-2 text-gray-400" />
                        <Input
                          placeholder="Search stores..."
                          value={storeSearch}
                          onChange={(e) => setStoreSearch(e.target.value)}
                          className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {stores
                        .filter(store => 
                          store.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
                          (store.address && store.address.toLowerCase().includes(storeSearch.toLowerCase()))
                        )
                        .map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            <div>
                              <div className="font-medium">{store.name}</div>
                              {store.address && (
                                <div className="text-xs text-gray-500">{store.address}</div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      {stores.filter(store => 
                        store.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
                        (store.address && store.address.toLowerCase().includes(storeSearch.toLowerCase()))
                      ).length === 0 && (
                        <div className="px-2 py-6 text-center text-sm text-gray-500">
                          No stores found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.store_id && (
                    <p className="text-sm text-red-600">{errors.store_id}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approver Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approver</CardTitle>
              <CardDescription>
                Select the user who will approve this breakage report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="approver_id">Approver *</Label>
                <Select 
                  value={formData.approver_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, approver_id: value }))}
                  disabled={usersLoading}
                >
                  <SelectTrigger className={errors.approver_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select approver" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div>
                          <div className="font-medium">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.approver_id && (
                  <p className="text-sm text-red-600">{errors.approver_id}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Search and Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Products to Breakage Report</CardTitle>
              <CardDescription>
                Search and select products from dispatched items to add to this breakage report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Product Search */}
                <div className="space-y-2">
                  <Label>Search Products</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search products by name..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {/* Product Results - Show when searching */}
                {itemSearch && (
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    {assignableItemsLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading products...
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No products found matching "{itemSearch}"
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredItems.map((item) => {
                          const availableQty = item.received_quantity - (item.returned_quantity || 0);
                          const isAlreadyAdded = formData.items.some(breakageItem => breakageItem.assignable_item_id === item.id);
                          
                          return (
                            <div key={item.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <div>
                                      <h4 className="font-medium">
                                        {item.product?.name || item.product_name || item.product_id}
                                        {(item.variant?.name || item.variant_name || item.product_variant) && (
                                          <span className="text-gray-500"> - {item.variant?.name || item.variant_name || item.product_variant}</span>
                                        )}
                                      </h4>
                                      <p className="text-sm text-gray-500">
                                        Dispatch: {item.dispatch_number} • Available: {availableQty}
                                      </p>
                                    </div>
                                    {availableQty <= 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        Unavailable
                                      </Badge>
                                    )}
                                    {isAlreadyAdded && (
                                      <Badge variant="secondary" className="text-xs">
                                        Already Added
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (isAlreadyAdded) {
                                      toast({
                                        title: "Item already added",
                                        description: "This product is already in the breakage list.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    setFormData(prev => ({
                                      ...prev,
                                      items: [
                                        ...prev.items,
                                        {
                                          assignable_item_id: item.id,
                                          quantity: 1,
                                          cause: "",
                                          replacement_requested: false,
                                          notes: "",
                                          assignableItem: item
                                        }
                                      ]
                                    }));
                                    toast({
                                      title: "Item Added",
                                      description: `${item.product?.name || item.product_name} added to breakage report`,
                                    });
                                  }}
                                  disabled={availableQty <= 0 || isAlreadyAdded}
                                  className="bg-[#1E2764] hover:bg-[#1E2764]/90"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Broken Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Broken Items ({formData.items.length})
                  </CardTitle>
                  <CardDescription>
                    Items added to this breakage report
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {errors.items && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.items}</p>
                </div>
              )}
              
              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No products added yet</p>
                  <p className="text-sm">Use the search above to add products to this breakage report</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.items.map((item, index) => {
                    const selectedItem = assignableItems.find(i => i.id === item.assignable_item_id) || item.assignableItem;
                    const availableQuantity = selectedItem ? getAvailableQuantity(item.assignable_item_id) : 0;
                    
                    return (
                      <div key={index} className="border rounded-lg p-4 relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-primary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="space-y-4">
                          {/* Item Information */}
                          <div className="space-y-2">
                            <Label>Product</Label>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="font-medium">
                                {selectedItem?.product?.name || selectedItem?.product_name || selectedItem?.product_id}
                                {(selectedItem?.variant?.name || selectedItem?.variant_name || selectedItem?.product_variant) && ` - ${selectedItem?.variant?.name || selectedItem?.variant_name || selectedItem?.product_variant}`}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Dispatch: {selectedItem?.dispatch_number} • Available: {availableQuantity}
                              </div>
                            </div>
                          </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Quantity */}
                          <div className="space-y-2">
                            <Label>Quantity *</Label>
                            <div className="flex space-x-2">
                              <Input
                                type="number"
                                min="1"
                                max={availableQuantity}
                                value={item.quantity}
                                onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                                className={errors[`item_${index}_quantity`] ? "border-red-500" : ""}
                              />
                              {availableQuantity > 0 && (
                                <div className="flex items-center px-3 bg-gray-100 rounded-md text-sm">
                                  <span className="text-gray-500">Available: {availableQuantity}</span>
                                </div>
                              )}
                            </div>
                            {errors[`item_${index}_quantity`] && (
                              <p className="text-sm text-red-600">{errors[`item_${index}_quantity`]}</p>
                            )}
                          </div>

                          {/* Cause */}
                          <div className="space-y-2">
                            <Label>Cause *</Label>
                            <Select 
                              value={item.cause} 
                              onValueChange={(value) => updateItem(index, { cause: value })}
                            >
                              <SelectTrigger className={errors[`item_${index}_cause`] ? "border-red-500" : ""}>
                                <SelectValue placeholder="Select cause of breakage" />
                              </SelectTrigger>
                              <SelectContent>
                                {BREAKAGE_CAUSES.map((cause) => (
                                  <SelectItem key={cause} value={cause}>
                                    {CAUSE_LABELS[cause]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors[`item_${index}_cause`] && (
                              <p className="text-sm text-red-600">{errors[`item_${index}_cause`]}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Replacement Request */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={item.replacement_requested}
                              onCheckedChange={(checked) => updateItem(index, { replacement_requested: !!checked })}
                            />
                            <Label className="text-sm">Request replacement for this item</Label>
                          </div>

                          {/* Item Notes */}
                          <div className="space-y-2">
                            <Label>Item Notes</Label>
                            <Textarea
                              placeholder="Additional details about this broken item..."
                              value={item.notes}
                              onChange={(e) => updateItem(index, { notes: e.target.value })}
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* General Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Information</CardTitle>
              <CardDescription>
                Add any general notes about this breakage incident
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">General Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe the incident, circumstances, or any additional context..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <SheetFooter className="flex-shrink-0 border-t pt-4 mt-auto">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || formData.items.length === 0}
              className="bg-[#1E2764] hover:bg-[#1E2764]/90"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Report Breakage
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}