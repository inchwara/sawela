"use client";

import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { Calendar as CalendarIcon, Filter, X, RefreshCw, Download, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReportPeriod, GroupBy, ReportFilters, PERIOD_OPTIONS } from "@/lib/reports-api";
import { Store } from "@/lib/stores";

interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  showGroupBy?: boolean;
  showStoreFilter?: boolean;
  stores?: Store[];
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  exportLoading?: boolean;
  additionalFilters?: React.ReactNode;
}

export function ReportFiltersBar({
  filters,
  onFiltersChange,
  showGroupBy = false,
  showStoreFilter = false,
  stores = [],
  loading = false,
  onRefresh,
  onExport,
  exportLoading = false,
  additionalFilters,
}: ReportFiltersProps) {
  const [isCustomRange, setIsCustomRange] = React.useState<boolean>(
    !!(filters.period === undefined && filters.start_date && filters.end_date)
  );
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    filters.start_date && filters.end_date
      ? { from: new Date(filters.start_date), to: new Date(filters.end_date) }
      : { from: subDays(new Date(), 30), to: new Date() }
  );
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  // Handle period change
  const handlePeriodChange = (value: string) => {
    if (value === "custom") {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      onFiltersChange({
        ...filters,
        period: value as ReportPeriod,
        start_date: undefined,
        end_date: undefined,
      });
      setPopoverOpen(false);
    }
  };

  // Handle calendar date selection
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onFiltersChange({
        ...filters,
        period: undefined,
        start_date: format(range.from, "yyyy-MM-dd"),
        end_date: format(range.to, "yyyy-MM-dd"),
      });
    }
  };

  // Apply custom range
  const handleApplyCustomRange = () => {
    if (dateRange?.from && dateRange?.to) {
      setPopoverOpen(false);
    }
  };

  // Handle group by change
  const handleGroupByChange = (value: string) => {
    onFiltersChange({
      ...filters,
      group_by: value as GroupBy,
    });
  };

  // Handle store change
  const handleStoreChange = (value: string) => {
    onFiltersChange({
      ...filters,
      store_id: value === "all" ? undefined : value,
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setIsCustomRange(false);
    onFiltersChange({
      period: "this_month",
    });
  };

  // Get display label
  const getDisplayLabel = () => {
    if (isCustomRange && dateRange?.from && dateRange?.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return format(dateRange.from, "MMM d, yyyy");
      }
      return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;
    }
    const found = PERIOD_OPTIONS.find((item) => item.value === filters.period);
    return found?.label || "This Month";
  };

  // Count active filters
  const activeFilterCount = [
    filters.store_id,
    filters.group_by && filters.group_by !== "day",
    isCustomRange,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-muted/30 rounded-lg border">
      {/* Period Selector */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal min-w-[200px]",
              !filters.period && !isCustomRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayLabel()}
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Period Presets */}
            <div className="border-r p-2 space-y-1 min-w-[160px]">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                Quick Select
              </p>
              {PERIOD_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.period === option.value && !isCustomRange ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handlePeriodChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <Separator className="my-2" />
              <Button
                variant={isCustomRange ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => handlePeriodChange("custom")}
              >
                Custom Range
              </Button>
            </div>

            {/* Calendar for Custom Range */}
            {isCustomRange && (
              <div className="p-3">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  captionLayout="dropdown"
                  startMonth={new Date(2015, 0)}
                  endMonth={new Date()}
                  disabled={(date) => date > new Date()}
                />
                <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCustomRange(false);
                      handlePeriodChange("this_month");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleApplyCustomRange}>
                    Apply Range
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Store Filter */}
      {showStoreFilter && stores.length > 0 && (
        <Select
          value={filters.store_id || "all"}
          onValueChange={handleStoreChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Group By */}
      {showGroupBy && (
        <Select
          value={filters.group_by || "day"}
          onValueChange={handleGroupByChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hour">Hourly</SelectItem>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="quarter">Quarterly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Additional Filters */}
      {additionalFilters}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2 text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
              {activeFilterCount}
            </Badge>
          </Button>
        )}

        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        )}

        {onExport && (
          <Button
            variant="default"
            size="sm"
            onClick={onExport}
            disabled={exportLoading || loading}
            className="h-9"
          >
            <Download className={cn("h-4 w-4 mr-2", exportLoading && "animate-pulse")} />
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}

// Compact version for embedding in cards
export function ReportFiltersCompact({
  filters,
  onFiltersChange,
  showStoreFilter = false,
  stores = [],
}: Pick<ReportFiltersProps, "filters" | "onFiltersChange" | "showStoreFilter" | "stores">) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.period || "this_month"}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, period: value as ReportPeriod })
        }
      >
        <SelectTrigger className="w-[140px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showStoreFilter && stores.length > 0 && (
        <Select
          value={filters.store_id || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              store_id: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
