/**
 * Dashboard Widgets - Central Export
 * 
 * Import all dashboard components from this single file:
 * import { EnhancedMetricCard, ActivityFeed, QuickActionsGrid } from '@/app/dashboard/components'
 */

// Enhanced Metric Cards
export { EnhancedMetricCard, MiniMetricCard } from './enhanced-metric-card'

// Interactive Charts
export { InteractiveChartCard } from './interactive-chart-card'

// Quick Actions
export { 
  QuickActionsGrid, 
  QuickActionsToolbar, 
  QuickActionCard,
  CompactActionButton 
} from './quick-action-cards'

// Activity Feed
export { ActivityFeed, CompactActivityFeed } from './activity-feed'

// Stat Cards
export { StatCard, GoalCard, PerformanceCard } from './stat-cards'

// Comparison Cards
export { ComparisonCard, SideBySideCard } from './comparison-cards'

// Warehouse Overview
export { 
  WarehouseOverviewWidget, 
  WarehouseSummaryCards, 
  InventoryAlertCard 
} from './warehouse-overview-widget'

// Dispatch Analytics
export {
  DispatchAnalyticsWidget,
  DispatchMetricsCards,
} from './dispatch-analytics-widget'

// Breakage Analytics
export {
  BreakageAnalyticsWidget,
  BreakageMetricsCards,
} from './breakage-analytics-widget'

// Repair Analytics
export {
  RepairAnalyticsWidget,
  RepairMetricsCards,
} from './repair-analytics-widget'

// Requisition Analytics
export {
  RequisitionAnalyticsWidget,
  RequisitionMetricsCards,
} from './requisition-analytics-widget'

// Purchase Order Analytics
export {
  PurchaseOrderAnalyticsWidget,
  PurchaseOrderMetricsCards,
} from './purchase-order-analytics-widget'

// Stock Analytics
export {
  StockAnalyticsWidget,
  StockMetricsCards,
} from './stock-analytics-widget'

// Loading Skeletons
export {
  DashboardLoadingState,
  EnhancedMetricCardSkeleton,
  MiniMetricCardSkeleton,
  ChartCardSkeleton,
  ActivityFeedSkeleton,
  DetailedMetricCardSkeleton,
  QuickActionCardSkeleton
} from './loading-skeletons'

// Dashboard Filters
export {
  DashboardFilters,
  TabFilter,
} from './dashboard-filters'
