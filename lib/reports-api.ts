import apiCall from "./api"
import { getApiUrl } from "./config"
import { getToken } from "./token-manager"

// ============================================================================
// Types
// ============================================================================

export type ReportPeriod =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"

export type GroupBy = "hour" | "day" | "week" | "month" | "quarter" | "year"

export interface ReportFilters {
  period?: ReportPeriod
  start_date?: string
  end_date?: string
  store_id?: string
  per_page?: number
  page?: number
  group_by?: GroupBy
  export?: "csv"
  [key: string]: string | number | undefined
}

export interface ReportMeta {
  report_name: string
  generated_at: string
  period?: {
    start: string
    end: string
    preset?: ReportPeriod
  }
  filters?: {
    store_id?: string | null
    group_by?: string | null
  }
}

export interface PaginatedData<T> {
  current_page: number
  data: T[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: { url: string | null; label: string; active: boolean }[]
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

export interface ReportResponse<T, S = Record<string, unknown>> {
  success: boolean
  data: T
  summary?: S
  meta: ReportMeta
}

// ============================================================================
// Available Reports Response
// ============================================================================

export interface AvailableReport {
  name: string
  label: string
  description: string
}

export interface AvailableReportsResponse {
  success: boolean
  data: {
    available_reports: {
      inventory: AvailableReport[]
      products: AvailableReport[]
      purchase: AvailableReport[]
      suppliers: AvailableReport[]
      dispatch: AvailableReport[]
      breakage: AvailableReport[]
      repairs: AvailableReport[]
      requisitions: AvailableReport[]
      stock_adjustments: AvailableReport[]
    }
    available_periods: ReportPeriod[]
  }
}

// ============================================================================
// Inventory Report Types
// ============================================================================

export interface StockLevelItem {
  id: string
  name: string
  sku: string
  product_code: string
  category: string
  store_id: string
  stock_quantity: number
  on_hand: number
  allocated: number
  low_stock_threshold: number
  unit_cost: string
  price: string
  available_quantity: number
  stock_value: string
}

export interface StockLevelsSummary {
  total_products: number
  out_of_stock: number
  low_stock: number
  adequate_stock: number
  total_units: number
  total_stock_value: string
}

export interface LowStockItem {
  id: string
  name: string
  sku: string
  product_code: string
  category: string
  store_id: string
  on_hand: number
  low_stock_threshold: number
  supplier_id: string | null
  unit_cost: string
  shortage_quantity: number
  stock_status: "out_of_stock" | "low_stock"
  supplier: { id: string; name: string } | null
}

export interface LowStockSummary {
  total_products_affected: number
  out_of_stock_count: number
  low_stock_count: number
  total_shortage_quantity: number
}

export interface StockValuationCategory {
  category: string
  product_count: number
  total_units: number
  cost_value: string
  retail_value: string
}

export interface StockValuationStore {
  store_id: string
  store_name: string
  product_count: number
  total_units: number
  cost_value: string
}

export interface StockValuationTotal {
  total_units: number
  total_cost_value: string
  total_retail_value: string
  potential_profit: string
  profit_margin: number
}

export interface StockValuationData {
  by_category: StockValuationCategory[]
  by_store: StockValuationStore[]
  total: StockValuationTotal
}

export interface StockMovementItem {
  id: string
  movement_date: string
  type: string
  quantity: number
  reference_type: string
  reference_id: string
  notes: string
  product: { id: string; name: string; sku: string }
  store: { id: string; name: string }
  created_by: { id: string; first_name: string; last_name: string }
}

export interface StockMovementSummary {
  by_type: { type: string; count: number; total_quantity: number }[]
}

export interface StockByStoreItem {
  store_id: string
  store_name: string
  store_code: string | null
  total_products: number
  total_units: number
  total_value: number
  out_of_stock_count: number
  low_stock_count: number
}

// ============================================================================
// Product Report Types
// ============================================================================

export interface ProductSummaryData {
  summary: {
    total_products: number
    active_products: number
    inactive_products: number
    low_stock_products: number
    out_of_stock_products: number
    total_inventory_value: number
    total_potential_value: number
    potential_profit: number
  }
  products: {
    id: string
    product_number: string
    product_code: string | null
    name: string
    sku: string | null
    barcode: string | null
    price: number
    unit_cost: number
    stock_quantity: number
    low_stock_threshold: number
    is_active: boolean
    is_featured: boolean
    track_inventory: boolean
    category: { id: string; name: string } | null
    supplier: { id: string; name: string } | null
    store: { id: string; name: string } | null
    stock_status: "in_stock" | "low_stock" | "out_of_stock"
    inventory_value: number
    potential_value: number
    primary_image_url: string | null
    created_at: string
    updated_at: string
  }[]
  filter_options: {
    categories: { id: string; name: string; product_count: number }[]
    suppliers: { id: string; name: string; product_count: number }[]
    stores: { id: string; name: string; product_count: number }[]
    status_options: { value: string; label: string }[]
    sort_options: { value: string; label: string }[]
  }
  applied_filters: {
    store_id: string | null
    supplier_id: string | null
    category_id: string | null
    status: string
    search: string | null
    sort_by: string
    sort_order: string
  }
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number
    to: number
  }
  generated_at: string
}

export interface ProductByCategoryItem {
  category: string
  product_count: number
  total_stock: number
  total_value: string
  avg_price: string
  min_price: string
  max_price: string
}

export interface ProductBySupplierItem {
  supplier_id: string | null
  supplier_name: string | null
  product_count: number
  total_stock: number
  total_value: string
}

// ============================================================================
// Purchase Order Report Types
// ============================================================================

export interface PurchaseSummaryData {
  summary: {
    total_orders: number
    unique_suppliers: number
    completed_orders: number
    pending_orders: number
    cancelled_orders: number
  }
  time_series: { period: string; order_count: number }[]
  by_status: { status: string; count: number }[]
}

export interface PurchaseBySupplierItem {
  supplier_id: string
  supplier_name: string
  order_count: number
  completed_count: number
}

export interface PurchaseByStatusItem {
  status: string
  count: number
  unique_suppliers: number
  percentage: number
}

export interface ProductReceiptItem {
  id: string
  receipt_number: string
  total_amount: string
  created_at: string
  supplier: { id: string; name: string }
  store: { id: string; name: string }
}

export interface ProductReceiptsSummary {
  total_receipts: number
  unique_suppliers: number
  total_value: string
}

// Purchase Order Summary Types
export interface PurchaseOrderSummaryItem {
  id: string
  po_number: string
  date: string
  supplier: { id: string; name: string } | null
  status: string
  items_count: number
  total_quantity: number
  total_amount: number | string
  expected_delivery: string | null
  store: { id: string; name: string } | null
}

export interface PurchaseOrderSummarySummary {
  total_orders: number
  total_value: number | string
  pending_orders: number
  approved_orders: number
  completed_orders: number
  cancelled_orders: number
  by_status: { status: string; count: number; value: number }[]
}

// Purchase Order Receipt Types
export interface PurchaseOrderReceiptItem {
  id: string
  receipt_number: string
  receipt_date: string
  po_number: string
  supplier: { id: string; name: string } | null
  items_received: number
  quantity_received: number
  total_value: number | string
  status: string
  store: { id: string; name: string } | null
}

export interface PurchaseOrderReceiptsSummary {
  total_receipts: number
  total_value: number | string
  items_received: number
  unique_suppliers: number
  by_status: { status: string; count: number }[]
}

// Purchase Orders by Status Types
export interface PurchaseOrdersByStatusItem {
  status: string
  count: number
  total_amount: number | string
  percentage: number
}

// Purchase Orders by Supplier Types
export interface PurchaseOrdersBySupplierItem {
  supplier: { id: string; name: string; contact_person?: string }
  order_count: number
  total_amount: number | string
  pending_orders: number
  received_orders: number
  total_quantity: number
}

// ============================================================================
// Supplier Report Types
// ============================================================================

export interface SupplierSummaryItem {
  id: string
  name: string
  email: string
  phone: string
  is_active: boolean
  payment_terms_type: string
  payment_terms_days: number
  purchase_orders_count: number
}

export interface SupplierSummarySummary {
  total_suppliers: number
  active_suppliers: number
  inactive_suppliers: number
}

export interface SupplierPerformanceItem {
  supplier_id: string
  supplier_name: string
  is_active: boolean
  total_orders: number
  completed_orders: number
  pending_orders: number
  cancelled_orders: number
  completion_rate: number
}

// ============================================================================
// Dispatch Report Types
// ============================================================================

export interface DispatchSummaryItem {
  id: string
  dispatch_number: string
  from_store_id: string
  to_entity: string
  to_user_id: string
  type: "internal" | "external"
  is_returnable: boolean
  return_date: string | null
  is_returned: boolean
  returned_by: string | null
  approval_status: string
  workflow_instance_id: string | null
  notes: string | null
  acknowledged_by: string | null
  created_at: string
  updated_at: string
  store_name: string
  dispatch_items: {
    id: string
    dispatch_id: string
    product_id: string
    variant_id: string | null
    unit_id: string | null
    quantity: number
    unit_quantity: number | null
    base_quantity: number | null
    packaging_breakdown: any | null
    received_quantity: number
    is_returnable: boolean
    is_returned: boolean
    return_date: string | null
    returned_quantity: number | null
    return_notes: string | null
    reminder_status: string | null
    notes: string | null
    created_at: string
    updated_at: string
    product: {
      id: string
      name: string
      sku: string | null
      image_urls: string[]
      primary_image_url: string | null
    }
  }[]
  to_user: {
    id: string
    first_name: string
    last_name: string
    full_name: string
  }
}

export interface DispatchSummarySummary {
  total_dispatches: number
  stores_dispatched_from: number
  unique_recipients: number
}

export interface DispatchByTypeItem {
  type: "internal" | "external"
  count: number
}

export interface DispatchByStoreItem {
  store_id: string
  store_name: string
  dispatch_count: number
}

// ============================================================================
// Breakage Report Types
// ============================================================================

export interface BreakageSummaryItem {
  id: string
  breakage_number: string
  notes: string
  status: string
  approval_status: string
  created_at: string
  items: {
    id: string
    product_id: string
    quantity: number
    cause: string
    product: { id: string; name: string; sku: string }
  }[]
  reporter: { id: string; first_name: string; last_name: string }
  approver: { id: string; first_name: string; last_name: string } | null
}

export interface BreakageSummarySummary {
  total_breakages: number
  pending: number
  approved: number
  rejected: number
}

export interface BreakageByProductItem {
  product_id: string
  product_name: string
  sku: string
  breakage_count: number
  total_quantity: number
}

export interface BreakageByStatusItem {
  status: string
  approval_status: string
  count: number
}

// ============================================================================
// Repair Report Types
// ============================================================================

export interface RepairSummaryItem {
  id: string
  repair_number: string
  notes: string
  status: string
  approval_status: string
  created_at: string
  items: {
    id: string
    product_id: string
    quantity: number
    issue_description: string
    product: { id: string; name: string; sku: string }
  }[]
  reporter: { id: string; first_name: string; last_name: string }
  approver: { id: string; first_name: string; last_name: string } | null
}

export interface RepairSummarySummary {
  total_repairs: number
  pending: number
  in_progress: number
  repaired: number
  completed: number
  approved: number
  rejected: number
}

export interface RepairByStatusData {
  by_status: { status: string; count: number }[]
  by_approval_status: { approval_status: string; count: number }[]
}

export interface RepairByProductItem {
  product_id: string
  product_name: string
  sku: string
  repair_count: number
  total_quantity: number
}

// ============================================================================
// Requisition Report Types
// ============================================================================

export interface RequisitionSummaryItem {
  id: string
  requisition_number: string
  notes: string
  status: string
  approval_status: string
  priority: string
  required_date: string
  created_at: string
  items: {
    id: string
    product_id: string
    requested_quantity: number
    approved_quantity: number
    fulfilled_quantity: number
    product: { id: string; name: string; sku: string }
  }[]
  requester: { id: string; first_name: string; last_name: string }
  approver: { id: string; first_name: string; last_name: string } | null
}

export interface RequisitionSummarySummary {
  total_requisitions: number
  pending: number
  approved: number
  rejected: number
  fulfilled: number
  unique_requesters: number
}

export interface RequisitionByStatusData {
  by_status: { status: string; count: number }[]
  by_approval_status: { approval_status: string; count: number }[]
}

export interface RequisitionByRequesterItem {
  requester_id: string
  requester_name: string
  requisition_count: number
  approved_count: number
  rejected_count: number
}

// ============================================================================
// Stock Adjustment Report Types
// ============================================================================

export interface AdjustmentSummaryItem {
  id: string
  adjustment_number: string
  adjustment_type: "increase" | "decrease"
  reason_type: string
  notes: string
  status: string
  quantity_adjusted: number
  total_value: string
  created_at: string
  product: { id: string; name: string; sku: string }
  created_by: { id: string; first_name: string; last_name: string }
}

export interface AdjustmentSummarySummary {
  total_adjustments: number
  pending: number
  approved: number
  rejected: number
  total_increased: number
  total_decreased: number
}

export interface AdjustmentByTypeItem {
  adjustment_type: "increase" | "decrease"
  count: number
  total_quantity: number
  total_value: string
}

export interface AdjustmentByReasonItem {
  reason_type: string
  count: number
  total_quantity: number
}

// ============================================================================
// API Functions
// ============================================================================

const BASE_PATH = "/reports"

/**
 * Build query string from filters
 */
function buildQueryString(filters?: ReportFilters): string {
  if (!filters) return ""
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value))
    }
  })
  const queryString = params.toString()
  return queryString ? `?${queryString}` : ""
}

/**
 * Get all available reports
 */
export async function getAvailableReports(): Promise<AvailableReportsResponse> {
  return apiCall<AvailableReportsResponse>(BASE_PATH, "GET")
}

// ============================================================================
// Inventory Reports
// ============================================================================

export async function getStockLevels(
  filters?: ReportFilters & { stock_status?: "low" | "out" | "adequate" }
): Promise<ReportResponse<PaginatedData<StockLevelItem>, StockLevelsSummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/inventory/stock-levels${query}`, "GET")
}

export async function getLowStockAlert(
  filters?: ReportFilters
): Promise<ReportResponse<LowStockItem[], LowStockSummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/inventory/low-stock${query}`, "GET")
}

export async function getStockValuation(
  filters?: ReportFilters
): Promise<ReportResponse<StockValuationData>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/inventory/valuation${query}`, "GET")
}

export async function getStockMovement(
  filters?: ReportFilters & { type?: string; product_id?: string }
): Promise<ReportResponse<PaginatedData<StockMovementItem>, StockMovementSummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/inventory/movement${query}`, "GET")
}

export async function getStockByStore(
  filters?: ReportFilters
): Promise<ReportResponse<StockByStoreItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/inventory/by-store${query}`, "GET")
}

// ============================================================================
// Product Reports
// ============================================================================

export async function getProductSummary(
  filters?: ReportFilters
): Promise<ReportResponse<ProductSummaryData>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/products/summary${query}`, "GET")
}

export async function getProductsByCategory(
  filters?: ReportFilters
): Promise<ReportResponse<ProductByCategoryItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/products/by-category${query}`, "GET")
}

export async function getProductsBySupplier(
  filters?: ReportFilters
): Promise<ReportResponse<ProductBySupplierItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/products/by-supplier${query}`, "GET")
}

// ============================================================================
// Purchase Order Reports
// ============================================================================

export async function getPurchaseSummary(
  filters?: ReportFilters
): Promise<ReportResponse<PurchaseSummaryData>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/purchase/summary${query}`, "GET")
}

export async function getPurchasesBySupplier(
  filters?: ReportFilters
): Promise<ReportResponse<PurchaseBySupplierItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/purchase/by-supplier${query}`, "GET")
}

export async function getPurchasesByStatus(
  filters?: ReportFilters
): Promise<ReportResponse<PurchaseByStatusItem[], { total_orders: number }>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/purchase/by-status${query}`, "GET")
}

export async function getProductReceipts(
  filters?: ReportFilters
): Promise<ReportResponse<PaginatedData<ProductReceiptItem>, ProductReceiptsSummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/purchase/receipts${query}`, "GET")
}

export async function getPurchaseOrderSummary(
  filters?: ReportFilters & { status?: string }
): Promise<ReportResponse<PaginatedData<PurchaseOrderSummaryItem>, PurchaseOrderSummarySummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/purchase/orders${query}`, "GET")
}

export async function getPurchaseOrderReceipts(
  filters?: ReportFilters
): Promise<ReportResponse<PaginatedData<PurchaseOrderReceiptItem>, PurchaseOrderReceiptsSummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/purchase/order-receipts${query}`, "GET")
}

// ============================================================================
// Supplier Reports
// ============================================================================

export async function getSupplierSummary(
  filters?: ReportFilters
): Promise<ReportResponse<SupplierSummaryItem[], SupplierSummarySummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/suppliers/summary${query}`, "GET")
}

export async function getSupplierPerformance(
  filters?: ReportFilters
): Promise<ReportResponse<SupplierPerformanceItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/suppliers/performance${query}`, "GET")
}

// ============================================================================
// Dispatch Reports
// ============================================================================

export async function getDispatchSummary(
  filters?: ReportFilters
): Promise<ReportResponse<PaginatedData<DispatchSummaryItem>, DispatchSummarySummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/dispatch/summary${query}`, "GET")
}

export async function getDispatchByType(
  filters?: ReportFilters
): Promise<ReportResponse<DispatchByTypeItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/dispatch/by-type${query}`, "GET")
}

export async function getDispatchByStore(
  filters?: ReportFilters
): Promise<ReportResponse<DispatchByStoreItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/dispatch/by-store${query}`, "GET")
}

// ============================================================================
// Breakage Reports
// ============================================================================

export async function getBreakageSummary(
  filters?: ReportFilters
): Promise<ReportResponse<PaginatedData<BreakageSummaryItem>, BreakageSummarySummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/breakage/summary${query}`, "GET")
}

export async function getBreakageByProduct(
  filters?: ReportFilters
): Promise<ReportResponse<BreakageByProductItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/breakage/by-product${query}`, "GET")
}

export async function getBreakageByStatus(
  filters?: ReportFilters
): Promise<ReportResponse<BreakageByStatusItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/breakage/by-status${query}`, "GET")
}

// ============================================================================
// Repair Reports
// ============================================================================

export async function getRepairSummary(
  filters?: ReportFilters
): Promise<ReportResponse<PaginatedData<RepairSummaryItem>, RepairSummarySummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/repairs/summary${query}`, "GET")
}

export async function getRepairsByStatus(
  filters?: ReportFilters
): Promise<ReportResponse<RepairByStatusData>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/repairs/by-status${query}`, "GET")
}

export async function getRepairsByProduct(
  filters?: ReportFilters
): Promise<ReportResponse<RepairByProductItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/repairs/by-product${query}`, "GET")
}

// ============================================================================
// Requisition Reports
// ============================================================================

export async function getRequisitionSummary(
  filters?: ReportFilters
): Promise<ReportResponse<PaginatedData<RequisitionSummaryItem>, RequisitionSummarySummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/requisitions/summary${query}`, "GET")
}

export async function getRequisitionsByStatus(
  filters?: ReportFilters
): Promise<ReportResponse<RequisitionByStatusData>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/requisitions/by-status${query}`, "GET")
}

export async function getRequisitionsByRequester(
  filters?: ReportFilters
): Promise<ReportResponse<RequisitionByRequesterItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/requisitions/by-requester${query}`, "GET")
}

// ============================================================================
// Stock Adjustment Reports
// ============================================================================

export async function getAdjustmentSummary(
  filters?: ReportFilters & { adjustment_type?: "increase" | "decrease"; status?: string }
): Promise<ReportResponse<PaginatedData<AdjustmentSummaryItem>, AdjustmentSummarySummary>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/adjustments/summary${query}`, "GET")
}

export async function getAdjustmentsByType(
  filters?: ReportFilters
): Promise<ReportResponse<AdjustmentByTypeItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/adjustments/by-type${query}`, "GET")
}

export async function getAdjustmentsByReason(
  filters?: ReportFilters
): Promise<ReportResponse<AdjustmentByReasonItem[]>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/adjustments/by-reason${query}`, "GET")
}

// ============================================================================
// Function Aliases (for compatibility with different naming conventions)
// ============================================================================

// Repairs aliases
export const getRepairsSummary = getRepairSummary

// Stock Adjustments aliases
export const getStockAdjustmentSummary = getAdjustmentSummary
export const getStockAdjustmentByType = getAdjustmentsByType
export const getStockAdjustmentByReason = getAdjustmentsByReason

// Type aliases for stock adjustments
export type StockAdjustmentSummaryItem = AdjustmentSummaryItem

// Purchase Orders aliases
export async function getPurchaseOrdersByStatus(
  filters?: ReportFilters
): Promise<ReportResponse<PurchaseOrdersByStatusItem[], { total_orders: number; total_amount: number }>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/purchase/by-status${query}`, "GET")
}

export async function getPurchaseOrdersBySupplier(
  filters?: ReportFilters
): Promise<ReportResponse<PurchaseOrdersBySupplierItem[], { total_orders: number; total_amount: number; unique_suppliers: number }>> {
  const query = buildQueryString(filters)
  return apiCall(`${BASE_PATH}/purchase/by-supplier${query}`, "GET")
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Download a report as CSV file
 */
export async function downloadReportAsCsv(
  endpoint: string,
  filters?: ReportFilters,
  filename?: string
): Promise<void> {
  const API_BASE_URL = getApiUrl()
  const token = getToken()

  const queryFilters = { ...filters, export: "csv" as const }
  const query = buildQueryString(queryFilters)
  const url = `${API_BASE_URL}${BASE_PATH}${endpoint}${query}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/csv",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.statusText}`)
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = downloadUrl

    // Get filename from Content-Disposition header or use provided filename
    const contentDisposition = response.headers.get("Content-Disposition")
    let downloadFilename = filename || "report.csv"
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (filenameMatch && filenameMatch[1]) {
        downloadFilename = filenameMatch[1].replace(/['"]/g, "")
      }
    }

    link.setAttribute("download", downloadFilename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error("Error downloading CSV:", error)
    throw error
  }
}

// ============================================================================
// Report Category Mappings
// ============================================================================

export const REPORT_CATEGORIES = {
  inventory: {
    label: "Inventory",
    icon: "Package",
    color: "blue",
    reports: [
      { key: "stock-levels", label: "Stock Levels", description: "Current inventory levels by product" },
      { key: "low-stock", label: "Low Stock Alert", description: "Products below minimum threshold" },
      { key: "valuation", label: "Stock Valuation", description: "Total value of inventory" },
      { key: "movement", label: "Stock Movement", description: "Inventory movement history" },
      { key: "by-store", label: "Stock by Store", description: "Inventory breakdown by store" },
    ],
  },
  products: {
    label: "Products",
    icon: "Box",
    color: "green",
    reports: [
      { key: "summary", label: "Product Summary", description: "Overall product statistics" },
      { key: "by-category", label: "By Category", description: "Product breakdown by category" },
      { key: "by-supplier", label: "By Supplier", description: "Product breakdown by supplier" },
    ],
  },
  "purchase-orders": {
    label: "Purchase Orders",
    icon: "ShoppingCart",
    color: "purple",
    reports: [
      { key: "summary", label: "Purchase Summary", description: "Purchase order summary with trends" },
      { key: "by-supplier", label: "By Supplier", description: "Purchase breakdown by supplier" },
      { key: "by-status", label: "By Status", description: "Purchase orders by status" },
      { key: "receipts", label: "Product Receipts", description: "Product receipt history" },
    ],
  },
  suppliers: {
    label: "Suppliers",
    icon: "Truck",
    color: "orange",
    reports: [
      { key: "summary", label: "Supplier Summary", description: "Supplier summary with order counts" },
      { key: "performance", label: "Supplier Performance", description: "Supplier performance metrics" },
    ],
  },
  dispatch: {
    label: "Dispatch",
    icon: "Send",
    color: "cyan",
    reports: [
      { key: "summary", label: "Dispatch Summary", description: "Dispatch summary with details" },
      { key: "by-type", label: "By Type", description: "Dispatch breakdown by type" },
      { key: "by-store", label: "By Store", description: "Dispatch breakdown by store" },
    ],
  },
  breakage: {
    label: "Breakage",
    icon: "AlertTriangle",
    color: "red",
    reports: [
      { key: "summary", label: "Breakage Summary", description: "Breakage summary with details" },
      { key: "by-product", label: "By Product", description: "Breakage statistics by product" },
      { key: "by-status", label: "By Status", description: "Breakage breakdown by status" },
    ],
  },
  repairs: {
    label: "Repairs",
    icon: "Wrench",
    color: "yellow",
    reports: [
      { key: "summary", label: "Repair Summary", description: "Repair summary with details" },
      { key: "by-status", label: "By Status", description: "Repair breakdown by status" },
      { key: "by-product", label: "By Product", description: "Repair statistics by product" },
    ],
  },
  requisitions: {
    label: "Requisitions",
    icon: "ClipboardList",
    color: "indigo",
    reports: [
      { key: "summary", label: "Requisition Summary", description: "Requisition summary with details" },
      { key: "by-status", label: "By Status", description: "Requisition breakdown by status" },
      { key: "by-requester", label: "By Requester", description: "Requisition breakdown by requester" },
    ],
  },
  adjustments: {
    label: "Stock Adjustments",
    icon: "RefreshCw",
    color: "pink",
    reports: [
      { key: "summary", label: "Adjustment Summary", description: "Stock adjustment summary" },
      { key: "by-type", label: "By Type", description: "Adjustments by type (increase/decrease)" },
      { key: "by-reason", label: "By Reason", description: "Adjustment breakdown by reason" },
    ],
  },
} as const

export const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
] as const
