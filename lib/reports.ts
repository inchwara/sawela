import apiCall from "@/lib/api"

interface SalesDataPoint {
  date: string
  sales: number
}

interface ProductData {
  name: string
  quantity: number
}

interface CustomerData {
  created_at: string
}

interface ExpenseData {
  amount: number
  category_name: string
}

interface OrderData {
  status: string
  total_amount: number
  created_at: string
  customer_id: string
}

interface PaymentData {
  amount: number
  payment_method: string
}

interface TicketData {
  created_at: string
  resolved_at: string
  status: string
}

interface ProductInventoryData {
  name: string
  stock_quantity: number
  price: number
  category: string
}

interface CustomerLocationData {
  city: string
}

interface ExpenseTimeData {
  created_at: string
  amount: number
}

interface OrderItemData {
  product_id: string
  quantity: number
  product_name: string
}

/**
 * Fetches sales data for a given date range.
 */
export async function getSalesData(startDate: string, endDate: string): Promise<SalesDataPoint[]> {
  try {
    const data = await apiCall<SalesDataPoint[]>(`/reports/sales?start_date=${startDate}&end_date=${endDate}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches top selling products.
 */
export async function getTopSellingProducts(limit: number = 10): Promise<ProductData[]> {
  try {
    const data = await apiCall<ProductData[]>(`/reports/products/top-selling?limit=${limit}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches customer growth data.
 */
export async function getCustomerGrowthData(startDate: string, endDate: string): Promise<CustomerData[]> {
  try {
    const data = await apiCall<CustomerData[]>(`/reports/customers/growth?start_date=${startDate}&end_date=${endDate}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches expense data by category.
 */
export async function getExpenseDataByCategory(): Promise<ExpenseData[]> {
  try {
    const data = await apiCall<ExpenseData[]>("/reports/expenses/by-category", "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches order status distribution.
 */
export async function getOrderStatusDistribution(): Promise<{ status: string; count: number }[]> {
  try {
    const data = await apiCall<{ status: string; count: number }[]>("/reports/orders/status-distribution", "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches sales forecast data.
 */
export async function getSalesForecast(periods: number = 12): Promise<SalesDataPoint[]> {
  try {
    const data = await apiCall<SalesDataPoint[]>(`/reports/sales/forecast?periods=${periods}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches top products by stock level.
 */
export async function getTopProductsByStock(limit: number = 10): Promise<ProductInventoryData[]> {
  try {
    const data = await apiCall<ProductInventoryData[]>(`/reports/products/stock?limit=${limit}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches ticket resolution time data.
 */
export async function getTicketResolutionData(startDate: string, endDate: string): Promise<TicketData[]> {
  try {
    const data = await apiCall<TicketData[]>(`/reports/tickets/resolution?start_date=${startDate}&end_date=${endDate}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches payment method distribution.
 */
export async function getPaymentMethodDistribution(): Promise<PaymentData[]> {
  try {
    const data = await apiCall<PaymentData[]>("/reports/payments/method-distribution", "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches order items data for product analysis.
 */
export async function getOrderItemsData(limit: number = 1000): Promise<OrderItemData[]> {
  try {
    const data = await apiCall<OrderItemData[]>(`/reports/orders/items?limit=${limit}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches delivery performance data.
 */
export async function getDeliveryPerformanceData(): Promise<{ status: string; count: number }[]> {
  try {
    const data = await apiCall<{ status: string; count: number }[]>("/reports/logistics/delivery-performance", "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches revenue data.
 */
export async function getRevenueData(startDate: string, endDate: string): Promise<SalesDataPoint[]> {
  try {
    const data = await apiCall<SalesDataPoint[]>(`/reports/revenue?start_date=${startDate}&end_date=${endDate}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches expense data.
 */
export async function getExpenseData(startDate: string, endDate: string): Promise<ExpenseTimeData[]> {
  try {
    const data = await apiCall<ExpenseTimeData[]>(`/reports/expenses?start_date=${startDate}&end_date=${endDate}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches profit data.
 */
export async function getProfitData(startDate: string, endDate: string): Promise<SalesDataPoint[]> {
  try {
    const data = await apiCall<SalesDataPoint[]>(`/reports/profit?start_date=${startDate}&end_date=${endDate}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches customer location data.
 */
export async function getCustomerLocationData(): Promise<CustomerLocationData[]> {
  try {
    const data = await apiCall<CustomerLocationData[]>("/reports/customers/locations", "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches product inventory data.
 */
export async function getProductInventoryData(): Promise<ProductInventoryData[]> {
  try {
    const data = await apiCall<ProductInventoryData[]>("/reports/products/inventory", "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches expense trend data.
 */
export async function getExpenseTrendData(startDate: string, endDate: string): Promise<ExpenseTimeData[]> {
  try {
    const data = await apiCall<ExpenseTimeData[]>(`/reports/expenses/trend?start_date=${startDate}&end_date=${endDate}`, "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches expense category trend data.
 */
export async function getExpenseCategoryTrendData(): Promise<ExpenseData[]> {
  try {
    const data = await apiCall<ExpenseData[]>("/reports/expenses/category-trend", "GET")
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/**
 * Fetches order count data.
 */
export async function getOrderCountData(): Promise<{ total: number; returned: number }> {
  try {
    const data = await apiCall<{ total: number; returned: number }>("/reports/orders/count", "GET")
    return data || { total: 0, returned: 0 }
  } catch (error) {
    return { total: 0, returned: 0 }
  }
}
