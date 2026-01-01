"use client";
import { useState, useEffect } from "react";
import { returnItems, type Dispatch, type DispatchItem } from "@/lib/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { X, RotateCcw, Loader2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReturnItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispatch: Dispatch | null;
  onSuccess?: () => void;
}

interface ReturnItemData {
  id: string;
  returned_quantity: number;
  return_notes: string;
  max_quantity: number;
  product_name: string;
  variant_name?: string;
}

export function ReturnItemsModal({ open, onOpenChange, dispatch, onSuccess }: ReturnItemsModalProps) {
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [returnItemsData, setReturnItemsData] = useState<ReturnItemData[]>([]);
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

  // Initialize return items when dispatch changes
  useEffect(() => {
    if (dispatch && open) {
      const returnable = dispatch.dispatch_items?.filter(item => 
        item.is_returnable && 
        !item.is_returned && 
        item.received_quantity > (item.returned_quantity || 0)
      ) || [];

      setReturnItemsData(returnable.map(item => ({
        id: item.id,
        returned_quantity: 0,
        return_notes: "",
        max_quantity: item.received_quantity - (item.returned_quantity || 0),
        product_name: item.product.name,
        variant_name: item.variant?.name,
      })));
    }
  }, [dispatch, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check if at least one item has quantity > 0
    const hasItems = returnItemsData.some(item => item.returned_quantity > 0);
    if (!hasItems) {
      newErrors.general = "At least one item must have a return quantity greater than 0";
    }

    // Validate individual items
    returnItemsData.forEach((item, index) => {
      if (item.returned_quantity < 0) {
        newErrors[`item_${index}_quantity`] = "Quantity cannot be negative";
      }
      if (item.returned_quantity > item.max_quantity) {
        newErrors[`item_${index}_quantity`] = `Maximum returnable quantity is ${item.max_quantity}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dispatch || !validateForm()) return;

    const itemsToReturn = returnItemsData.filter(item => item.returned_quantity > 0);
    
    if (itemsToReturn.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to return with a quantity greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await returnItems(dispatch.id, {
        items: itemsToReturn.map(item => ({
          id: item.id,
          returned_quantity: item.returned_quantity,
          return_notes: item.return_notes || undefined,
        })),
      });

      toast({
        title: "Success",
        description: response.message || "Items returned successfully!",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error returning items:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to return items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReturnItemsData([]);
    setErrors({});
    onOpenChange(false);
  };

  const updateItem = (index: number, updates: Partial<ReturnItemData>) => {
    setReturnItemsData(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, ...updates } : item
      )
    );
  };

  if (!dispatch || !isVisible) return null;

  const returnableItems = returnItemsData.length > 0;

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
      
      {/* Centered Modal */}
      <div
        className={cn(
          "fixed left-[50%] top-[50%] z-[100] grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white shadow-lg duration-200 sm:rounded-lg",
          open ? "animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]" : "animate-out fade-out-0 zoom-out-95 slide-out-to-left-1/2 slide-out-to-top-[48%]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <RotateCcw className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Return Items
              </h2>
              <p className="text-sm text-gray-500">
                Return items from dispatch {dispatch.dispatch_number}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {!returnableItems ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No Returnable Items</p>
              <p className="text-sm">All items in this dispatch have already been returned or are not marked as returnable.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {errors.general}
                </div>
              )}
              
              <div className="space-y-4">
                {returnItemsData.map((item, index) => (
                  <Card key={item.id} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {item.product_name}
                        {item.variant_name && (
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            ({item.variant_name})
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Maximum returnable quantity: {item.max_quantity}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Return Quantity *</Label>
                          <Input
                            type="number"
                            min="0"
                            max={item.max_quantity}
                            value={item.returned_quantity}
                            onChange={(e) => updateItem(index, { returned_quantity: parseInt(e.target.value) || 0 })}
                            className={errors[`item_${index}_quantity`] ? "border-red-500" : ""}
                          />
                          {errors[`item_${index}_quantity`] && (
                            <p className="text-sm text-red-600">{errors[`item_${index}_quantity`]}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Return Notes</Label>
                          <Textarea
                            value={item.return_notes}
                            onChange={(e) => updateItem(index, { return_notes: e.target.value })}
                            placeholder="Reason for return (optional)"
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {returnableItems && (
          <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Return Items
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}