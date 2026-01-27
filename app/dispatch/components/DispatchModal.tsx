"use client";
import { useState, useEffect } from "react";
import { acknowledgeReceipt, markItemsReturned, type Dispatch, type DispatchItem } from "@/lib/dispatch";
import { DispatchItemManager } from "./DispatchItemManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Building2, 
  User, 
  Calendar, 
  FileText,
  RotateCcw,
} from "lucide-react";

// ... (omitting irrelevant lines) ...

import { format } from "date-fns";
import { toSentenceCase } from "@/lib/utils";

interface DispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispatch?: Dispatch | null;
  onClose: () => void;
  onRefresh?: () => void;
  onReturn?: (dispatch: Dispatch) => void;
}

export default function DispatchModal({ open, onOpenChange, dispatch, onClose, onRefresh, onReturn }: DispatchModalProps) {
  if (!dispatch) return null;

  // View mode for existing dispatch
  const [loading, setLoading] = useState(false);
  const [acknowledgingItems, setAcknowledgingItems] = useState<Record<string, number>>({});
  const [returningItems, setReturningItems] = useState<Record<string, { quantity: number; notes: string }>>({});
  const [currentDispatch, setCurrentDispatch] = useState<Dispatch | null>(dispatch);
  const { toast } = useToast();

  useEffect(() => {
    // Sync currentDispatch with prop
    setCurrentDispatch(dispatch);
    
    if (open) {
      // Initialize acknowledgment quantities with default values
      const initialAcknowledging: Record<string, number> = {};
      const initialReturning: Record<string, { quantity: number; notes: string }> = {};
      
      dispatch.dispatch_items?.forEach(item => {
        const remainingQuantity = item.quantity - item.received_quantity;
        initialAcknowledging[item.id] = remainingQuantity > 0 ? remainingQuantity : 0;
        initialReturning[item.id] = { quantity: 0, notes: "" };
      });
      
      setAcknowledgingItems(initialAcknowledging);
      setReturningItems(initialReturning);
    }
  }, [open, dispatch]);



  const handleAcknowledgeItems = async (items: { id: string; received_quantity: number }[]) => {
    if (!currentDispatch) return;
    
    setLoading(true);
    try {
      const response = await acknowledgeReceipt(currentDispatch.id, { items });
      
      // Update current dispatch state with the response data
      if (response.dispatch) {
        setCurrentDispatch(response.dispatch);
      }
      
      toast({
        title: "Success",
        description: `Successfully acknowledged receipt of ${items.length} item(s)`,
      });
      
      // Refresh the dispatch table in the background
      if (onRefresh) {
        onRefresh();
      }
      
      return response;
    } catch (error) {
      console.error('Acknowledgment failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to acknowledge receipt",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleReturnItems = async (items: { id: string; returned_quantity: number; return_notes?: string }[]) => {
    if (!currentDispatch) return;
    
    setLoading(true);
    try {
      await markItemsReturned(currentDispatch.id, items);
      toast({
        title: "Success",
        description: `Successfully marked ${items.length} item(s) as returned`,
      });
      
      // Refresh the dispatch table in the background
      if (onRefresh) {
        onRefresh();
      }
      
      onClose(); // Refresh data by closing and letting parent refetch
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark items as returned",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDispatchStatus = () => {
    if (!currentDispatch?.dispatch_items || currentDispatch.dispatch_items.length === 0) return "Empty";
    
    const items = currentDispatch.dispatch_items;
    
    // Check if any items have been returned
    const hasReturnedItems = items.some(item => item.is_returned);
    const allReturned = items.every(item => item.is_returned);
    
    // If all items are returned, status is "Returned"
    if (allReturned) return "Returned";
    
    // If some items are returned but not all, check overall progress
    const allReceived = items.every(item => item.received_quantity >= item.quantity);
    if (allReceived && hasReturnedItems) return "Partial Returns";
    if (allReceived) return "Received";
    
    const partiallyReceived = items.some(item => item.received_quantity > 0);
    if (partiallyReceived && hasReturnedItems) return "Partial w/ Returns";
    if (partiallyReceived) return "Partial";
    
    return "Pending";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      "Pending": "bg-yellow-100 text-yellow-800",
      "Partial": "bg-blue-100 text-blue-800",
      "Partial w/ Returns": "bg-orange-100 text-orange-800",
      "Received": "bg-green-100 text-green-800",
      "Partial Returns": "bg-purple-100 text-purple-800",
      "Returned": "bg-purple-100 text-purple-800",
      "Empty": "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge className={variants[status] || variants["Pending"]}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-KE', {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
    }).format(num).replace('KES', 'Ksh.');
  };

  const getItemsSummary = () => {
    if (!currentDispatch?.dispatch_items) return { total: 0, received: 0, returned: 0, products: 0 };
    
    const items = currentDispatch.dispatch_items;
    return {
      total: items.reduce((sum, item) => sum + item.quantity, 0),
      received: items.reduce((sum, item) => sum + item.received_quantity, 0),
      returned: items.reduce((sum, item) => sum + (item.returned_quantity || 0), 0),
      products: items.length
    };
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-4xl sm:max-w-4xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-xl font-semibold text-gray-900">
                {currentDispatch ? `Dispatch ${currentDispatch.dispatch_number}` : "Create Dispatch"}
              </SheetTitle>
              <SheetDescription className="text-sm text-gray-500">
                {currentDispatch ? "View and manage dispatch details" : "Create a new warehouse dispatch"}
              </SheetDescription>
            </div>
          </div>
          {dispatch && onReturn && (
            (() => {
              const canReturn = dispatch.dispatch_items?.some(item => 
                item.is_returnable && 
                !item.is_returned && 
                item.received_quantity > (item.returned_quantity || 0)
              );

              if (!canReturn) return null;

              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReturn(dispatch)}
                  className="ml-auto border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Return Items
                </Button>
              );
            })()
          )}
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentDispatch ? (
            <>
              {/* Dispatch Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Dispatch Information</span>
                    {getStatusBadge(getDispatchStatus())}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Dispatch Number</div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{currentDispatch.dispatch_number}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Type</div>
                      <div className="capitalize font-medium">{currentDispatch.type}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">From Store</div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{currentDispatch.from_store?.name}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">To Entity</div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{currentDispatch.to_entity ? toSentenceCase(currentDispatch.to_entity) : "-"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Created</div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{format(new Date(currentDispatch.created_at), "MMM dd, yyyy 'at' HH:mm")}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-sm font-medium text-gray-700 mb-3">Items Summary</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{getItemsSummary().total}</div>
                        <div className="text-xs text-gray-600">Total Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{getItemsSummary().received}</div>
                        <div className="text-xs text-gray-600">Received</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">{getItemsSummary().returned}</div>
                        <div className="text-xs text-gray-600">Returned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-600">{getItemsSummary().products}</div>
                        <div className="text-xs text-gray-600">Products</div>
                      </div>
                    </div>
                  </div>
                  
                  {currentDispatch.notes && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Notes</div>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm">{currentDispatch.notes}</div>
                    </div>
                  )}

                  {currentDispatch.acknowledged_by && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Acknowledged By</div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {currentDispatch.acknowledged_by.first_name} {currentDispatch.acknowledged_by.last_name}
                        </span>
                        <span className="text-sm text-gray-500">({currentDispatch.acknowledged_by.email})</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dispatch Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Dispatch Items</span>
                  </CardTitle>
                  <CardDescription>
                    {currentDispatch.dispatch_items?.length || 0} products in this dispatch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentDispatch.dispatch_items && currentDispatch.dispatch_items.length > 0 ? (
                    <DispatchItemManager
                      key={`dispatch-${currentDispatch.id}-${currentDispatch.updated_at}`}
                      dispatch={currentDispatch}
                      items={currentDispatch.dispatch_items}
                      onAcknowledgeItems={handleAcknowledgeItems}
                      onReturnItems={handleReturnItems}
                      loading={loading}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No items in this dispatch</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No dispatch selected</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
