"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Truck,
  ClipboardList,
  AlertTriangle,
  Wrench,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Box,
  AlertCircle,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type {
  WarehouseOverview,
  WarehouseActivity,
  WarehouseMetricWithChange,
} from "@/lib/dashboards";

// Metric Card with change indicator
function MetricWithChange({
  label,
  metric,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-500/10",
}: {
  label: string;
  metric: WarehouseMetricWithChange;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
}) {
  const isPositive = (metric.change_percent ?? 0) >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className={cn("p-2 rounded-full", iconBg)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{metric.current.toLocaleString()}</span>
          {metric.change_percent !== undefined && (
            <span
              className={cn(
                "flex items-center text-xs font-medium",
                isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              <TrendIcon className="h-3 w-3 mr-0.5" />
              {Math.abs(metric.change_percent)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple metric display
function SimpleStat({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number | string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variants = {
    default: "text-foreground",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  return (
    <div className="text-center p-2">
      <p className={cn("text-xl font-bold", variants[variant])}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// Activity type configuration
const activityConfig: Record<
  WarehouseActivity["type"],
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  purchase_order: {
    icon: ShoppingCart,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    label: "Purchase Order",
  },
  dispatch: {
    icon: Truck,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    label: "Dispatch",
  },
  breakage: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    label: "Breakage",
  },
  requisition: {
    icon: ClipboardList,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    label: "Requisition",
  },
  repair: {
    icon: Wrench,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    label: "Repair",
  },
};

// Activity item component
function ActivityItem({ activity }: { activity: WarehouseActivity }) {
  const config = activityConfig[activity.type];
  const Icon = config.icon;

  return (
    <div className="group flex gap-3 py-3 px-2 hover:bg-muted/50 rounded-lg transition-colors">
      <div className={cn("p-2 rounded-full flex-shrink-0", config.bgColor)}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {activity.reference}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {config.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
          {activity.description}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}

// Main Warehouse Overview Widget
interface WarehouseOverviewWidgetProps {
  data: WarehouseOverview | null;
  loading?: boolean;
  className?: string;
}

export function WarehouseOverviewWidget({
  data,
  loading = false,
  className,
}: WarehouseOverviewWidgetProps) {
  if (loading) {
    return (
      <Card className={cn("min-h-[400px]", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading warehouse overview...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={cn("min-h-[400px]", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No warehouse data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Warehouse Overview
            </CardTitle>
            <CardDescription>
              {data.period.label} ({new Date(data.period.from).toLocaleDateString()} -{" "}
              {new Date(data.period.to).toLocaleDateString()})
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4 mt-4">
            {/* Inventory Summary */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Box className="h-4 w-4 text-blue-600" />
                Inventory Status
              </h4>
              <div className="grid grid-cols-4 gap-2">
                <SimpleStat
                  label="Products"
                  value={data.inventory_summary.total_products}
                />
                <SimpleStat
                  label="Stock Units"
                  value={data.inventory_summary.total_stock_units}
                />
                <SimpleStat
                  label="Out of Stock"
                  value={data.inventory_summary.out_of_stock_count}
                  variant={data.inventory_summary.out_of_stock_count > 0 ? "danger" : "success"}
                />
                <SimpleStat
                  label="Low Stock"
                  value={data.inventory_summary.low_stock_count}
                  variant={data.inventory_summary.low_stock_count > 0 ? "warning" : "success"}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                <SimpleStat
                  label="Damaged"
                  value={data.inventory_summary.damaged_count}
                  variant={data.inventory_summary.damaged_count > 0 ? "danger" : "default"}
                />
                <SimpleStat
                  label="On Hold"
                  value={data.inventory_summary.on_hold_count}
                  variant={data.inventory_summary.on_hold_count > 0 ? "warning" : "default"}
                />
                <SimpleStat
                  label="Inventory Value"
                  value={`KES ${data.inventory_summary.total_inventory_value.toLocaleString()}`}
                />
              </div>
            </div>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-3 mt-4">
            {/* Dispatch Summary */}
            <MetricWithChange
              label="Total Dispatches"
              metric={data.dispatch_summary.total_dispatches}
              icon={Truck}
              iconColor="text-purple-600"
              iconBg="bg-purple-500/10"
            />
            <div className="grid grid-cols-2 gap-2 ml-12">
              <div className="text-sm">
                <span className="text-muted-foreground">Items Dispatched: </span>
                <span className="font-medium">
                  {data.dispatch_summary.total_items_dispatched.current.toLocaleString()}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Pending Ack: </span>
                <Badge
                  variant={data.dispatch_summary.pending_acknowledgment > 0 ? "destructive" : "secondary"}
                >
                  {data.dispatch_summary.pending_acknowledgment}
                </Badge>
              </div>
            </div>

            {/* Requisition Summary */}
            <MetricWithChange
              label="Total Requisitions"
              metric={data.requisition_summary.total_requisitions}
              icon={ClipboardList}
              iconColor="text-orange-600"
              iconBg="bg-orange-500/10"
            />
            <div className="flex gap-2 ml-12">
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {data.requisition_summary.approved} Approved
              </Badge>
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {data.requisition_summary.pending} Pending
              </Badge>
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                {data.requisition_summary.rejected} Rejected
              </Badge>
            </div>

            {/* Purchase Order Summary */}
            <MetricWithChange
              label="Purchase Orders"
              metric={data.purchase_order_summary.total_orders}
              icon={ShoppingCart}
              iconColor="text-blue-600"
              iconBg="bg-blue-500/10"
            />
            <div className="grid grid-cols-3 gap-2 ml-12 text-sm">
              <div>
                <span className="text-muted-foreground">Value: </span>
                <span className="font-medium">
                  KES {data.purchase_order_summary.total_value.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Received: </span>
                <span className="font-medium">{data.purchase_order_summary.received}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pending: </span>
                <Badge variant="outline">{data.purchase_order_summary.pending}</Badge>
              </div>
            </div>

            {/* Breakage Summary */}
            <MetricWithChange
              label="Breakages Reported"
              metric={data.breakage_summary.total_breakages}
              icon={AlertTriangle}
              iconColor="text-red-600"
              iconBg="bg-red-500/10"
            />
            <div className="flex gap-2 ml-12 text-sm">
              <span className="text-muted-foreground">
                {data.breakage_summary.total_broken_items} items broken
              </span>
              <Badge variant="default" className="bg-green-600">
                {data.breakage_summary.resolved} Resolved
              </Badge>
              <Badge variant="secondary">{data.breakage_summary.pending} Pending</Badge>
            </div>

            {/* Repair Summary */}
            <MetricWithChange
              label="Repairs"
              metric={data.repair_summary.total_repairs}
              icon={Wrench}
              iconColor="text-green-600"
              iconBg="bg-green-500/10"
            />
            <div className="flex gap-2 ml-12">
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {data.repair_summary.completed} Completed
              </Badge>
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 mr-1" />
                {data.repair_summary.in_progress} In Progress
              </Badge>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {data.repair_summary.pending} Pending
              </Badge>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {data.recent_warehouse_activity.length > 0 ? (
                <div className="space-y-1">
                  {data.recent_warehouse_activity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No recent activity</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Compact Summary Cards for Warehouse
export function WarehouseSummaryCards({
  data,
  loading = false,
}: {
  data: WarehouseOverview | null;
  loading?: boolean;
}) {
  if (loading || !data) {
    return null;
  }

  const cards = [
    {
      title: "Dispatches",
      value: data.dispatch_summary.total_dispatches.current,
      change: data.dispatch_summary.total_dispatches.change_percent,
      icon: Truck,
      color: "text-purple-600",
      bg: "from-purple-500/10 to-pink-500/10",
      subtitle: `${data.dispatch_summary.pending_acknowledgment} pending ack`,
    },
    {
      title: "Requisitions",
      value: data.requisition_summary.total_requisitions.current,
      change: data.requisition_summary.total_requisitions.change_percent,
      icon: ClipboardList,
      color: "text-orange-600",
      bg: "from-orange-500/10 to-yellow-500/10",
      subtitle: `${data.requisition_summary.pending} pending`,
    },
    {
      title: "Purchase Orders",
      value: data.purchase_order_summary.total_orders.current,
      change: data.purchase_order_summary.total_orders.change_percent,
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "from-blue-500/10 to-cyan-500/10",
      subtitle: `KES ${data.purchase_order_summary.total_value.toLocaleString()}`,
    },
    {
      title: "Breakages",
      value: data.breakage_summary.total_breakages.current,
      change: data.breakage_summary.total_breakages.change_percent,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "from-red-500/10 to-orange-500/10",
      subtitle: `${data.breakage_summary.total_broken_items} items`,
    },
    {
      title: "Repairs",
      value: data.repair_summary.total_repairs.current,
      change: data.repair_summary.total_repairs.change_percent,
      icon: Wrench,
      color: "text-green-600",
      bg: "from-green-500/10 to-emerald-500/10",
      subtitle: `${data.repair_summary.completed} completed`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = (card.change ?? 0) >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card
            key={card.title}
            className={cn(
              "p-4 bg-gradient-to-br border-0 shadow-sm hover:shadow-md transition-shadow",
              card.bg
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn("p-2 rounded-lg bg-background/80")}>
                <Icon className={cn("h-4 w-4", card.color)} />
              </div>
              {card.change !== undefined && (
                <span
                  className={cn(
                    "flex items-center text-xs font-medium",
                    isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  <TrendIcon className="h-3 w-3 mr-0.5" />
                  {Math.abs(card.change)}%
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
              <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
              <p className="text-xs text-muted-foreground/80 mt-1">{card.subtitle}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// Inventory Alert Card
export function InventoryAlertCard({
  data,
  loading = false,
}: {
  data: WarehouseOverview | null;
  loading?: boolean;
}) {
  if (loading || !data) return null;

  const alerts = [
    {
      label: "Out of Stock",
      value: data.inventory_summary.out_of_stock_count,
      icon: XCircle,
      variant: "destructive" as const,
    },
    {
      label: "Low Stock",
      value: data.inventory_summary.low_stock_count,
      icon: AlertCircle,
      variant: "warning" as const,
    },
    {
      label: "Damaged",
      value: data.inventory_summary.damaged_count,
      icon: AlertTriangle,
      variant: "destructive" as const,
    },
    {
      label: "On Hold",
      value: data.inventory_summary.on_hold_count,
      icon: Pause,
      variant: "secondary" as const,
    },
  ];

  const hasAlerts = alerts.some((a) => a.value > 0);

  if (!hasAlerts) return null;

  return (
    <Card className="p-4 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <h4 className="font-semibold text-sm">Inventory Alerts</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {alerts
          .filter((a) => a.value > 0)
          .map((alert) => {
            const Icon = alert.icon;
            return (
              <Badge
                key={alert.label}
                variant={alert.variant === "warning" ? "secondary" : alert.variant}
                className={cn(
                  "flex items-center gap-1",
                  alert.variant === "warning" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                )}
              >
                <Icon className="h-3 w-3" />
                {alert.value} {alert.label}
              </Badge>
            );
          })}
      </div>
    </Card>
  );
}
