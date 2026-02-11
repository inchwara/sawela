"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  Box, 
  ShoppingCart, 
  Truck, 
  Send, 
  AlertTriangle, 
  Wrench, 
  ClipboardList, 
  RefreshCw,
  Search,
  BarChart3,
  FileText,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap,
  LayoutGrid,
  List,
  ChevronRight,
  Star,
  Clock
} from "lucide-react";
import Link from "next/link";
import { REPORT_CATEGORIES } from "@/lib/reports-api";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  Box,
  ShoppingCart,
  Truck,
  Send,
  AlertTriangle,
  Wrench,
  ClipboardList,
  RefreshCw,
};

const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  blue: { 
    bg: "bg-blue-50 dark:bg-blue-950/30", 
    text: "text-blue-600 dark:text-blue-400", 
    border: "border-blue-200 dark:border-blue-800",
    gradient: "from-blue-500 to-blue-600"
  },
  green: { 
    bg: "bg-green-50 dark:bg-green-950/30", 
    text: "text-green-600 dark:text-green-400", 
    border: "border-green-200 dark:border-green-800",
    gradient: "from-green-500 to-green-600"
  },
  purple: { 
    bg: "bg-purple-50 dark:bg-purple-950/30", 
    text: "text-purple-600 dark:text-purple-400", 
    border: "border-purple-200 dark:border-purple-800",
    gradient: "from-purple-500 to-purple-600"
  },
  orange: { 
    bg: "bg-orange-50 dark:bg-orange-950/30", 
    text: "text-orange-600 dark:text-orange-400", 
    border: "border-orange-200 dark:border-orange-800",
    gradient: "from-orange-500 to-orange-600"
  },
  cyan: { 
    bg: "bg-cyan-50 dark:bg-cyan-950/30", 
    text: "text-cyan-600 dark:text-cyan-400", 
    border: "border-cyan-200 dark:border-cyan-800",
    gradient: "from-cyan-500 to-cyan-600"
  },
  red: { 
    bg: "bg-red-50 dark:bg-red-950/30", 
    text: "text-red-600 dark:text-red-400", 
    border: "border-red-200 dark:border-red-800",
    gradient: "from-red-500 to-red-600"
  },
  yellow: { 
    bg: "bg-yellow-50 dark:bg-yellow-950/30", 
    text: "text-yellow-600 dark:text-yellow-400", 
    border: "border-yellow-200 dark:border-yellow-800",
    gradient: "from-yellow-500 to-yellow-600"
  },
  indigo: { 
    bg: "bg-indigo-50 dark:bg-indigo-950/30", 
    text: "text-indigo-600 dark:text-indigo-400", 
    border: "border-indigo-200 dark:border-indigo-800",
    gradient: "from-indigo-500 to-indigo-600"
  },
  pink: { 
    bg: "bg-pink-50 dark:bg-pink-950/30", 
    text: "text-pink-600 dark:text-pink-400", 
    border: "border-pink-200 dark:border-pink-800",
    gradient: "from-pink-500 to-pink-600"
  },
};

// Featured/Popular reports
const featuredReports = [
  { category: "inventory", report: "stock-levels", tag: "Popular" },
  { category: "inventory", report: "low-stock", tag: "Critical" },
  { category: "purchase-orders", report: "summary", tag: "Trending" },
  { category: "suppliers", report: "performance", tag: "New" },
];

// Recent reports (would come from localStorage/API in real app)
const getRecentReports = () => {
  if (typeof window === "undefined") return [];
  try {
    const recent = localStorage.getItem("recentReports");
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Filter reports based on search
  const filteredCategories = Object.entries(REPORT_CATEGORIES).filter(([key, category]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (category.label.toLowerCase().includes(query)) return true;
    return category.reports.some(
      (r) => r.label.toLowerCase().includes(query) || r.description.toLowerCase().includes(query)
    );
  });

  const totalReports = Object.values(REPORT_CATEGORIES).reduce(
    (acc, cat) => acc + cat.reports.length,
    0
  );

  return (
    <PermissionGuard permissions={["can_view_reports", "can_manage_system", "can_manage_company"]}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border mb-8 p-8"
          >
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Reports Center</h1>
                  </div>
                  <p className="text-muted-foreground text-lg max-w-2xl">
                    Generate comprehensive insights across your entire operation. From inventory tracking to supplier performance.
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      {totalReports} Reports Available
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Real-time Data
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[280px] bg-background/80 backdrop-blur-sm"
                    />
                  </div>
                  <div className="flex items-center border rounded-lg bg-background/80 backdrop-blur-sm">
                    <Button
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("grid")}
                      className="rounded-r-none"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("list")}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          </motion.div>

          {/* Quick Access - Featured Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <h2 className="text-lg font-semibold">Quick Access</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredReports.map(({ category, report, tag }, index) => {
                const categoryData = REPORT_CATEGORIES[category as keyof typeof REPORT_CATEGORIES];
                const reportData = categoryData.reports.find((r) => r.key === report);
                const colors = colorMap[categoryData.color];
                const Icon = iconMap[categoryData.icon] || Package;

                return (
                  <motion.div
                    key={`${category}-${report}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link href={`/reports/${category}/${report}`}>
                      <Card className={cn(
                        "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                        "border-2 hover:border-primary/30"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className={cn("p-2 rounded-lg", colors.bg)}>
                              <Icon className={cn("h-5 w-5", colors.text)} />
                            </div>
                            <Badge 
                              variant={tag === "Critical" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          </div>
                          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                            {reportData?.label}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {reportData?.description}
                          </p>
                          <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                            <span>Run Report</span>
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* All Report Categories */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">All Report Categories</h2>
              {searchQuery && (
                <Badge variant="outline" className="ml-2">
                  {filteredCategories.length} categories found
                </Badge>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {viewMode === "grid" ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredCategories.map(([key, category], index) => {
                    const colors = colorMap[category.color];
                    const Icon = iconMap[category.icon] || Package;
                    const isExpanded = expandedCategory === key;

                    return (
                      <motion.div
                        key={key}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={cn(
                          "group overflow-hidden transition-all duration-300",
                          "hover:shadow-xl border-2",
                          isExpanded ? "ring-2 ring-primary" : "hover:border-primary/30"
                        )}>
                          <CardHeader className={cn("pb-3", colors.bg)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2.5 rounded-xl bg-gradient-to-br shadow-sm",
                                  colors.gradient
                                )}>
                                  <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{category.label}</CardTitle>
                                  <CardDescription className="text-xs mt-0.5">
                                    {category.reports.length} reports available
                                  </CardDescription>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedCategory(isExpanded ? null : key)}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronRight className={cn(
                                  "h-4 w-4 transition-transform duration-200",
                                  isExpanded && "rotate-90"
                                )} />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              {category.reports
                                .slice(0, isExpanded ? undefined : 3)
                                .map((report) => (
                                  <Link
                                    key={report.key}
                                    href={`/reports/${key}/${report.key}`}
                                    className={cn(
                                      "flex items-center justify-between p-2.5 rounded-lg",
                                      "hover:bg-muted/80 transition-colors group/item"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={cn(
                                        "h-1.5 w-1.5 rounded-full flex-shrink-0",
                                        `bg-${category.color}-500`
                                      )} 
                                      style={{ backgroundColor: `var(--${category.color}-500, currentColor)` }}
                                      />
                                      <span className="text-sm font-medium truncate">
                                        {report.label}
                                      </span>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-all group-hover/item:translate-x-0.5" />
                                  </Link>
                                ))}
                              {!isExpanded && category.reports.length > 3 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedCategory(key)}
                                  className="w-full text-muted-foreground hover:text-foreground"
                                >
                                  +{category.reports.length - 3} more reports
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {filteredCategories.map(([key, category]) => {
                    const colors = colorMap[category.color];
                    const Icon = iconMap[category.icon] || Package;

                    return (
                      <Card key={key} className="overflow-hidden">
                        <div className={cn("px-6 py-4 border-b", colors.bg)}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg bg-gradient-to-br",
                              colors.gradient
                            )}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{category.label}</h3>
                              <p className="text-sm text-muted-foreground">
                                {category.reports.length} reports available
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="divide-y">
                          {category.reports.map((report) => (
                            <Link
                              key={report.key}
                              href={`/reports/${key}/${report.key}`}
                              className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors group"
                            >
                              <div>
                                <h4 className="font-medium group-hover:text-primary transition-colors">
                                  {report.label}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {report.description}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" className="gap-2">
                                <span className="hidden sm:inline">Run Report</span>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {filteredCategories.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No reports found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search query or browse all categories
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <Card className="bg-gradient-to-r from-muted/50 to-muted/30 border-dashed">
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Need a custom report?</h3>
                    <p className="text-sm text-muted-foreground">
                      All reports support CSV export and customizable date ranges
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Auto-refresh
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <FileText className="h-3 w-3" />
                    CSV Export
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PermissionGuard>
  );
}
