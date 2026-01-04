"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  DollarSign,
  BarChart3,
  Users,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  DollarSign,
  BarChart3,
  Users,
  ShoppingCart,
  Truck,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
};

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof iconMap;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  loading?: boolean;
  className?: string;
}

const variantStyles = {
  default: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  success: {
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  warning: {
    iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
    iconColor: "text-yellow-600 dark:text-yellow-400",
  },
  danger: {
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
  },
  info: {
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
};

export function SummaryCard({
  title,
  value,
  subtitle,
  icon = "BarChart3",
  trend,
  variant = "default",
  loading = false,
  className,
}: SummaryCardProps) {
  const Icon = iconMap[icon] || BarChart3;
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold tracking-tight">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              {(subtitle || trend) && (
                <div className="flex items-center gap-2 mt-1">
                  {trend && (
                    <Badge
                      variant={trend.value >= 0 ? "default" : "destructive"}
                      className={cn(
                        "gap-1 font-normal",
                        trend.value >= 0
                          ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {trend.value >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(trend.value)}%
                    </Badge>
                  )}
                  {subtitle && (
                    <span className="text-xs text-muted-foreground">{subtitle}</span>
                  )}
                </div>
              )}
            </div>
            <div className={cn("p-2.5 rounded-lg", styles.iconBg)}>
              <Icon className={cn("h-5 w-5", styles.iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface SummaryGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function SummaryGrid({ children, columns = 4, className }: SummaryGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
    5: "md:grid-cols-3 lg:grid-cols-5",
    6: "md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid grid-cols-1 gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

// Compact summary item for inline displays
interface CompactSummaryProps {
  label: string;
  value: string | number;
  variant?: "default" | "success" | "warning" | "danger";
}

export function CompactSummary({ label, value, variant = "default" }: CompactSummaryProps) {
  const variantColors = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("font-medium", variantColors[variant])}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

// Status indicator component
interface StatusIndicatorProps {
  status: string;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: "text-yellow-600", bgColor: "bg-yellow-100", icon: Clock },
  approved: { color: "text-green-600", bgColor: "bg-green-100", icon: CheckCircle2 },
  rejected: { color: "text-red-600", bgColor: "bg-red-100", icon: AlertCircle },
  completed: { color: "text-green-600", bgColor: "bg-green-100", icon: CheckCircle2 },
  in_progress: { color: "text-blue-600", bgColor: "bg-blue-100", icon: Clock },
  cancelled: { color: "text-gray-600", bgColor: "bg-gray-100", icon: AlertCircle },
  low_stock: { color: "text-yellow-600", bgColor: "bg-yellow-100", icon: AlertCircle },
  out_of_stock: { color: "text-red-600", bgColor: "bg-red-100", icon: AlertCircle },
  adequate: { color: "text-green-600", bgColor: "bg-green-100", icon: CheckCircle2 },
};

export function StatusIndicator({ status, size = "md" }: StatusIndicatorProps) {
  const config = statusConfig[status.toLowerCase().replace(/\s+/g, "_")] || {
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: Minus,
  };
  const Icon = config.icon;
  const sizeClasses = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <Badge variant="outline" className={cn("gap-1", config.bgColor, config.color, "border-0")}>
      <Icon className={sizeClasses} />
      <span className="capitalize">{status.replace(/_/g, " ")}</span>
    </Badge>
  );
}

// Progress indicator for metrics
interface ProgressMetricProps {
  label: string;
  value: number;
  max: number;
  variant?: "default" | "success" | "warning" | "danger";
  showPercentage?: boolean;
}

export function ProgressMetric({
  label,
  value,
  max,
  variant = "default",
  showPercentage = true,
}: ProgressMetricProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const variantColors = {
    default: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value.toLocaleString()}
          {showPercentage && <span className="text-muted-foreground ml-1">({percentage.toFixed(1)}%)</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full", variantColors[variant])}
        />
      </div>
    </div>
  );
}
