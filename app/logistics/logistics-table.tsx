"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Upload,
  TruckIcon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Bell,
  FileText,
  RefreshCw,
  Trash2,
  CheckSquare,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getLogistics, type Logistics } from "@/lib/logistics"
import { format } from "date-fns"
// import { LogisticsDetailsSheet } from "./logistics-details-sheet"
// import { CreateLogisticsSheet } from "./components/create-logistics-sheet"

type LogisticsEntry = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_address: string
  delivery_status: string
  created_at: string
}

export function LogisticsTable() {
  const [logistics, setLogistics] = useState<Logistics[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isAddLogisticsOpen, setIsAddLogisticsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedLogistics, setSelectedLogistics] = useState<string[]>([])
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false)
  const [selectedLogisticsId, setSelectedLogisticsId] = useState<string | null>(null)
  const [isLogisticsDetailsOpen, setIsLogisticsDetailsOpen] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to get data from cache first
      const cachedData = getCachedLogistics()
      if (cachedData) {
        setLogistics(cachedData)
        setIsLoading(false)
      }
      // Fetch fresh data regardless of cache status
      fetchLogistics()
    }
  }, [])

  // Cache utility functions
  function getCachedLogistics(): Logistics[] | null {
    try {
      const cachedString = localStorage.getItem('logistics_cache')
      if (!cachedString) return null
      
      const cache = JSON.parse(cachedString)
      const now = Date.now()
      
      // Cache is valid for 5 minutes
      if (now - cache.timestamp < 5 * 60 * 1000) {
        return cache.data
      }
      return null
    } catch (e) {
      return null
    }
  }
  
  function cacheLogistics(data: Logistics[]): void {
    try {
      localStorage.setItem('logistics_cache', JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (e) {
      //
    }
  }

  async function fetchLogistics() {
    setIsLoading(true)
    setError(null)
    
    try {
      // Add a small delay to ensure auth is loaded (helps with race conditions)
      if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const logisticsData = await getLogistics({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined
      })
      
      // Filter out any null or undefined entries
      const validLogistics = logisticsData.filter(item => item != null)
      
      setLogistics(validLogistics)
      setLastRefreshTime(new Date())
      
      // Cache the data
      cacheLogistics(validLogistics)
    } catch (error: any) {
      setError(error instanceof Error ? error : new Error('Failed to fetch logistics data'))
      
      // Don't clear existing data on error if we have some
      if (logistics.length === 0) {
        setLogistics([]) // Only set empty array if we don't already have data
      }
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLogistics = logistics
    .filter((entry) => entry != null) // Filter out any null or undefined entries
    .filter((entry) => {
      // Status filter
      const statusMatch = statusFilter === "all" || 
        (entry.delivery_status && entry.delivery_status.toLowerCase() === statusFilter.toLowerCase());
      
      // Search filter with null checks
      const searchLower = search.toLowerCase();
      const trackingNumberMatch = entry.tracking_number?.toLowerCase().includes(searchLower) || false;
      const recipientNameMatch = entry.recipient_name?.toLowerCase().includes(searchLower) || false;
      const recipientPhoneMatch = entry.recipient_phone?.toLowerCase().includes(searchLower) || false;
      const providerMatch = entry.logistics_provider?.toLowerCase().includes(searchLower) || false;
      const cityMatch = entry.city?.toLowerCase().includes(searchLower) || false;
      const addressMatch = entry.delivery_address?.toLowerCase().includes(searchLower) || false;
      
      return statusMatch && (
        !search || // If no search term, include all
        trackingNumberMatch || 
        recipientNameMatch || 
        recipientPhoneMatch || 
        providerMatch ||
        cityMatch ||
        addressMatch
      );
    });

  const totalPages = Math.ceil(filteredLogistics.length / rowsPerPage)
  const paginatedLogistics = filteredLogistics.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  const handleLogisticsCreated = () => {
    fetchLogistics()
  }

  const handleRowClick = (logisticsId: string) => {
    setSelectedLogisticsId(logisticsId)
    setIsLogisticsDetailsOpen(true)
  }

  const toggleSelectLogistics = (e: React.MouseEvent, logisticsId: string) => {
    e.stopPropagation()
    setSelectedLogistics((prev) => {
      if (prev.includes(logisticsId)) {
        return prev.filter((id) => id !== logisticsId)
      } else {
        return [...prev, logisticsId]
      }
    })
  }

  const toggleSelectAll = () => {
    if (selectedLogistics.length === paginatedLogistics.length) {
      setSelectedLogistics([])
    } else {
      setSelectedLogistics(paginatedLogistics.map((entry) => entry.id))
    }
  }

  const handleBulkAction = (action: string) => {
    // Implement bulk actions here
    setIsBulkActionOpen(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm")
    } catch (e) {
      return dateString
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "dispatched":
      case "in_transit":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "failed":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <Input
                className="pl-8 max-w-sm"
                placeholder="Search logistics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] pl-8">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex space-x-2">
            {selectedLogistics.length > 0 && (
              <TooltipProvider>
                <DropdownMenu open={isBulkActionOpen} onOpenChange={setIsBulkActionOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm" className="bg-[#1E2764] hover:bg-[#1E2764]/90">
                          <CheckSquare className="mr-2 h-4 w-4" />
                          {selectedLogistics.length} Selected
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Perform actions on selected logistics</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkAction("message")}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Message
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("notify")}>
                      <Bell className="mr-2 h-4 w-4" />
                      Send Notification
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("export")}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export Data
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("status")}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Update Status
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleBulkAction("delete")}
                      className="text-primary focus:text-primary"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipProvider>
            )}
            <Button
              size="sm"
              onClick={() => setIsAddLogisticsOpen(true)}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <TruckIcon className="mr-2 h-4 w-4" />
              Add Delivery
            </Button>
            <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <div className="relative">
              <input type="file" id="import-file" className="hidden" accept=".csv" onChange={() => {}} />
              <Button onClick={() => document.getElementById("import-file")?.click()} size="sm" className="bg-primary text-white hover:bg-primary/90">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        </div>
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedLogistics.length === paginatedLogistics.length && paginatedLogistics.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all logistics"
                      className="rounded-sm"
                    />
                  </div>
                </TableHead>
                <TableHead className="font-semibold">Tracking #</TableHead>
                <TableHead className="font-semibold">Recipient</TableHead>
                <TableHead className="font-semibold">Destination</TableHead>
                <TableHead className="font-semibold">Provider</TableHead>
                <TableHead className="font-semibold">Method</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Est. Delivery</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: rowsPerPage }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ))
                : paginatedLogistics.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={`hover:bg-[#1E2764]/5 transition-colors duration-200 cursor-pointer ${
                        selectedLogistics.includes(entry.id) ? "bg-[#1E2764]/10" : ""
                      }`}
                      onClick={() => handleRowClick(entry.id)}
                    >
                      <TableCell>
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedLogistics.includes(entry.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedLogistics([...selectedLogistics, entry.id])
                              } else {
                                setSelectedLogistics(selectedLogistics.filter((id) => id !== entry.id))
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${entry.tracking_number}`}
                            className="rounded-sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium font-mono text-sm">{entry.tracking_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.recipient_name || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">{entry.recipient_phone || "No phone"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px]">
                          <div className="truncate" title={entry.delivery_address}>{entry.delivery_address || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">{entry.city}{entry.state ? `, ${entry.state}` : ""}</div>
                        </div>
                      </TableCell>
                      <TableCell>{entry.logistics_provider || "N/A"}</TableCell>
                      <TableCell>{capitalize(entry.delivery_method || "N/A")}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(entry.delivery_status)}>
                          {capitalize(entry.delivery_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(entry.estimated_delivery_time)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRowClick(entry.id)
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Update Status</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
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
              className="bg-primary text-white hover:bg-primary/90"
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
              className="bg-primary text-white hover:bg-primary/90"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Logistics Details Sheet - To be implemented */}
      {selectedLogisticsId && (
        <div className="hidden">
          {/* Uncomment when LogisticsDetailsSheet is implemented */}
          {/* <LogisticsDetailsSheet
            logisticsId={selectedLogisticsId}
            isOpen={isLogisticsDetailsOpen}
            onClose={() => {
              setIsLogisticsDetailsOpen(false)
              setSelectedLogisticsId(null)
            }}
          /> */}
        </div>
      )}

      {/* Create Logistics Sheet - To be implemented */}
      <div className="hidden">
        {/* Uncomment when CreateLogisticsSheet is implemented */}
        {/* <CreateLogisticsSheet
          isOpen={isAddLogisticsOpen}
          onOpenChange={setIsAddLogisticsOpen}
          onLogisticsCreated={handleLogisticsCreated}
        /> */}
      </div>
    </>
  )
}
