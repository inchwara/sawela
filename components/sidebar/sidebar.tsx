"use client"

import type React from "react"

import { useState, useEffect } from "react" // Import useEffect
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Truck,
  CreditCard,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Store,
  Check,
  ChevronDown,
  PlusCircle,
  ReceiptText,
  LineChart,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Package,
  Calculator,
  UserCheck,
  ClipboardList,
  FileEdit,
  AlertTriangle,
  Wrench,
  LogOut,
  Clock,
  FileText,
  Route,
  Send,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context" // Import useAuth
import { hasPermission } from "@/lib/rbac" // Import hasPermission

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [inventoryDropdownOpen, setInventoryDropdownOpen] = useState(false)
  const pathname = usePathname()
  const { userProfile, isLoading: authLoading } = useAuth()

  useEffect(() => {
    const handleResize = () => {
      setCollapsed(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Check if current path matches the nav item path
  const isActive = (path: string) => {
    // Special handling for HR & Payroll vs Finance
    if (path === "/finance") {
      // Finance should only be active for /finance root and finance-specific routes
      // but NOT for HR routes
      return pathname === "/finance" || 
             (pathname.startsWith("/finance/") && 
              !pathname.startsWith("/hr/"))
    }
    // For HR & Payroll, check if we're on HR routes
    if (path === "/hr") {
      return pathname === "/hr" || pathname.startsWith("/hr/")
    }
    // Special handling for sales dropdown - should be active for any sales route
    if (path === "/sales") {
      return pathname.startsWith("/sales/")
    }
    // Special handling for CRM dropdown - should be active for any CRM route
    if (path === "/customers") {
      return pathname.startsWith("/customers/")
    }
    // Special handling for inventory dropdown - should be active for any inventory route
    if (path === "/inventory") {
      return pathname === "/inventory" || pathname.startsWith("/inventory/")
    }
    // Default behavior for other routes
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  // Define nav items with their required permissions (store removed)
  const navItems: { name: string; href: string; icon: React.ElementType; permission: string }[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "can_view_dashboard_menu" },
    // { name: "Logistics", href: "/logistics", icon: Route, permission: "can_view_logistics_menu" },
    { name: "Dispatch", href: "/dispatch", icon: Send, permission: "can_view_dispatch_menu" },
    { name: "Requisitions", href: "/requisitions", icon: ClipboardList, permission: "can_view_requisitions_menu" },
    { name: "Breakages", href: "/breakages", icon: AlertTriangle, permission: "can_view_breakages_menu" },
    { name: "Repairs", href: "/repairs", icon: Wrench, permission: "can_view_repairs_menu" },
    { name: "Suppliers", href: "/suppliers", icon: Building2, permission: "can_view_suppliers_menu" },
    { name: "Purchase Orders", href: "/purchase-orders", icon: Package, permission: "can_view_purchase_orders_menu" },
    // { name: "Expenses", href: "/expenses", icon: ReceiptText, permission: "can_view_expenses_menu" },
    // { name: "Finance", href: "/finance", icon: Calculator, permission: "can_view_finance_menu" },
    // { name: "HR & Payroll", href: "/hr", icon: UserCheck, permission: "can_view_employees_menu" },
    // { name: "POS", href: "/POS", icon: Store, permission: "can_view_pos_menu" },
    // { name: "Chat", href: "/chat", icon: MessageSquare, permission: "can_view_chat_menu" },
    { name: "Users", href: "/users", icon: UserCheck, permission: "can_manage_users_and_roles" },
    // { name: "Reports", href: "/reports", icon: LineChart, permission: "can_view_reports_menu" },
    { name: "Settings", href: "/settings", icon: Settings, permission: "can_view_settings_menu" },
    { name: "Logout", href: "/", icon: LogOut, permission: "can_logout" },
  ]

  // Define CRM dropdown items
  const crmDropdownItems = [
    { name: "Customers", href: "/customers", icon: Users, permission: "can_view_customers_menu" },
    { name: "Accounts", href: "/customers/accounts", icon: CreditCard, permission: "can_view_customers_menu" },
  ]

  // Define sales dropdown items
  const salesDropdownItems = [
    { name: "Quotes", href: "/sales/quotes", icon: FileText, permission: "can_view_quotes_menu" },
    { name: "Orders", href: "/sales/orders", icon: ShoppingCart, permission: "can_view_sales_menu" },
    { name: "Invoices", href: "/sales/invoices", icon: ReceiptText, permission: "can_view_sales_menu" },
  ]
  
  // Define inventory dropdown items
  const inventoryDropdownItems = [
    { name: "Products", href: "/inventory/products", icon: Package, permission: "can_view_inventory_menu" },
    { name: "Product Receipts", href: "/product-receipt", icon: ReceiptText, permission: "can_view_product_receipt_menu" },
    { name: "Stock Counts", href: "/inventory/stock-counts", icon: ClipboardList, permission: "can_view_inventory_menu" },
    { name: "Stock Adjustments", href: "/inventory/stock-adjustments", icon: FileEdit, permission: "can_view_inventory_menu" },
  ]

  // Define HR dropdown items
  const hrDropdownItems = [
    { name: "Employees", href: "/hr/employees", icon: Users, permission: "can_view_employees_menu" },
    { name: "Payroll", href: "/hr/payroll", icon: Calculator, permission: "can_view_payroll_menu" },
    { name: "Leave Management", href: "/hr/leave-management", icon: ClipboardList, permission: "can_view_leave_management_menu" },
    { name: "Salary Advance", href: "/hr/salary-advance", icon: CreditCard, permission: "can_view_salary_advance_menu" },
    { name: "Time Management", href: "/hr/time-management", icon: Clock, permission: "can_view_time_management_menu" },
  ]

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-[70px] md:w-[250px] bg-white border-r border-gray-200">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[250px]",
      )}
    >
      {/* Logo and collapse button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Sawela Lodge Logo" className="h-8 object-contain" style={{ width: 'auto', maxWidth: 120 }} />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {/* Dashboard */}
          {hasPermission(userProfile as any, "can_view_dashboard_menu") && (
            <li>
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive("/dashboard") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <LayoutDashboard size={20} />
                {!collapsed && <span>Dashboard</span>}
              </Link>
            </li>
          )}
          
          {/* Inventory Dropdown */}
          {hasPermission(userProfile as any, "can_view_inventory_menu") && (
            <li>
              <div className="relative">
                <button
                  onClick={() => {
                    setInventoryDropdownOpen(!inventoryDropdownOpen)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                    isActive("/inventory") || isActive("/product-receipt") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <BarChart3 size={20} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">Inventory</span>
                      <ChevronDown 
                        size={16} 
                        className={cn(
                          "transition-transform",
                          inventoryDropdownOpen ? "rotate-180" : ""
                        )}
                      />
                    </>
                  )}
                </button>
                
                {!collapsed && inventoryDropdownOpen && (
                  <ul className="mt-1 ml-6 space-y-1">
                    {inventoryDropdownItems.map((subItem) =>
                      hasPermission(userProfile as any, subItem.permission) ? (
                        <li key={subItem.name}>
                          <Link
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm",
                              pathname === subItem.href
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-gray-600 hover:bg-gray-50",
                            )}
                          >
                            <subItem.icon size={16} />
                            <span>{subItem.name}</span>
                          </Link>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </div>
            </li>
          )}
          
          {/* Rest of navigation items (excluding Dashboard and Inventory) */}
          {navItems
            .filter(item => item.name !== "Dashboard" && item.name !== "Inventory" && item.name !== "Product Receipts")
            .map((item) =>
              hasPermission(userProfile as any, item.permission) ? (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                      isActive(item.href) ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    <item.icon size={20} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              ) : null,
            )}
        </ul>
      </nav>

      {/* User profile */}
      <div
        className={cn("border-t border-gray-200 p-4", collapsed ? "flex justify-center" : "flex items-center gap-3")}
      >
        <Avatar className="h-9 w-9">
          <AvatarImage src="/placeholder.svg" alt="User avatar" />
          <AvatarFallback className="bg-primary/10 text-primary">
            {userProfile?.first_name?.[0] || ""}
            {userProfile?.last_name?.[0] || ""}
          </AvatarFallback>
        </Avatar>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {userProfile?.first_name} {userProfile?.last_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{userProfile?.email}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export { Sidebar }