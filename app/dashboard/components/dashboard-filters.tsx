"use client";

import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, Filter, X, RefreshCw, ChevronDown } from "lucide-react";
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
  SelectSeparator,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DashboardPeriod, GroupBy, DashboardFilterParams } from "@/lib/dashboards";

// Period options with better grouping
const PERIOD_OPTIONS = [
  { value: "today", label: "Today", group: "Quick" },
  { value: "yesterday", label: "Yesterday", group: "Quick" },
  { value: "last_7_days", label: "Last 7 Days", group: "Recent" },
  { value: "last_30_days", label: "Last 30 Days", group: "Recent" },
  { value: "this_month", label: "This Month", group: "Calendar" },
  { value: "last_month", label: "Last Month", group: "Calendar" },
  { value: "this_quarter", label: "This Quarter", group: "Calendar" },
  { value: "this_year", label: "This Year", group: "Calendar" },
  { value: "custom", label: "Custom Range", group: "Custom" },
];

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

interface DashboardFiltersProps {
  filters: DashboardFilterParams;
  onFiltersChange: (filters: DashboardFilterParams) => void;
  showGroupBy?: boolean;
  showStoreFilter?: boolean;
  stores?: { id: string; name: string }[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function DashboardFilters({
  filters,
  onFiltersChange,
  showGroupBy = true,
  showStoreFilter = false,
  stores = [],
  loading = false,
  onRefresh,
}: DashboardFiltersProps) {
  const [isCustomRange, setIsCustomRange] = React.useState<boolean>(
    !!(filters.period === undefined && filters.date_from && filters.date_to)
  );
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    filters.date_from && filters.date_to 
      ? { from: new Date(filters.date_from), to: new Date(filters.date_to) }
      : { from: subDays(new Date(), 30), to: new Date() }
  );
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  // Handle period/preset change
  const handlePeriodChange = (value: string) => {
    if (value === "custom") {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      onFiltersChange({
        ...filters,
        period: value as DashboardPeriod,
        date_from: undefined,
        date_to: undefined,
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
        date_from: format(range.from, "yyyy-MM-dd"),
        date_to: format(range.to, "yyyy-MM-dd"),
      });
    }
  };

  // Apply custom range and close popover
  const handleApplyCustomRange = () => {
    if (dateRange?.from && dateRange?.to) {
      setPopoverOpen(false);
    }
  };

  // Handle group by change
  const handleGroupByChange = (value: GroupBy) => {
    onFiltersChange({
      ...filters,
      group_by: value,
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
      period: "last_30_days",
      group_by: "day",
    });
  };

  // Get display label for current selection
  const getDisplayLabel = () => {
    if (isCustomRange && dateRange?.from && dateRange?.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return format(dateRange.from, "MMM d, yyyy");
      }
      return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;
    }
    const found = PERIOD_OPTIONS.find(item => item.value === filters.period);
    return found?.label || "Last 30 Days";
  };

  // Count active filters
  const activeFilterCount = [
    filters.period !== "last_30_days" || isCustomRange,
    filters.group_by !== "day",
    filters.store_id,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period / Date Range Filter */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 justify-between text-left font-normal min-w-[180px]",
                !filters.period && !isCustomRange && "text-muted-foreground"
              )}
            >
              <span className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {getDisplayLabel()}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("p-0", isCustomRange ? "w-auto" : "w-[320px]")} align="start">
            <div className="p-3 border-b">
              <p className="text-sm font-medium">Select Time Period</p>
            </div>
            
            {/* Preset Options */}
            <div className="p-2 max-h-[280px] overflow-y-auto">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Quick</p>
                {PERIOD_OPTIONS.filter(o => o.group === "Quick").map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.period === option.value && !isCustomRange ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-8"
                    onClick={() => handlePeriodChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
                
                <p className="text-xs font-medium text-muted-foreground px-2 py-1 pt-2">Recent</p>
                {PERIOD_OPTIONS.filter(o => o.group === "Recent").map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.period === option.value && !isCustomRange ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-8"
                    onClick={() => handlePeriodChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
                
                <p className="text-xs font-medium text-muted-foreground px-2 py-1 pt-2">Calendar</p>
                {PERIOD_OPTIONS.filter(o => o.group === "Calendar").map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.period === option.value && !isCustomRange ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-8"
                    onClick={() => handlePeriodChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
                
                <div className="border-t my-2" />
                
                <Button
                  variant={isCustomRange ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => handlePeriodChange("custom")}
                >
                  Custom Range
                </Button>
              </div>
            </div>
            
            {/* Custom Date Range with Calendar */}
            {isCustomRange && (
              <div className="p-3 border-t bg-muted/30 space-y-3">
                <div className="text-sm font-medium">Select Date Range</div>
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  captionLayout="dropdown"
                  startMonth={new Date(2015, 0)}
                  endMonth={new Date()}
                  disabled={(date) => date > new Date()}
                  className="rounded-md border"
                />
                {dateRange?.from && dateRange?.to && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      {format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}
                    </p>
                    <Button 
                      size="sm"
                      onClick={handleApplyCustomRange}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Group By Filter */}
        {showGroupBy && (
          <Select
            value={filters.group_by || "day"}
            onValueChange={(value) => handleGroupByChange(value as GroupBy)}
          >
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Group By</SelectLabel>
                {GROUP_BY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}

        {/* Store Filter */}
        {showStoreFilter && stores.length > 0 && (
          <Select
            value={filters.store_id || "all"}
            onValueChange={handleStoreChange}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              <SelectSeparator />
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Active Filter Badge */}
        {activeFilterCount > 0 && (
          <Badge 
            variant="secondary" 
            className="h-9 px-3 cursor-pointer hover:bg-destructive/10"
            onClick={clearFilters}
          >
            <Filter className="h-3 w-3 mr-1" />
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
            <X className="h-3 w-3 ml-1" />
          </Badge>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        )}
      </div>
    </div>
  );
}

// Compact inline filter for individual tabs
interface TabFilterProps {
  groupBy: GroupBy;
  onGroupByChange: (value: GroupBy) => void;
}

export function TabFilter({ groupBy, onGroupByChange }: TabFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">View:</span>
      <div className="flex bg-muted rounded-lg p-1">
        {GROUP_BY_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={groupBy === option.value ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-7 px-3 text-xs",
              groupBy === option.value && "bg-background shadow-sm"
            )}
            onClick={() => onGroupByChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default DashboardFilters;
