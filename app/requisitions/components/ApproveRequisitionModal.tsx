"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  CheckCircle,
  User,
  ClipboardList,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { approveRequisition, type Requisition } from "@/lib/requisitions";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";

interface ApproveRequisitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  requisition: Requisition | null;
}

export function ApproveRequisitionModal({ 
  open, 
  onOpenChange, 
  onSuccess, 
  requisition,
}: ApproveRequisitionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("Approved");
  ;

  const handleApprove = async () => {
    if (!requisition) return;

    setLoading(true);
    
    try {
      const payload = {
        approved_by: user?.id || requisition.approver_id || "",
        approval_status: "approved" as const,
        notes: notes || "Approved",
      };

      if (!payload.approved_by) {
        toast.error("Could not identify the approver. Please reload and try again.");
        setLoading(false);
        return;
      }
      
      const response = await approveRequisition(requisition.id, payload);

      toast.success(`Requisition ${requisition.requisition_number} has been approved successfully.`);

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Approve error:', error);
      toast.error(error.message || "Failed to approve requisition");
    } finally {
      setLoading(false);
    }
  };

  // Check if requisition can be approved (only pending approval status)
  const canApprove = requisition?.approval_status === "pending";

  if (!canApprove && requisition) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>Cannot Approve Requisition</SheetTitle>
            <SheetDescription>
              Requisition {requisition.requisition_number} cannot be approved
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                This requisition has already been {requisition.approval_status}.
                Only pending requisitions can be approved.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4 border-t mt-auto">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Approve Requisition</SheetTitle>
          <SheetDescription>
            {requisition ? `Approve requisition ${requisition.requisition_number}` : "Approve requisition"}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-6">
            {/* Requisition Summary */}
            {requisition && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ClipboardList className="h-5 w-5" />
                    <span>Requisition Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Requisition Number</Label>
                      <p className="text-sm text-gray-700">{requisition.requisition_number}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created Date</Label>
                      <p className="text-sm text-gray-700">
                        {format(new Date(requisition.created_at), "MMM dd, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Requester</Label>
                    <div className="flex items-center space-x-3 mt-1">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {requisition.requester.first_name[0]}
                          {requisition.requester.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {requisition.requester.first_name} {requisition.requester.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{requisition.requester.email}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Items</Label>
                    <p className="text-sm text-gray-700">
                      {requisition.items.length} item{requisition.items.length !== 1 ? 's' : ''} • Total Qty: {requisition.items.reduce((sum, item) => sum + (item.quantity_requested || 0), 0)}
                    </p>
                  </div>

                  {requisition.notes && (
                    <div>
                      <Label className="text-sm font-medium">Request Notes</Label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md mt-1">
                        {requisition.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">Current Status:</Label>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      Pending Approval
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Approval Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approval Notes</CardTitle>
                <CardDescription>
                  Add any notes or comments regarding this approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter approval notes (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-gray-500">
                    Default: "Approved" - You can add specific comments if needed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t mt-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
            onClick={handleApprove}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Requisition
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}