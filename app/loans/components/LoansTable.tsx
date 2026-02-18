"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Eye, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toSentenceCase } from "@/lib/utils";
import { format, isPast, parseISO } from "date-fns";
import { Dispatch } from "@/lib/dispatch";

interface LoansTableProps {
  loans: Dispatch[];
  onViewLoan: (loan: Dispatch) => void;
  onReturnItems?: (loan: Dispatch) => void;
  onDeleteLoan?: (loan: Dispatch) => void;
  loading?: boolean;
}

export type LoanStatus = "Pending" | "On Loan" | "Overdue" | "Partially Returned" | "Returned" | "Empty";

export function getLoanStatus(loan: Dispatch): LoanStatus {
  const items = loan.dispatch_items || [];
  if (items.length === 0) return "Empty";

  const allReturned = items.every(item => item.is_returned);
  if (allReturned) return "Returned";

  const someReturned = items.some(item => item.is_returned);
  if (someReturned) return "Partially Returned";

  // Not yet acknowledged / received
  const anyReceived = items.some(item => item.received_quantity > 0);
  if (!anyReceived) return "Pending";

  // Items are out — check if overdue
  const returnDate = loan.return_date || items.find(i => i.return_date)?.return_date;
  if (returnDate && isPast(parseISO(returnDate))) return "Overdue";

  return "On Loan";
}

export function getLoanStatusBadge(status: LoanStatus) {
  const variants: Record<LoanStatus, { className: string; text: string }> = {
    "Pending":            { className: "bg-yellow-100 text-yellow-800 border-yellow-200",     text: "Pending" },
    "On Loan":            { className: "bg-red-100 text-red-700 border-red-200",               text: "On Loan" },
    "Overdue":            { className: "bg-red-600 text-white border-red-700",                 text: "Overdue" },
    "Partially Returned": { className: "bg-orange-100 text-orange-700 border-orange-200",      text: "Partially Returned" },
    "Returned":           { className: "bg-purple-100 text-purple-700 border-purple-200",      text: "Returned" },
    "Empty":              { className: "bg-gray-100 text-gray-600 border-gray-200",            text: "Empty" },
  };
  const v = variants[status];
  return (
    <Badge variant="outline" className={v.className}>
      {status === "Overdue" && <AlertTriangle className="h-3 w-3 mr-1" />}
      {v.text}
    </Badge>
  );
}

function getReturnDateDisplay(loan: Dispatch) {
  const returnDate = loan.return_date || loan.dispatch_items?.find(i => i.return_date)?.return_date;
  if (!returnDate) return <span className="text-muted-foreground text-sm">—</span>;

  const date = parseISO(returnDate);
  const overdue = isPast(date);
  return (
    <div className={overdue ? "text-red-600 font-medium" : "text-sm"}>
      <div>{format(date, "MMM dd, yyyy")}</div>
      {overdue && <div className="text-xs text-red-500">Overdue</div>}
    </div>
  );
}

export function LoansTable({
  loans,
  onViewLoan,
  onReturnItems,
  onDeleteLoan,
  loading = false,
}: LoansTableProps) {
  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Loan #</TableHead>
            <TableHead className="font-semibold">From Store</TableHead>
            <TableHead className="font-semibold">To Entity</TableHead>
            <TableHead className="font-semibold">Issued To</TableHead>
            <TableHead className="font-semibold">Items</TableHead>
            <TableHead className="font-semibold">Return Date</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Issued On</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#E30040]" />
                  <span>Loading loans...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : loans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                No loans found
              </TableCell>
            </TableRow>
          ) : (
            loans.map((loan) => {
              const status = getLoanStatus(loan);
              const total = loan.dispatch_items?.reduce((s, i) => s + i.quantity, 0) || 0;
              const returned = loan.dispatch_items?.reduce((s, i) => s + (i.returned_quantity || 0), 0) || 0;

              return (
                <TableRow
                  key={loan.id}
                  className="hover:bg-[#E30040]/5 transition-colors duration-200 cursor-pointer"
                  onClick={() => onViewLoan(loan)}
                >
                  <TableCell className="font-medium">{loan.dispatch_number}</TableCell>
                  <TableCell>{loan.from_store?.name || "—"}</TableCell>
                  <TableCell>
                    {loan.to_entity
                      ? <span className="font-medium">{toSentenceCase(loan.to_entity)}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {loan.to_user ? (
                      <div>
                        <div>{loan.to_user.first_name} {loan.to_user.last_name}</div>
                        <div className="text-xs text-muted-foreground">{loan.to_user.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{loan.dispatch_items?.length || 0} product{(loan.dispatch_items?.length || 0) !== 1 ? "s" : ""}</div>
                      <div className="text-xs text-muted-foreground">
                        {total} unit{total !== 1 ? "s" : ""}
                        {returned > 0 && <span className="text-purple-600 ml-1">• {returned} returned</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getReturnDateDisplay(loan)}</TableCell>
                  <TableCell>{getLoanStatusBadge(status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(loan.created_at), "MMM dd, yyyy")}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(loan.created_at), "HH:mm")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <LoanActionsDropdown
                      loan={loan}
                      status={status}
                      onView={() => onViewLoan(loan)}
                      onReturn={onReturnItems ? () => onReturnItems(loan) : undefined}
                      onDelete={onDeleteLoan ? () => onDeleteLoan(loan) : undefined}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function LoanActionsDropdown({
  loan,
  status,
  onView,
  onReturn,
  onDelete,
}: {
  loan: Dispatch;
  status: LoanStatus;
  onView: () => void;
  onReturn?: () => void;
  onDelete?: () => void;
}) {
  const canReturn =
    (status === "On Loan" || status === "Overdue" || status === "Partially Returned") &&
    loan.dispatch_items?.some(
      item => item.is_returnable && !item.is_returned && item.received_quantity > (item.returned_quantity || 0)
    ) &&
    onReturn;

  const canDelete = status === "Pending" && onDelete;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4 mr-2" /> View Details
        </DropdownMenuItem>
        {canReturn && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onReturn}>
              <RotateCcw className="h-4 w-4 mr-2" /> Return Items
            </DropdownMenuItem>
          </>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="h-4 w-4 mr-2" /> Delete Loan
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
