"use client";
import { useEffect, useState, useCallback } from "react";
import {
  fetchDashboardOverview,
  fetchWarehouseOverview,
  fetchDispatchAnalytics,
  fetchBreakageAnalytics,
  fetchRepairAnalytics,
  fetchRequisitionAnalytics,
  fetchPurchaseOrderAnalytics,
  fetchStockAnalytics,
  DashboardOverview,
  WarehouseOverview,
  DispatchAnalytics,
  BreakageAnalytics,
  RepairAnalytics,
  RequisitionAnalytics,
  PurchaseOrderAnalytics,
  StockAnalytics,
  DashboardPeriod,
  DashboardFilterParams,
  GroupBy,
} from "@/lib/dashboards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  WarehouseOverviewWidget, 
  WarehouseSummaryCards, 
  InventoryAlertCard 
} from "./components/warehouse-overview-widget";
import {
  DispatchAnalyticsWidget,
  DispatchMetricsCards,
} from "./components/dispatch-analytics-widget";
import {
  BreakageAnalyticsWidget,
  BreakageMetricsCards,
} from "./components/breakage-analytics-widget";
import {
  RepairAnalyticsWidget,
  RepairMetricsCards,
} from "./components/repair-analytics-widget";
import {
  RequisitionAnalyticsWidget,
  RequisitionMetricsCards,
} from "./components/requisition-analytics-widget";
import {
  PurchaseOrderAnalyticsWidget,
  PurchaseOrderMetricsCards,
} from "./components/purchase-order-analytics-widget";
import {
  StockAnalyticsWidget,
  StockMetricsCards,
} from "./components/stock-analytics-widget";
import { DashboardFilters } from "./components/dashboard-filters";
import { PermissionGuard } from "@/components/PermissionGuard";
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  Wrench, 
  ClipboardList, 
  FileBox, 
  BarChart3,
  LayoutDashboard,
  Boxes,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  ShoppingCart
} from "lucide-react";
import { 
  DashboardLoadingState,
} from "./components/loading-skeletons";

// Format currency helper
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format number helper
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [warehouseOverview, setWarehouseOverview] = useState<WarehouseOverview | null>(null);
  const [dispatchAnalytics, setDispatchAnalytics] = useState<DispatchAnalytics | null>(null);
  const [breakageAnalytics, setBreakageAnalytics] = useState<BreakageAnalytics | null>(null);
  const [repairAnalytics, setRepairAnalytics] = useState<RepairAnalytics | null>(null);
  const [requisitionAnalytics, setRequisitionAnalytics] = useState<RequisitionAnalytics | null>(null);
  const [purchaseOrderAnalytics, setPurchaseOrderAnalytics] = useState<PurchaseOrderAnalytics | null>(null);
  const [stockAnalytics, setStockAnalytics] = useState<StockAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilterParams>({
    period: "last_30_days",
    group_by: "day",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        overviewData, 
        warehouseData, 
        dispatchData, 
        breakageData, 
        repairData, 
        requisitionData, 
        purchaseOrderData, 
        stockData
      ] = await Promise.all([
        fetchDashboardOverview(),
        fetchWarehouseOverview(filters),
        fetchDispatchAnalytics(filters),
        fetchBreakageAnalytics(filters),
        fetchRepairAnalytics(filters),
        fetchRequisitionAnalytics(filters),
        fetchPurchaseOrderAnalytics(filters),
        fetchStockAnalytics(filters),
      ]);
      setOverview(overviewData);
      setWarehouseOverview(warehouseData);
      setDispatchAnalytics(dispatchData);
      setBreakageAnalytics(breakageData);
      setRepairAnalytics(repairData);
      setRequisitionAnalytics(requisitionData);
      setPurchaseOrderAnalytics(purchaseOrderData);
      setStockAnalytics(stockData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFiltersChange = (newFilters: DashboardFilterParams) => {
    setFilters(newFilters);
  };

  const handleRefresh = () => {
    loadData();
  };

  // Get date range display text
  const getDateRangeDisplay = () => {
    if (filters.date_from && filters.date_to) {
      return `${new Date(filters.date_from).toLocaleDateString()} - ${new Date(filters.date_to).toLocaleDateString()}`;
    }
    if (overview?.period?.from && overview?.period?.to) {
      return `${new Date(overview.period.from).toLocaleDateString()} - ${new Date(overview.period.to).toLocaleDateString()}`;
    }
    return null;
  };

  return (
    <PermissionGuard permissions={["can_view_dashboard_menu", "can_manage_system", "can_manage_company"]}>
      <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                {overview?.period?.label || 'Welcome back! Here\'s your warehouse overview.'}
                {getDateRangeDisplay() && (
                  <span className="text-xs ml-2">
                    ({getDateRangeDisplay()})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Modern Filters */}
          <DashboardFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            showGroupBy={true}
            loading={loading}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Main Dashboard Content */}
        {loading ? (
          <DashboardLoadingState />
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Stock</span>
              </TabsTrigger>
              <TabsTrigger value="dispatch" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Dispatch</span>
              </TabsTrigger>
              <TabsTrigger value="breakage" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Breakage</span>
              </TabsTrigger>
              <TabsTrigger value="repair" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Repair</span>
              </TabsTrigger>
              <TabsTrigger value="requisition" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Requisition</span>
              </TabsTrigger>
              <TabsTrigger value="purchase" className="flex items-center gap-2">
                <FileBox className="h-4 w-4" />
                <span className="hidden sm:inline">Purchase</span>
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Stock Health */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Stock Health</p>
                        <p className="text-2xl font-bold">{stockAnalytics?.stock_overview?.stock_health_percentage || 0}%</p>
                      </div>
                      <div className={`p-2 rounded-full ${(stockAnalytics?.stock_overview?.stock_health_percentage || 0) >= 70 ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <CheckCircle2 className={`h-4 w-4 ${(stockAnalytics?.stock_overview?.stock_health_percentage || 0) >= 70 ? 'text-green-600' : 'text-amber-600'}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Stock Units */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Units</p>
                        <p className="text-2xl font-bold">{formatNumber(stockAnalytics?.stock_overview?.total_units || 0)}</p>
                      </div>
                      <div className="p-2 rounded-full bg-blue-50">
                        <Boxes className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Dispatches */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Dispatches</p>
                        <p className="text-2xl font-bold">{dispatchAnalytics?.dispatch_metrics?.total_dispatches || 0}</p>
                      </div>
                      <div className="p-2 rounded-full bg-purple-50">
                        <Truck className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Breakages */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Breakages</p>
                        <p className="text-2xl font-bold">{breakageAnalytics?.breakage_metrics?.total_breakages || 0}</p>
                      </div>
                      <div className="p-2 rounded-full bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Repairs */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Pending Repairs</p>
                        <p className="text-2xl font-bold">{repairAnalytics?.repair_metrics?.pending || 0}</p>
                      </div>
                      <div className="p-2 rounded-full bg-amber-50">
                        <Wrench className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Orders */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Pending POs</p>
                        <p className="text-2xl font-bold">{purchaseOrderAnalytics?.purchase_order_metrics?.pending || 0}</p>
                      </div>
                      <div className="p-2 rounded-full bg-teal-50">
                        <ShoppingCart className="h-4 w-4 text-teal-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Warehouse Alerts */}
              {warehouseOverview && (
                <InventoryAlertCard data={warehouseOverview} loading={loading} />
              )}

              {/* Quick Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stock Movement Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Stock Movement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Stock In</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        +{formatNumber(stockAnalytics?.stock_movement_summary?.stock_in?.total || 0)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Stock Out</span>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        -{formatNumber(stockAnalytics?.stock_movement_summary?.stock_out?.total || 0)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Net Movement</span>
                      <Badge className={stockAnalytics?.stock_movement_summary?.net_movement >= 0 ? 'bg-green-600' : 'bg-red-600'}>
                        {stockAnalytics?.stock_movement_summary?.net_movement >= 0 ? '+' : ''}{formatNumber(stockAnalytics?.stock_movement_summary?.net_movement || 0)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Dispatch Status */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4 text-purple-600" />
                      Dispatch Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Completed</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {dispatchAnalytics?.dispatch_metrics?.completed || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pending</span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        {dispatchAnalytics?.dispatch_metrics?.pending || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Fulfillment Rate</span>
                      <Badge className="bg-purple-600">
                        {dispatchAnalytics?.dispatch_metrics?.fulfillment_rate || 0}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Purchase Orders */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileBox className="h-4 w-4 text-teal-600" />
                      Purchase Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Orders</span>
                      <Badge variant="outline">
                        {purchaseOrderAnalytics?.purchase_order_metrics?.total_orders || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Value</span>
                      <span className="text-sm font-medium">{formatCurrency(purchaseOrderAnalytics?.purchase_order_metrics?.total_value || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Fulfillment</span>
                      <Badge className="bg-teal-600">
                        {purchaseOrderAnalytics?.purchase_order_metrics?.fulfillment_rate || 0}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Warehouse Summary */}
              {warehouseOverview && (
                <WarehouseSummaryCards data={warehouseOverview} loading={loading} />
              )}

              {/* Activity Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Breakage & Repair Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Breakage & Repair Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-red-50">
                        <p className="text-xs text-red-600 font-medium">Total Breakages</p>
                        <p className="text-xl font-bold text-red-700">{breakageAnalytics?.breakage_metrics?.total_breakages || 0}</p>
                        <p className="text-xs text-muted-foreground">{breakageAnalytics?.breakage_metrics?.total_items_broken || 0} items</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50">
                        <p className="text-xs text-blue-600 font-medium">Total Repairs</p>
                        <p className="text-xl font-bold text-blue-700">{repairAnalytics?.repair_metrics?.total_repairs || 0}</p>
                        <p className="text-xs text-muted-foreground">{repairAnalytics?.repair_metrics?.completion_rate || 0}% completed</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Breakage Cost</span>
                        <span className="font-medium text-red-600">{formatCurrency(breakageAnalytics?.breakage_metrics?.total_breakage_cost || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Requisition Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Requisition Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-2 rounded-lg bg-green-50">
                        <p className="text-lg font-bold text-green-700">{requisitionAnalytics?.requisition_metrics?.approved || 0}</p>
                        <p className="text-xs text-green-600">Approved</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-amber-50">
                        <p className="text-lg font-bold text-amber-700">{requisitionAnalytics?.requisition_metrics?.pending || 0}</p>
                        <p className="text-xs text-amber-600">Pending</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-red-50">
                        <p className="text-lg font-bold text-red-700">{requisitionAnalytics?.requisition_metrics?.rejected || 0}</p>
                        <p className="text-xs text-red-600">Rejected</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Approval Rate</span>
                        <span className="font-medium">{requisitionAnalytics?.requisition_metrics?.approval_rate || 0}%</span>
                      </div>
                      <Progress value={requisitionAnalytics?.requisition_metrics?.approval_rate || 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Warehouse Activity Widget */}
              {warehouseOverview && (
                <WarehouseOverviewWidget data={warehouseOverview} loading={loading} />
              )}
            </TabsContent>

            {/* STOCK ANALYTICS TAB */}
            <TabsContent value="stock" className="space-y-6">
              <StockMetricsCards data={stockAnalytics} loading={loading} />
              <StockAnalyticsWidget data={stockAnalytics} loading={loading} />
            </TabsContent>

            {/* DISPATCH ANALYTICS TAB */}
            <TabsContent value="dispatch" className="space-y-6">
              <DispatchMetricsCards data={dispatchAnalytics} loading={loading} />
              <DispatchAnalyticsWidget data={dispatchAnalytics} loading={loading} />
            </TabsContent>

            {/* BREAKAGE ANALYTICS TAB */}
            <TabsContent value="breakage" className="space-y-6">
              <BreakageMetricsCards data={breakageAnalytics} loading={loading} />
              <BreakageAnalyticsWidget data={breakageAnalytics} loading={loading} />
            </TabsContent>

            {/* REPAIR ANALYTICS TAB */}
            <TabsContent value="repair" className="space-y-6">
              <RepairMetricsCards data={repairAnalytics} loading={loading} />
              <RepairAnalyticsWidget data={repairAnalytics} loading={loading} />
            </TabsContent>

            {/* REQUISITION ANALYTICS TAB */}
            <TabsContent value="requisition" className="space-y-6">
              <RequisitionMetricsCards data={requisitionAnalytics} loading={loading} />
              <RequisitionAnalyticsWidget data={requisitionAnalytics} loading={loading} />
            </TabsContent>

            {/* PURCHASE ORDER ANALYTICS TAB */}
            <TabsContent value="purchase" className="space-y-6">
              <PurchaseOrderMetricsCards data={purchaseOrderAnalytics} loading={loading} />
              <PurchaseOrderAnalyticsWidget data={purchaseOrderAnalytics} loading={loading} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PermissionGuard>
  );
}
