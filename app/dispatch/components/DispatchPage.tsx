"use client";
import { useState, useEffect } from "react";
import { listDispatches, type Dispatch, type DispatchResponse } from "@/lib/dispatch";
import DispatchModal from "./DispatchModal";
import { CreateDispatchModal } from "./CreateDispatchModal";
import { DispatchTable } from "./DispatchTable";
import { EditDispatchModal } from "./EditDispatchModal";
import { DeleteDispatchConfirmationDialog } from "./DeleteDispatchConfirmationDialog";
import { ReturnItemsModal } from "./ReturnItemsModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Plus, RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function DispatchPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [dispatchToEdit, setDispatchToEdit] = useState<Dispatch | null>(null);
  const [dispatchToDelete, setDispatchToDelete] = useState<Dispatch | null>(null);
  const [dispatchToReturn, setDispatchToReturn] = useState<Dispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { toast } = useToast();

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const response: DispatchResponse = await listDispatches();
      
      setDispatches(response.dispatches.data);
    } catch (error) {
      console.error('Error fetching dispatches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dispatches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  const handleViewDispatch = (dispatch: Dispatch) => {
    if (!dispatch || !dispatch.id) {
      toast({
        title: "Error",
        description: "Invalid dispatch data. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedDispatch(dispatch);
    setModalOpen(true);
  };

  const handleCreateDispatch = () => {
    setSelectedDispatch(null);
    setCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedDispatch(null);
    setModalOpen(false);
    // Refresh data after modal closes
    fetchDispatches();
  };

  const handleRefresh = () => {
    fetchDispatches();
  };

  const handleEditDispatch = (dispatch: Dispatch) => {
    // Close any other modals first
    setModalOpen(false);
    setSelectedDispatch(null);
    // Then open edit modal
    setDispatchToEdit(dispatch);
    setEditModalOpen(true);
  };

  const handleDeleteDispatch = (dispatch: Dispatch) => {
    // Close any other modals first
    setModalOpen(false);
    setSelectedDispatch(null);
    // Then open delete modal
    setDispatchToDelete(dispatch);
    setDeleteModalOpen(true);
  };

  const handleReturnItems = (dispatch: Dispatch) => {
    // Close any other modals first
    setModalOpen(false);
    setSelectedDispatch(null);
    // Then open return modal
    setDispatchToReturn(dispatch);
    setReturnModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchDispatches();
    setDispatchToEdit(null);
    setEditModalOpen(false);
  };

  const handleDeleteSuccess = () => {
    fetchDispatches();
    setDispatchToDelete(null);
    setDeleteModalOpen(false);
  };

  const handleReturnSuccess = () => {
    fetchDispatches();
    setDispatchToReturn(null);
    setReturnModalOpen(false);
  };

  const handleCreateSuccess = () => {
    fetchDispatches();
    setCreateModalOpen(false);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page when searching
    
    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    // Set new timer - no need for API call, just local filtering
    const timer = setTimeout(() => {
      // Search is now handled by client-side filtering
    }, 300);
    
    setSearchDebounceTimer(timer);
  };

  const getStatsData = () => {
    const totalDispatches = dispatches.length;
    const pendingDispatches = dispatches.filter(d => 
      d.dispatch_items?.some(item => item.received_quantity < item.quantity)
    ).length;
    const completedDispatches = dispatches.filter(d => 
      d.dispatch_items?.every(item => item.received_quantity >= item.quantity)
    ).length;
    const returnedDispatches = dispatches.filter(d => 
      d.dispatch_items?.some(item => item.is_returned)
    ).length;
    
    return { totalDispatches, pendingDispatches, completedDispatches, returnedDispatches };
  };

  // Apply client-side filtering
  const filteredDispatches = dispatches.filter((dispatch) => {
    const q = search.toLowerCase();
    return (
      dispatch.dispatch_number?.toLowerCase().includes(q) ||
      dispatch.from_store?.name?.toLowerCase().includes(q) ||
      dispatch.to_entity?.toLowerCase().includes(q) ||
      dispatch.to_user?.first_name?.toLowerCase().includes(q) ||
      dispatch.to_user?.last_name?.toLowerCase().includes(q) ||
      dispatch.to_user?.email?.toLowerCase().includes(q) ||
      dispatch.notes?.toLowerCase().includes(q) ||
      dispatch.dispatch_items?.some(item => 
        item.product?.name?.toLowerCase().includes(q) ||
        item.variant?.name?.toLowerCase().includes(q)
      )
    );
  });

  const totalPages = Math.ceil(filteredDispatches.length / rowsPerPage);
  const paginatedDispatches = filteredDispatches.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const stats = getStatsData();

  return (
    <PermissionGuard permissions={["can_view_dispatch_menu", "can_manage_system", "can_manage_company"]}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dispatches</h1>
          <p className="text-muted-foreground">
            Manage warehouse dispatches and track inventory movements
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dispatches</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-12" /> : dispatches.length}
              </div>
              <p className="text-xs text-muted-foreground">
                All time dispatches
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Package className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-12" /> : stats.pendingDispatches}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting acknowledgment
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-12" /> : stats.completedDispatches}
              </div>
              <p className="text-xs text-muted-foreground">
                Fully received
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Returns</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-12" /> : stats.returnedDispatches}
              </div>
              <p className="text-xs text-muted-foreground">
                Have returned items
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="relative w-full max-w-xs">
            <Input
              className="pl-8 max-w-sm"
              placeholder="Search dispatches..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            
            </Button>
            <Button
              onClick={handleCreateDispatch}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white min-w-[160px] font-medium"
            >
              <Plus className="h-4 w-4" />
              Create Dispatch
            </Button>
          </div>
        </div>

        {/* Dispatches Table */}
        <DispatchTable 
          dispatches={paginatedDispatches}
          onViewDispatch={handleViewDispatch}
          onReturnItems={handleReturnItems}
          onEditDispatch={handleEditDispatch}
          onDeleteDispatch={handleDeleteDispatch}
          loading={loading}
        />

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => {
                setRowsPerPage(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={rowsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={() => setCurrentPage((old) => Math.max(old - 1, 1))}
              disabled={currentPage === 1}
              className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center justify-center text-sm font-medium">
              Page {currentPage} of {totalPages || 1}
            </div>
            <Button
              size="sm"
              onClick={() => setCurrentPage((old) => Math.min(old + 1, totalPages || 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modal */}
        <DispatchModal 
          open={modalOpen} 
          onOpenChange={setModalOpen} 
          dispatch={selectedDispatch} 
          onClose={handleCloseModal}
          onRefresh={handleRefresh}
          onReturn={handleReturnItems}
        />

        {/* Create Modal */}
        <CreateDispatchModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={handleCreateSuccess}
        />

        {/* Edit Modal */}
        <EditDispatchModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          dispatch={dispatchToEdit}
          onSuccess={handleEditSuccess}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteDispatchConfirmationDialog
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          dispatch={dispatchToDelete}
          onSuccess={handleDeleteSuccess}
        />

        {/* Return Items Modal */}
        <ReturnItemsModal
          open={returnModalOpen}
          onOpenChange={setReturnModalOpen}
          dispatch={dispatchToReturn}
          onSuccess={handleReturnSuccess}
        />
      </div>
    </PermissionGuard>
  );
}
