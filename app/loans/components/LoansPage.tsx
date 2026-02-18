"use client";

import { useState, useEffect } from "react";
import { listDispatches, type Dispatch, type DispatchResponse } from "@/lib/dispatch";
import { LoansTable, getLoanStatus } from "./LoansTable";
import { ReturnItemsModal } from "@/app/dispatch/components/ReturnItemsModal";
import { DeleteDispatchConfirmationDialog } from "@/app/dispatch/components/DeleteDispatchConfirmationDialog";
import DispatchModal from "@/app/dispatch/components/DispatchModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, HandCoins, AlertTriangle, RotateCcw, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function LoansPage() {
  const [loans, setLoans] = useState<Dispatch[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Dispatch | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loanToReturn, setLoanToReturn] = useState<Dispatch | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<Dispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  ;

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const response: DispatchResponse = await listDispatches();
      // Option A: only returnable dispatches live here
      const returnable = response.dispatches.data.filter(d => d.is_returnable);
      setLoans(returnable);
    } catch (error) {
      console.error("Error fetching loans:", error);
      toast.error("Failed to fetch loans. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  // Stats
  const totalLoans    = loans.length;
  const activeLoans   = loans.filter(l => getLoanStatus(l) === "On Loan").length;
  const overdueLoans  = loans.filter(l => getLoanStatus(l) === "Overdue").length;
  const returnedLoans = loans.filter(l => getLoanStatus(l) === "Returned").length;

  // Filtering
  const filteredLoans = loans.filter((loan) => {
    if (statusFilter !== "all" && getLoanStatus(loan) !== statusFilter) return false;
    const q = search.toLowerCase();
    return (
      loan.dispatch_number?.toLowerCase().includes(q) ||
      loan.from_store?.name?.toLowerCase().includes(q) ||
      loan.to_entity?.toLowerCase().includes(q) ||
      loan.to_user?.first_name?.toLowerCase().includes(q) ||
      loan.to_user?.last_name?.toLowerCase().includes(q) ||
      loan.to_user?.email?.toLowerCase().includes(q) ||
      loan.notes?.toLowerCase().includes(q) ||
      loan.dispatch_items?.some(item =>
        item.product?.name?.toLowerCase().includes(q) ||
        item.variant?.name?.toLowerCase().includes(q)
      )
    );
  });

  const totalPages = Math.ceil(filteredLoans.length / rowsPerPage);
  const paginatedLoans = filteredLoans.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleViewLoan = (loan: Dispatch) => {
    setSelectedLoan(loan);
    setDetailOpen(true);
  };

  const handleReturnItems = (loan: Dispatch) => {
    setDetailOpen(false);
    setSelectedLoan(null);
    setLoanToReturn(loan);
    setReturnOpen(true);
  };

  const handleDeleteLoan = (loan: Dispatch) => {
    setLoanToDelete(loan);
    setDeleteOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  return (
    <PermissionGuard permissions={["can_view_dispatch_menu", "can_manage_system", "can_manage_company"]}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground">
            Track items issued on loan and monitor returns
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
              <HandCoins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-12" /> : totalLoans}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loading ? <Skeleton className="h-8 w-12" /> : activeLoans}
              </div>
              <p className="text-xs text-muted-foreground">Currently out</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {loading ? <Skeleton className="h-8 w-12" /> : overdueLoans}
              </div>
              <p className="text-xs text-muted-foreground">Past return date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Returned</CardTitle>
              <RotateCcw className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {loading ? <Skeleton className="h-8 w-12" /> : returnedLoans}
              </div>
              <p className="text-xs text-muted-foreground">Fully returned</p>
            </CardContent>
          </Card>
        </div>

        {/* Search, Filter & Actions */}
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Input
                className="pl-8"
                placeholder="Search loans..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="On Loan">On Loan</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Partially Returned">Partially Returned</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={fetchLoans} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        {/* Table */}
        <LoansTable
          loans={paginatedLoans}
          onViewLoan={handleViewLoan}
          onReturnItems={handleReturnItems}
          onDeleteLoan={handleDeleteLoan}
          loading={loading}
        />

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={rowsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 30, 50].map(s => (
                  <SelectItem key={s} value={s.toString()}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm font-medium">Page {currentPage} of {totalPages || 1}</span>
            <Button
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages || 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Detail modal (reuse DispatchModal — it already handles returns) */}
        <DispatchModal
          open={detailOpen}
          onOpenChange={setDetailOpen}
          dispatch={selectedLoan}
          onClose={() => { setSelectedLoan(null); setDetailOpen(false); fetchLoans(); }}
          onRefresh={fetchLoans}
          onReturn={handleReturnItems}
        />

        {/* Return Items */}
        <ReturnItemsModal
          open={returnOpen}
          onOpenChange={setReturnOpen}
          dispatch={loanToReturn}
          onSuccess={() => { setLoanToReturn(null); setReturnOpen(false); fetchLoans(); }}
        />

        {/* Delete */}
        <DeleteDispatchConfirmationDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          dispatch={loanToDelete}
          onSuccess={() => { setLoanToDelete(null); setDeleteOpen(false); fetchLoans(); }}
        />
      </div>
    </PermissionGuard>
  );
}
