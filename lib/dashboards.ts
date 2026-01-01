// Fetch customer analytics
export async function fetchCustomerAnalytics({ period = "last_30_days", group_by = "month" }: { period?: string; group_by?: string } = {}): Promise<CustomerAnalytics | null> {
  try {
    const params = new URLSearchParams({ period, group_by });
    const response = await apiCall<{ status: string; data: CustomerAnalytics; message?: any }>(
      `/dashboard/customer-analytics?${params.toString()}`,
      "GET",
      undefined,
      true
    );
    console.log("fetchCustomerAnalytics response:", response);
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch customer analytics", e);
    return null;
  }
}

// Fetch inventory analytics
export async function fetchInventoryAnalytics({ period = "last_30_days", group_by = "month" }: { period?: string; group_by?: string } = {}): Promise<InventoryAnalytics | null> {
  try {
    const params = new URLSearchParams({ period, group_by });
    const response = await apiCall<{ status: string; data: InventoryAnalytics; message?: any }>(
      `/dashboard/inventory-analytics?${params.toString()}`,
      "GET",
      undefined,
      true
    );
    console.log("fetchInventoryAnalytics response:", response);
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch inventory analytics", e);
    return null;
  }
}
// Fetch financial analytics
export async function fetchFinancialAnalytics({ period = "last_30_days", group_by = "month" }: { period?: string; group_by?: string } = {}): Promise<FinancialAnalytics | null> {
  try {
    const params = new URLSearchParams({ period, group_by });
    const response = await apiCall<{ status: string; data: FinancialAnalytics; message?: any }>(
      `/dashboard/financial-analytics?${params.toString()}`,
      "GET",
      undefined,
      true
    );
    console.log("fetchFinancialAnalytics response:", response); // Log the full API response
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch financial analytics", e);
    return null;
  }
}
// Fetch sales analytics
export async function fetchSalesAnalytics({ period = "last_30_days", group_by = "day" }: { period?: string; group_by?: string } = {}): Promise<SalesAnalytics | null> {
  try {
    const params = new URLSearchParams({ period, group_by });
    const response = await apiCall<{ status: string; data: SalesAnalytics; message?: any }>(
      `/dashboard/sales-analytics?${params.toString()}`,
      "GET",
      undefined,
      true
    );
    console.log("fetchSalesAnalytics response:", response); // Log the full API response
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch sales analytics", e);
    return null;
  }
}

// Quick test function to verify fetchSalesAnalytics works (run manually)
export async function testFetchSalesAnalytics() {
  const result = await fetchSalesAnalytics({ period: "last_30_days", group_by: "day" });
  console.log("testFetchSalesAnalytics result:", result);
  return result;
}

import apiCall from "./api";

// --- Common Filter Types ---
export type DashboardPeriod = 
  | "today" 
  | "yesterday" 
  | "last_7_days" 
  | "last_30_days" 
  | "this_month" 
  | "last_month" 
  | "this_quarter" 
  | "this_year";

export type GroupBy = "day" | "week" | "month";

export interface DashboardFilterParams {
  period?: DashboardPeriod;
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  store_id?: string;
  company_id?: string;
  group_by?: GroupBy;
}

// --- Warehouse Overview Types ---
export interface WarehouseOverviewPeriod {
  from: string;
  to: string;
  label: string;
}

export interface WarehouseInventorySummary {
  total_products: number;
  total_stock_units: number;
  total_inventory_value: number;
  out_of_stock_count: number;
  low_stock_count: number;
  damaged_count: number;
  on_hold_count: number;
}

export interface WarehouseMetricWithChange {
  current: number;
  previous: number;
  change_percent?: number;
}

export interface WarehouseDispatchSummary {
  total_dispatches: WarehouseMetricWithChange;
  total_items_dispatched: {
    current: number;
    previous: number;
  };
  pending_acknowledgment: number;
}

export interface WarehouseRequisitionSummary {
  total_requisitions: WarehouseMetricWithChange;
  approved: number;
  pending: number;
  rejected: number;
}

export interface WarehouseBreakageSummary {
  total_breakages: WarehouseMetricWithChange;
  total_broken_items: number;
  resolved: number;
  pending: number;
}

export interface WarehouseRepairSummary {
  total_repairs: WarehouseMetricWithChange;
  completed: number;
  pending: number;
  in_progress: number;
}

export interface WarehousePurchaseOrderSummary {
  total_orders: WarehouseMetricWithChange;
  total_value: number;
  received: number;
  pending: number;
}

export interface WarehouseActivity {
  type: "purchase_order" | "dispatch" | "breakage" | "requisition" | "repair";
  id: string;
  reference: string;
  description: string;
  created_at: string;
}

export interface WarehouseOverview {
  period: WarehouseOverviewPeriod;
  inventory_summary: WarehouseInventorySummary;
  dispatch_summary: WarehouseDispatchSummary;
  requisition_summary: WarehouseRequisitionSummary;
  breakage_summary: WarehouseBreakageSummary;
  repair_summary: WarehouseRepairSummary;
  purchase_order_summary: WarehousePurchaseOrderSummary;
  recent_warehouse_activity: WarehouseActivity[];
}

// --- Dispatch Analytics Types ---
export interface DispatchMetrics {
  total_dispatches: number;
  total_items_dispatched: number;
  unique_recipients: number;
  acknowledged_dispatches: number;
  returned_items: number;
  acknowledgment_rate: number;
}

export interface DispatchTrendItem {
  period: string;
  dispatch_count: number;
  item_count: number;
}

export interface DispatchByStatus {
  acknowledged: number;
  pending: number;
  in_transit?: number;
  cancelled?: number;
}

export interface DispatchByType {
  internal?: number;
  external?: number;
  transfer?: number;
  [key: string]: number | undefined;
}

export interface TopDispatchedProduct {
  product_id: string;
  product_name: string;
  total_dispatched: number;
  dispatch_count: number;
}

export interface DispatchRecipient {
  user_id: string;
  user_name: string;
  dispatch_count: number;
  total_items_received: number;
}

export interface DispatchAnalytics {
  dispatch_metrics: DispatchMetrics;
  dispatch_trend: DispatchTrendItem[];
  dispatch_by_status: DispatchByStatus;
  dispatch_by_type: DispatchByType;
  top_dispatched_products: TopDispatchedProduct[];
  dispatch_recipients: DispatchRecipient[];
}

// --- Breakage Analytics Types ---
export interface BreakageMetrics {
  total_breakages: number;
  total_broken_items: number;
  resolved: number;
  pending: number;
  approved: number;
  replacement_requested: number;
  resolution_rate: number;
}

export interface BreakageTrendItem {
  period: string;
  breakage_count: number;
}

export interface BreakageByStatus {
  pending?: number;
  approved?: number;
  rejected?: number;
  resolved?: number;
  dispatch_initiated?: number;
  [key: string]: number | undefined;
}

export interface BreakageByCause {
  cause: string;
  count: number;
  quantity: number;
}

export interface MostBrokenProduct {
  product_id: string;
  product_name: string;
  total_broken: number;
  breakage_count: number;
  estimated_loss: number;
}

export interface BreakageCostAnalysis {
  total_estimated_loss: number;
  total_items_lost: number;
  avg_loss_per_breakage: number;
}

export interface BreakageAnalytics {
  breakage_metrics: BreakageMetrics;
  breakage_trend: BreakageTrendItem[];
  breakage_by_status: BreakageByStatus;
  breakage_by_cause: BreakageByCause[];
  most_broken_products: MostBrokenProduct[];
  breakage_cost_analysis: BreakageCostAnalysis;
}

// --- Repair Analytics Types ---
export interface RepairMetrics {
  total_repairs: number;
  total_items_for_repair: number;
  repaired_items: number;
  completed: number;
  pending: number;
  in_progress: number;
  approved: number;
  completion_rate: number;
}

export interface RepairTrendItem {
  period: string;
  repair_count: number;
}

export interface RepairByStatus {
  pending?: number;
  in_progress?: number;
  completed?: number;
  cancelled?: number;
  [key: string]: number | undefined;
}

export interface RepairSuccessRate {
  total_items: number;
  repairable_items: number;
  repaired_items: number;
  repairability_rate: number;
  repair_success_rate: number;
}

export interface MostRepairedProduct {
  product_id: string;
  product_name: string;
  total_for_repair: number;
  total_repaired: number;
  repair_count: number;
}

export interface RepairAnalytics {
  repair_metrics: RepairMetrics;
  repair_trend: RepairTrendItem[];
  repair_by_status: RepairByStatus;
  repair_success_rate: RepairSuccessRate;
  most_repaired_products: MostRepairedProduct[];
}

// Requisition Analytics Types
export interface RequisitionMetrics {
  total_requisitions: number;
  total_items_requested: number;
  approved: number;
  pending: number;
  rejected: number;
  fulfilled: number;
  approval_rate: number;
  fulfillment_rate: number;
}

export interface RequisitionTrendItem {
  period: string;
  requisition_count: number;
}

export interface RequisitionByStatus {
  [key: string]: number;
}

export interface RequisitionByApproval {
  [key: string]: number;
}

export interface TopRequestedProduct {
  product_id: string;
  product_name: string;
  total_requested: number;
  requisition_count: number;
}

export interface TopRequester {
  user_id: string;
  user_name: string;
  requisition_count: number;
  approved_count: number;
  approval_rate: number;
}

export interface RequisitionAnalytics {
  requisition_metrics: RequisitionMetrics;
  requisition_trend: RequisitionTrendItem[];
  requisition_by_status: RequisitionByStatus;
  requisition_by_approval: RequisitionByApproval;
  top_requested_products: TopRequestedProduct[];
  top_requesters: TopRequester[];
}

// Purchase Order Analytics Types
export interface PurchaseOrderMetrics {
  total_orders: number;
  total_value: number;
  total_items_ordered: number;
  total_items_received: number;
  received: number;
  pending: number;
  cancelled: number;
  partial: number;
  fulfillment_rate: number;
}

export interface PurchaseOrderTrendItem {
  period: string;
  order_count: number;
}

export interface PurchaseOrderByStatus {
  [key: string]: number;
}

export interface TopSupplier {
  supplier_id: string;
  supplier_name: string;
  order_count: number;
  total_value: number;
  total_items: number;
}

export interface TopOrderedProduct {
  product_id: string;
  product_name: string;
  total_ordered: number;
  total_received: number;
  total_value: number;
}

export interface ReceivingEfficiency {
  total_ordered: number;
  total_received: number;
  total_orders: number;
  fully_received_orders: number;
  item_fulfillment_rate: number;
  order_completion_rate: number;
}

export interface PurchaseOrderAnalytics {
  purchase_order_metrics: PurchaseOrderMetrics;
  purchase_order_trend: PurchaseOrderTrendItem[];
  purchase_order_by_status: PurchaseOrderByStatus;
  top_suppliers: TopSupplier[];
  top_ordered_products: TopOrderedProduct[];
  receiving_efficiency: ReceivingEfficiency;
}

// Stock Analytics Types
export interface StockOverview {
  total_products: number;
  total_units: number;
  total_cost_value: number;
  total_retail_value: number;
  potential_profit: number;
  avg_stock_per_product: number;
  out_of_stock_count: number;
  low_stock_count: number;
  healthy_stock_count: number;
  stock_health_percentage: number;
}

export interface StockItem {
  product_id: string;
  product_name: string;
  sku: string | null;
  current_stock: number;
  total_sold: number;
  order_count: number;
  daily_velocity: number;
  days_in_inventory: number;
  stock_value: number;
  velocity_category: string;
  recommendation: string;
}

export interface StockVelocityCategory {
  count: number;
  total_stock_value: number;
  total_units: number;
}

export interface StockVelocity {
  fast_moving: StockVelocityCategory;
  medium_moving: StockVelocityCategory;
  slow_moving: StockVelocityCategory;
  dead_stock: StockVelocityCategory;
}

export interface StockAgingBucket {
  count: number;
  units: number;
  value: number;
}

export interface StockAging {
  "0_30_days": StockAgingBucket;
  "31_60_days": StockAgingBucket;
  "61_90_days": StockAgingBucket;
  "91_180_days": StockAgingBucket;
  "over_180_days": StockAgingBucket;
}

export interface StockValueByCategory {
  category: string;
  product_count: number;
  total_units: number;
  cost_value: number;
  retail_value: number;
  potential_margin: number;
}

export interface StockValueAnalysis {
  by_category: StockValueByCategory[];
  total_cost_value: number;
  category_count: number;
}

export interface ABCClass {
  description: string;
  product_count: number;
  revenue: number;
  stock_value: number;
  percentage_of_products: number;
}

export interface ABCAnalysis {
  class_a: ABCClass;
  class_b: ABCClass;
  class_c: ABCClass;
  total_revenue: number;
}

export interface StockIn {
  from_purchase_orders: number;
  total: number;
}

export interface StockOut {
  from_sales: number;
  from_dispatches: number;
  from_breakages: number;
  total: number;
}

export interface StockMovementSummary {
  stock_in: StockIn;
  stock_out: StockOut;
  net_movement: number;
}

export interface ReorderRecommendation {
  product_id: string;
  product_name: string;
  current_stock: number;
  reorder_point: number;
  suggested_quantity: number;
  reason: string;
}

export interface StockAnalytics {
  stock_overview: StockOverview;
  fast_moving_stock: StockItem[];
  slow_moving_stock: StockItem[];
  stock_velocity: StockVelocity;
  stock_aging: StockAging;
  stock_value_analysis: StockValueAnalysis;
  abc_analysis: ABCAnalysis;
  stock_movement_summary: StockMovementSummary;
  reorder_recommendations: ReorderRecommendation[];
}

// Dashboard interfaces
export interface DashboardWidget {
  id: string;
  widget_type: string;
  title?: string;
  description?: string;
  position_x?: number;
  position_y?: number;
  size?: "small" | "medium" | "large";
  config?: Record<string, any>;
  [key: string]: any;
}


// --- Dashboard Overview ---
export interface DashboardOverviewPeriod {
  from: string;
  to: string;
  label: string;
}
export interface DashboardOverviewMetric {
  current: number;
  previous: number;
  change_percent: number;
}
export interface DashboardOverviewSalesMetrics {
  total_orders: DashboardOverviewMetric;
  total_revenue: DashboardOverviewMetric;
  avg_order_value: DashboardOverviewMetric;
  paid_orders: number;
  conversion_rate: number;
}
export interface DashboardOverviewFinancialMetrics {
  total_payments: DashboardOverviewMetric;
  total_expenses: DashboardOverviewMetric;
  net_profit: DashboardOverviewMetric;
  outstanding_amount: number;
  outstanding_invoices_count: number;
}
export interface DashboardOverviewCustomerMetrics {
  total_customers: number;
  new_customers: DashboardOverviewMetric;
  repeat_customers: number;
  customer_retention_rate: number;
}
export interface DashboardOverviewInventoryMetrics {
  total_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_inventory_value: number;
  stock_health_score: number;
}
export interface DashboardOverviewRecentActivity {
  id: string;
  type: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
}
export interface DashboardOverview {
  period: DashboardOverviewPeriod;
  sales_metrics: DashboardOverviewSalesMetrics;
  financial_metrics: DashboardOverviewFinancialMetrics;
  customer_metrics: DashboardOverviewCustomerMetrics;
  inventory_metrics: DashboardOverviewInventoryMetrics;
  recent_activity: DashboardOverviewRecentActivity[];
}

// --- Sales Analytics ---
export interface SalesAnalyticsRevenueTrend {
  period: string;
  revenue: number;
  orders: number;
}
export interface SalesAnalyticsByProduct {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
  order_count: number;
}
export interface SalesAnalyticsByCategory {
  category: string;
  quantity_sold: number;
  revenue: number;
  order_count: number;
}
export interface SalesAnalyticsPaymentMethod {
  payment_method: string;
  transaction_count: number;
  total_amount: number;
}
export interface SalesAnalyticsOrderStatus {
  status: string;
  order_count: number;
  total_amount: number;
}
export interface SalesAnalyticsAvgOrderValue {
  period: string;
  avg_order_value: number;
}
export interface SalesAnalytics {
  revenue_trend: SalesAnalyticsRevenueTrend[];
  sales_by_product: SalesAnalyticsByProduct[];
  sales_by_category: SalesAnalyticsByCategory[];
  payment_methods: SalesAnalyticsPaymentMethod[];
  order_status_breakdown: SalesAnalyticsOrderStatus[];
  average_order_value: SalesAnalyticsAvgOrderValue[];
}

// --- Financial Analytics ---
export interface FinancialAnalyticsCashFlowTrend {
  month: string;
  cash_in: number;
}
export interface FinancialAnalyticsCashFlow {
  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
  monthly_trend: FinancialAnalyticsCashFlowTrend[];
}
export interface FinancialAnalyticsExpenseByCategory {
  category: string;
  amount: number;
  count: number;
}
export interface FinancialAnalyticsExpenseByPaymentMethod {
  payment_method: string;
  amount: number;
  count: number;
}
export interface FinancialAnalyticsExpenseBreakdown {
  by_category: FinancialAnalyticsExpenseByCategory[];
  by_payment_method: FinancialAnalyticsExpenseByPaymentMethod[];
  total_expenses: number;
}
export interface FinancialAnalyticsProfitLoss {
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  gross_margin: number;
  net_margin: number;
}
export interface FinancialAnalyticsAccountsReceivableAging {
  current: number;
  "1_30_days": number;
  "31_60_days": number;
  over_60_days: number;
}
export interface FinancialAnalyticsAccountsReceivable {
  total_outstanding: number;
  invoice_count: number;
  avg_days_overdue: number;
  aging_buckets: FinancialAnalyticsAccountsReceivableAging;
}
export interface FinancialAnalyticsPaymentTrendByMethod {
  payment_method: string;
  trend: { date: string; amount: number }[];
}
export interface FinancialAnalyticsPaymentTrends {
  daily_payments: { date: string; amount: number; count: number }[];
  by_payment_method: FinancialAnalyticsPaymentTrendByMethod[];
}
export interface FinancialAnalytics {
  cash_flow: FinancialAnalyticsCashFlow;
  expense_breakdown: FinancialAnalyticsExpenseBreakdown;
  profit_loss: FinancialAnalyticsProfitLoss;
  accounts_receivable: FinancialAnalyticsAccountsReceivable;
  payment_trends: FinancialAnalyticsPaymentTrends;
}

// --- Customer Analytics ---
export interface CustomerAnalyticsAcquisitionDaily {
  date: string;
  new_customers: number;
}
export interface CustomerAnalyticsAcquisition {
  total_new_customers: number;
  acquisition_cost: number;
  daily_acquisition: CustomerAnalyticsAcquisitionDaily[];
}
export interface CustomerAnalyticsRetention {
  retention_rate: number;
  churn_rate: number;
  repeat_customers: number;
  total_customers_with_orders: number;
}
export interface CustomerAnalyticsLifetimeValueTop {
  id: string;
  name: string;
  lifetime_value: number;
  total_orders: number;
}
export interface CustomerAnalyticsLifetimeValue {
  avg_lifetime_value: number;
  avg_orders_per_customer: number;
  highest_lifetime_value: number;
  top_customers: CustomerAnalyticsLifetimeValueTop[];
}
export interface CustomerAnalyticsTopCustomer {
  id: string;
  name: string;
  email: string;
  total_spent: number;
  order_count: number;
  avg_order_value: number;
}
export interface CustomerAnalyticsSegments {
  high_value: number;
  medium_value: number;
  low_value: number;
  new_customers: number;
}
export interface CustomerAnalytics {
  customer_acquisition: CustomerAnalyticsAcquisition;
  customer_retention: CustomerAnalyticsRetention;
  customer_lifetime_value: CustomerAnalyticsLifetimeValue;
  top_customers: CustomerAnalyticsTopCustomer[];
  customer_segments: CustomerAnalyticsSegments;
}

// --- Inventory Analytics ---
export interface InventoryAnalyticsLevels {
  total_products: number;
  total_stock_units: number;
  total_inventory_value: number;
  avg_stock_per_product: number;
  stock_distribution: Record<string, number>;
}
export interface InventoryAnalyticsStockAlertProduct {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold?: number;
}
export interface InventoryAnalyticsStockAlerts {
  low_stock_products: InventoryAnalyticsStockAlertProduct[];
  out_of_stock_products: InventoryAnalyticsStockAlertProduct[];
  low_stock_count: number;
  out_of_stock_count: number;
}
export interface InventoryAnalyticsTurnover {
  product_id: string;
  product_name: string;
  current_stock: number;
  units_sold_12m: number;
  turnover_ratio: number;
}
export interface InventoryAnalyticsDeadStockProduct {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  unit_cost: number;
  dead_stock_value: number;
}
export interface InventoryAnalyticsDeadStock {
  dead_stock_products: InventoryAnalyticsDeadStockProduct[];
  total_dead_stock_value: number;
  dead_stock_count: number;
}
export interface InventoryAnalyticsProductPerformanceTop {
  product: any;
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
  order_frequency: number;
}
export interface InventoryAnalyticsProductPerformanceSlow {
  id: string;
  name: string;
  stock_quantity: number;
  unit_cost: number;
  recent_order_count: number;
}
export interface InventoryAnalyticsProductPerformance {
  top_performers: InventoryAnalyticsProductPerformanceTop[];
  slow_movers: InventoryAnalyticsProductPerformanceSlow[];
}
export interface InventoryAnalytics {
  inventory_levels: InventoryAnalyticsLevels;
  stock_alerts: InventoryAnalyticsStockAlerts;
  inventory_turnover: InventoryAnalyticsTurnover[];
  dead_stock: InventoryAnalyticsDeadStock;
  product_performance: InventoryAnalyticsProductPerformance;
}

// --- Dashboard Config ---
export interface DashboardConfig {
  id: string;
  user_id: string;
  company_id: string;
  dashboard_name: string;
  layout_configuration: Record<string, any>;
  is_default: boolean;
  is_shared: boolean;
  shared_with: string[];
  created_at: string;
  updated_at: string;
}
export interface DashboardConfigResponse {
  configuration: DashboardConfig;
  available_widgets: DashboardWidget[];
}

export interface DashboardLayout {
  id?: string;
  user_id?: string;
  layout: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Fetch all dashboard widgets
export async function fetchDashboardWidgets(): Promise<DashboardWidget[]> {
  try {
    const response = await apiCall<{ status: string; widgets: DashboardWidget[]; message?: any }>(
      "/dashboard/widgets",
      "GET",
      undefined,
      true
    );
    if (response.status === "success" && Array.isArray(response.widgets)) {
      return response.widgets;
    }
    return [];
  } catch (e) {
    console.error("Failed to fetch dashboard widgets", e);
    return [];
  }
}

// Fetch dashboard summary/overview
export async function fetchDashboardOverview(): Promise<DashboardOverview | null> {
  try {
    const response = await apiCall<{ status: string; data: DashboardOverview; message?: any }>(
      "/dashboard/overview",
      "GET",
      undefined,
      true
    );
    console.log("fetchDashboardOverview response:", response);
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch dashboard overview", e);
    return null;
  }
}

// Create a new dashboard widget
export async function createDashboardWidget(widget: Omit<DashboardWidget, "id">): Promise<DashboardWidget | null> {
  try {
    const response = await apiCall<{ status: string; widget: DashboardWidget; message?: any }>(
      "/dashboard/widgets",
      "POST",
      widget,
      true
    );
    if (response.status === "success" && response.widget) {
      return response.widget;
    }
    return null;
  } catch (e) {
    console.error("Failed to create dashboard widget", e);
    return null;
  }
}

// Update an existing dashboard widget (by id)
export async function updateDashboardWidget(id: string, updates: Partial<DashboardWidget>): Promise<DashboardWidget | null> {
  try {
    const response = await apiCall<{ status: string; widget: DashboardWidget; message?: any }>(
      `/dashboard/widgets/${id}`,
      "PUT",
      updates,
      true
    );
    if (response.status === "success" && response.widget) {
      return response.widget;
    }
    return null;
  } catch (e) {
    console.error("Failed to update dashboard widget", e);
    return null;
  }
}

// Delete a dashboard widget (by id)
export async function deleteDashboardWidget(id: string): Promise<boolean> {
  try {
    const response = await apiCall<{ status: string; message?: any }>(
      `/dashboard/widgets/${id}`,
      "DELETE",
      undefined,
      true
    );
    return response.status === "success";
  } catch (e) {
    console.error("Failed to delete dashboard widget", e);
    return false;
  }
}

// Save dashboard layout/preferences
export async function saveDashboardLayout(layout: DashboardLayout): Promise<boolean> {
  try {
    const response = await apiCall<{ status: string; message?: any }>(
      "/dashboard/layout",
      "POST",
      layout,
      true
    );
    return response.status === "success";
  } catch (e) {
    console.error("Failed to save dashboard layout", e);
    return false;
  }
}

// Fetch widget-specific data (if needed)
export async function fetchWidgetData(id: string): Promise<any> {
  try {
    const response = await apiCall<{ status: string; data: any; message?: any }>(
      `/dashboard/widgets/${id}/data`,
      "GET",
      undefined,
      true
    );
    if (response.status === "success") {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch widget data", e);
    return null;
  }
}

// ============================================
// WAREHOUSE MANAGEMENT DASHBOARD API FUNCTIONS
// ============================================

// Fetch warehouse overview - comprehensive WMS metrics
export async function fetchWarehouseOverview(
  params: DashboardFilterParams = {}
): Promise<WarehouseOverview | null> {
  try {
    const { period = "last_30_days", date_from, date_to, store_id, company_id } = params;
    const searchParams = new URLSearchParams();
    
    searchParams.append("period", period);
    if (date_from) searchParams.append("date_from", date_from);
    if (date_to) searchParams.append("date_to", date_to);
    if (store_id) searchParams.append("store_id", store_id);
    if (company_id) searchParams.append("company_id", company_id);

    const response = await apiCall<{ 
      status: string; 
      data: WarehouseOverview; 
      message?: string 
    }>(
      `/dashboard/warehouse-overview?${searchParams.toString()}`,
      "GET",
      undefined,
      true
    );
    
    console.log("fetchWarehouseOverview response:", response);
    
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch warehouse overview", e);
    return null;
  }
}

// Fetch dispatch analytics - dispatch metrics & trends
export async function fetchDispatchAnalytics(
  params: DashboardFilterParams = {}
): Promise<DispatchAnalytics | null> {
  try {
    const { period = "last_30_days", date_from, date_to, store_id, group_by = "day" } = params;
    const searchParams = new URLSearchParams();
    
    searchParams.append("period", period);
    if (date_from) searchParams.append("date_from", date_from);
    if (date_to) searchParams.append("date_to", date_to);
    if (store_id) searchParams.append("store_id", store_id);
    if (group_by) searchParams.append("group_by", group_by);

    const response = await apiCall<{ 
      status: string; 
      data: DispatchAnalytics; 
      message?: string 
    }>(
      `/dashboard/dispatch-analytics?${searchParams.toString()}`,
      "GET",
      undefined,
      true
    );
    
    console.log("fetchDispatchAnalytics response:", response);
    
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch dispatch analytics", e);
    return null;
  }
}
// Fetch breakage analytics - breakage reports & cost analysis
export async function fetchBreakageAnalytics(
  params: DashboardFilterParams = {}
): Promise<BreakageAnalytics | null> {
  try {
    const { period = "last_30_days", date_from, date_to, group_by = "day" } = params;
    const searchParams = new URLSearchParams();
    
    searchParams.append("period", period);
    if (date_from) searchParams.append("date_from", date_from);
    if (date_to) searchParams.append("date_to", date_to);
    if (group_by) searchParams.append("group_by", group_by);

    const response = await apiCall<{ 
      status: string; 
      data: BreakageAnalytics; 
      message?: string 
    }>(
      `/dashboard/breakage-analytics?${searchParams.toString()}`,
      "GET",
      undefined,
      true
    );
    
    console.log("fetchBreakageAnalytics response:", response);
    
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch breakage analytics", e);
    return null;
  }
}

// Fetch repair analytics - repair tracking & success rates
export async function fetchRepairAnalytics(
  params: DashboardFilterParams = {}
): Promise<RepairAnalytics | null> {
  try {
    const { period = "last_30_days", date_from, date_to, group_by = "day" } = params;
    const searchParams = new URLSearchParams();
    
    searchParams.append("period", period);
    if (date_from) searchParams.append("date_from", date_from);
    if (date_to) searchParams.append("date_to", date_to);
    if (group_by) searchParams.append("group_by", group_by);

    const response = await apiCall<{ 
      status: string; 
      data: RepairAnalytics; 
      message?: string 
    }>(
      `/dashboard/repair-analytics?${searchParams.toString()}`,
      "GET",
      undefined,
      true
    );
    
    console.log("fetchRepairAnalytics response:", response);
    
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch repair analytics", e);
    return null;
  }
}

// Fetch requisition analytics
export async function fetchRequisitionAnalytics(
  params: DashboardFilterParams = {}
): Promise<RequisitionAnalytics | null> {
  try {
    const searchParams = new URLSearchParams();
    if (params.period) searchParams.set("period", params.period);
    if (params.date_from) searchParams.set("date_from", params.date_from);
    if (params.date_to) searchParams.set("date_to", params.date_to);
    if (params.store_id) searchParams.set("store_id", params.store_id);
    if (params.company_id) searchParams.set("company_id", params.company_id);
    if (params.group_by) searchParams.set("group_by", params.group_by);

    const response = await apiCall<{ 
      status: string; 
      data: RequisitionAnalytics; 
      message?: string 
    }>(
      `/dashboard/requisition-analytics?${searchParams.toString()}`,
      "GET",
      undefined,
      true
    );
    
    console.log("fetchRequisitionAnalytics response:", response);
    
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch requisition analytics", e);
    return null;
  }
}

// Fetch purchase order analytics
export async function fetchPurchaseOrderAnalytics(
  params: DashboardFilterParams = {}
): Promise<PurchaseOrderAnalytics | null> {
  try {
    const searchParams = new URLSearchParams();
    if (params.period) searchParams.set("period", params.period);
    if (params.date_from) searchParams.set("date_from", params.date_from);
    if (params.date_to) searchParams.set("date_to", params.date_to);
    if (params.store_id) searchParams.set("store_id", params.store_id);
    if (params.company_id) searchParams.set("company_id", params.company_id);
    if (params.group_by) searchParams.set("group_by", params.group_by);

    const response = await apiCall<{ 
      status: string; 
      data: PurchaseOrderAnalytics; 
      message?: string 
    }>(
      `/dashboard/purchase-order-analytics?${searchParams.toString()}`,
      "GET",
      undefined,
      true
    );
    
    console.log("fetchPurchaseOrderAnalytics response:", response);
    
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch purchase order analytics", e);
    return null;
  }
}

// Fetch stock analytics
export async function fetchStockAnalytics(
  params: DashboardFilterParams = {}
): Promise<StockAnalytics | null> {
  try {
    const searchParams = new URLSearchParams();
    if (params.period) searchParams.set("period", params.period);
    if (params.date_from) searchParams.set("date_from", params.date_from);
    if (params.date_to) searchParams.set("date_to", params.date_to);
    if (params.store_id) searchParams.set("store_id", params.store_id);
    if (params.company_id) searchParams.set("company_id", params.company_id);
    if (params.group_by) searchParams.set("group_by", params.group_by);

    const response = await apiCall<{ 
      status: string; 
      data: StockAnalytics; 
      message?: string 
    }>(
      `/dashboard/stock-analytics?${searchParams.toString()}`,
      "GET",
      undefined,
      true
    );
    
    console.log("fetchStockAnalytics response:", response);
    
    if (response.status === "success" && response.data) {
      return response.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch stock analytics", e);
    return null;
  }
}