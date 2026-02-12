"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Wrench,
  Plus,
  Loader2,
  Search,
  Trash2
} from "lucide-react";
import { 
  createRepair, 
  getAssignableItemsForRepair, 
  type AssignableItem 
} from "@/lib/repairs";
import { fetchUsers, type UserData as UserType } from "@/lib/users";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";



interface RepairItem {
  assignable_item_id: string;
  product_id: string;
  product_variant?: string;
  quantity: number;
  notes?: string;
  is_repairable: boolean;
  assignableItem?: AssignableItem;
}

interface FormData {
  approver_id: string;
  description: string;
  items: RepairItem[];
}

interface CreateRepairModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRepairModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateRepairModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignableItems, setAssignableItems] = useState<AssignableItem[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const { toast } = useToast();
  const { isSystemAdmin } = usePermissions();

  const [formData, setFormData] = useState<FormData>({
    approver_id: "",
    description: "",
    items: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchAssignableItems();
      loadUsers();
    } else {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      approver_id: "",
      description: "",
      items: []
    });
    setErrors({});
    setItemSearch("");
  };

  const fetchAssignableItems = async () => {
    setLoadingItems(true);
    try {
      const response = await getAssignableItemsForRepair();
      
      // Transform and filter items
      // System admins get inventory products (product_id, stock_quantity)
      // Regular users get dispatch items (id, received_quantity, is_returned)
      const availableItems = response.items
        .map((item: any) => {
          // If item doesn't have an id, it's an inventory product (system admin)
          // Generate a unique id from product_id and variant_id
          if (!item.id && item.product_id) {
            return {
              ...item,
              id: item.variant_id ? `${item.product_id}-${item.variant_id}` : item.product_id,
              received_quantity: item.stock_quantity || 0,
              returned_quantity: 0,
              is_returned: false,
              dispatch_number: 'N/A',
              dispatch_id: null,
            };
          }
          return item;
        })
        .filter((item: any) => {
          const isReturned = item.is_returned === true || item.is_returned === "true";
          // Check if there's available quantity
          const availableQty = (item.received_quantity || 0) - (item.returned_quantity || 0);
          return !isReturned && availableQty > 0;
        });
      
      setAssignableItems(availableItems);
    } catch (error) {
      console.error('Error fetching assignable items:', error);
      toast({
        title: "Error",
        description: "Failed to load assignable items.",
        variant: "destructive",
      });
    } finally {
      setLoadingItems(false);
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Approver validation
    if (!formData.approver_id) {
      newErrors.approver_id = "Approver is required";
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
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

    setIsSubmitting(true);
    try {
      // Map form data to API payload
      const payload = {
        approver_id: formData.approver_id,
        description: formData.description,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          product_variant: item.product_variant,
          quantity: item.quantity,
          notes: item.notes || undefined,
          is_repairable: item.is_repairable
        }))
      };

      await createRepair(payload);
      onSuccess();
      toast({
        title: "Success",
        description: "Repair report created successfully.",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating repair:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create repair. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };



  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, updates: Partial<RepairItem>) => {
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
            updatedItem.product_id = selectedItem?.product_id || "";
            updatedItem.product_variant = selectedItem?.variant_id || undefined;
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
    <Sheet open={open} onOpenChange={(open) => !isSubmitting && onOpenChange(open)}>
      <SheetContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>Report Repair</span>
          </SheetTitle>
          <SheetDescription>
            Create a new repair report for damaged items
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Approver Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approver</CardTitle>
              <CardDescription>
                Select the user who will approve this repair report
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
              <CardTitle className="text-lg">Add Products to Repair Report</CardTitle>
              <CardDescription>
                {isSystemAdmin() 
                  ? "Search and select products from all company inventory to add to this repair report"
                  : "Search and select products from your dispatched items to add to this repair report"
                }
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
                    {loadingItems ? (
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
                          const isAlreadyAdded = formData.items.some(repairItem => repairItem.assignable_item_id === item.id);
                          
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
                                        {isSystemAdmin() 
                                          ? `SKU: ${item.sku || item.product?.sku || 'N/A'} • Stock: ${availableQty}`
                                          : `Dispatch: ${item.dispatch_number} • Available: ${availableQty}`
                                        }
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
                                        description: "This product is already in the repair list.",
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
                                          product_id: item.product_id,
                                          product_variant: item.variant_id || undefined,
                                          quantity: 1,
                                          notes: "",
                                          is_repairable: true,
                                          assignableItem: item
                                        }
                                      ]
                                    }));
                                    toast({
                                      title: "Item Added",
                                      description: `${item.product?.name || item.product_name} added to repair report`,
                                    });
                                  }}
                                  disabled={availableQty <= 0 || isAlreadyAdded}
                                  className="bg-[#E30040] hover:bg-[#E30040]/90"
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

          {/* Selected Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Items for Repair ({formData.items.length})
                  </CardTitle>
                  <CardDescription>
                    Items added to this repair report
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
                  <p className="text-sm">Use the search above to add products to this repair report</p>
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
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
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
                                {isSystemAdmin() 
                                  ? `SKU: ${selectedItem?.sku || selectedItem?.product?.sku || 'N/A'} • Available: ${availableQuantity}`
                                  : `Dispatch: ${selectedItem?.dispatch_number} • Available: ${availableQuantity}`
                                }
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

                            {/* Is Repairable */}
                            <div className="space-y-2">
                              <Label>Repairability Status</Label>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={item.is_repairable}
                                  onCheckedChange={(checked) => updateItem(index, { is_repairable: !!checked })}
                                />
                                <Label className="text-sm">Item is repairable</Label>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Item Notes */}
                            <div className="space-y-2">
                              <Label>Item Notes</Label>
                              <Textarea
                                placeholder="Additional details about this item's issue..."
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

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
              <CardDescription>
                Provide a detailed description of the repair issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="description">Repair Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue, symptoms, circumstances, or any additional context..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description}</p>
                )}
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
              disabled={isSubmitting || formData.items.length === 0}
              className="bg-[#E30040] hover:bg-[#E30040]/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4 mr-2" />
              )}
              Report Repair
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}