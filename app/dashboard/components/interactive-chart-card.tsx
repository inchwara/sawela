"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, MoreVertical, Download, Maximize2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"

interface DataPoint {
  label: string
  value: number
  color?: string
}

interface InteractiveChartCardProps {
  title: string
  description?: string
  data: DataPoint[]
  total?: number
  trend?: { value: number; label: string }
  chartType?: "bar" | "line" | "donut"
  tabs?: string[]
  onTabChange?: (tab: string) => void
  className?: string
  loading?: boolean
}

export function InteractiveChartCard({
  title,
  description,
  data,
  total,
  trend,
  chartType = "bar",
  tabs,
  onTabChange,
  className,
  loading = false,
}: InteractiveChartCardProps) {
  const [activeTab, setActiveTab] = useState(tabs?.[0] || "")
  const maxValue = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 1

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    onTabChange?.(value)
  }

  return (
    <Card className={cn("group hover:shadow-lg transition-all duration-300", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              {trend && (
                <Badge
                  variant={trend.value >= 0 ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {trend.value >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(trend.value)}%
                </Badge>
              )}
            </div>
            {description && (
              <CardDescription className="text-sm">{description}</CardDescription>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Maximize2 className="h-4 w-4 mr-2" />
                View Fullscreen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tab Filters */}
        {tabs && tabs.length > 0 && (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
              {tabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="text-xs">
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading chart data...</p>
          </div>
        ) : (
          <>
            {/* Total Display */}
            {total !== undefined && (
              <div className="mb-6">
                <p className="text-3xl font-bold">{total.toLocaleString()}</p>
                {trend && (
                  <p className="text-sm text-muted-foreground mt-1">{trend.label}</p>
                )}
              </div>
            )}

            {/* Chart Visualization */}
            {chartType === "bar" && (
          <div className="space-y-3">
            {data.map((item, index) => {
              const percentage = (item.value / maxValue) * 100
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground truncate flex-1">
                      {item.label}
                    </span>
                    <span className="font-semibold ml-2">
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        item.color || "bg-gradient-to-r from-blue-500 to-purple-500"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {chartType === "donut" && (
          <div className="flex flex-col items-center space-y-4">
            {/* Simple Donut Chart Representation */}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {data.map((item, index) => {
                  const totalValue = data.reduce((sum, d) => sum + d.value, 0)
                  const percentage = (item.value / totalValue) * 100
                  const colors = [
                    "stroke-blue-500",
                    "stroke-purple-500",
                    "stroke-pink-500",
                    "stroke-orange-500",
                    "stroke-green-500",
                  ]
                  return (
                    <circle
                      key={index}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      className={colors[index % colors.length]}
                      strokeWidth="12"
                      strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                      strokeDashoffset={
                        -data
                          .slice(0, index)
                          .reduce((sum, d) => sum + (d.value / totalValue) * 251, 0)
                      }
                    />
                  )
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {data.map((item, index) => {
                const colors = [
                  "bg-blue-500",
                  "bg-purple-500",
                  "bg-pink-500",
                  "bg-orange-500",
                  "bg-green-500",
                ]
                return (
                  <div key={index} className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", colors[index % colors.length])} />
                    <span className="text-xs text-muted-foreground truncate">
                      {item.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
