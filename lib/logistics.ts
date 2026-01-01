import apiCall from "./api";

export interface LogisticsCompany {
  id: string;
  name: string;
  description: string | null;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  website: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_subscription_id: string | null;
}

export interface LogisticsDeliveryPerson {
  id: string;
  company_id: string;
  full_name: string;
  phone_number: string;
  email: string;
  residential_address: string;
  availability_status: string;
  total_deliveries: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface LogisticsOrder {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: string;
  status: string;
  created_at: string;
  updated_at: string;
  company_id: string;
  notes: string | null;
  discount: string;
  final_amount: string;
  payment_status: string | null;
  [key: string]: any;
}

export interface Logistics {
  id: string;
  order_id: string | null;
  company_id: string;
  dispatcher_id: string;
  delivery_person_id: string | null;
  logistics_provider: string;
  delivery_method: string;
  vehicle_type: string;
  vehicle_id: string | null;
  tracking_number: string;
  delivery_status: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  city: string;
  state: string;
  country: string;
  dispatch_time: string | null;
  estimated_delivery_time: string | null;
  actual_delivery_time: string | null;
  signature: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  order: LogisticsOrder | null;
  delivery_person: LogisticsDeliveryPerson | null;
  company: LogisticsCompany;
  [key: string]: any;
}

export interface PaginatedLogistics {
  current_page: number;
  data: Logistics[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{ url: string | null; label: string; active: boolean }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface LogisticsResponse {
  status: string;
  message: string;
  logistics: PaginatedLogistics | Logistics[];
}

export interface LogisticsSummary {
  total: number;
  dispatched: number;
  delivered: number;
  cancelled: number;
  pending: number;
  in_transit: number;
  failed: number;
}

/**
 * Fetches logistics data from the API
 * @param filters Optional filters
 * @returns Promise with logistics data
 */
export async function getLogistics(
  filters: {
    search?: string;
    status?: string;
    dateRange?: { from: string; to: string };
  } = {}
): Promise<Logistics[]> {
  try {
    // Check if we're in a browser environment before making API call with auth
    if (typeof window === 'undefined') {
      return [];
    }
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
    if (filters.dateRange?.from) queryParams.append('from_date', filters.dateRange.from);
    if (filters.dateRange?.to) queryParams.append('to_date', filters.dateRange.to);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    try {
      // Make API call with authentication required
      const response = await apiCall<LogisticsResponse>(
        `/logistics${queryString}`,
        "GET",
        undefined,
        true
      );
      
      if (response.status === "success" && response.logistics) {
        // Handle paginated response
        if ('data' in response.logistics && Array.isArray(response.logistics.data)) {
          return response.logistics.data;
        }
        // Handle direct array response (backwards compatibility)
        if (Array.isArray(response.logistics)) {
          return response.logistics;
        }
        return [];
      } else {
        // Convert potential object error message to string
        const errorMessage = typeof response.message === "string" 
          ? response.message 
          : "Failed to fetch logistics data";
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      // Handle specific role-related errors from the API
      if (error.message && error.message.includes("role")) {
        return [];
      }
      
      // Handle API route not found errors
      if (error.message?.includes("could not be found") || 
          error.message?.includes("404") || 
          error.message?.includes("500")) {
        return [];
      }
      
      throw error;
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch logistics data: ${error.message || "Unknown error"}`);
  }
}

/**
 * Calculates logistics summary from logistics data
 * @param logistics Array of logistics entries
 * @returns Summary object with counts by status
 */
export function calculateLogisticsSummary(logistics: Logistics[]): LogisticsSummary {
  return {
    total: logistics.length,
    dispatched: logistics.filter(item => item.delivery_status === 'dispatched').length,
    delivered: logistics.filter(item => item.delivery_status === 'delivered').length,
    cancelled: logistics.filter(item => item.delivery_status === 'cancelled').length,
    pending: logistics.filter(item => item.delivery_status === 'pending').length,
    in_transit: logistics.filter(item => item.delivery_status === 'in_transit').length,
    failed: logistics.filter(item => item.delivery_status === 'failed').length,
  };
}

/**
 * Fetches logistics summary data - client-side only
 * @returns Promise with logistics summary
 */
export async function getLogisticsSummary(): Promise<LogisticsSummary> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return {
        total: 0,
        dispatched: 0,
        delivered: 0,
        cancelled: 0,
        pending: 0,
        in_transit: 0,
      };
    }
    
    const logistics = await getLogistics();
    return calculateLogisticsSummary(logistics);
  } catch (error) {
    // Return default empty summary on error
    return {
      total: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
      pending: 0,
      in_transit: 0,
    };
  }
}

/**
 * Creates a new logistics entry for an order
 * @param logisticsData The logistics data to create
 * @returns Promise with the created logistics entry
 */
export interface CreateLogisticsData {
  order_id: string;
  delivery_person_id?: string | null;
  delivery_method: string;
  delivery_status: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  tracking_number: string;
  dispatch_time?: string | null;
  estimated_delivery_time?: string | null;
  notes?: string | null;
  postal_code?: string | null;
}

interface CreateLogisticsResponse {
  status: string;
  message: string;
  logistics: Logistics;
}

export async function createLogistics(data: CreateLogisticsData): Promise<Logistics> {
  try {
    // Make API call with authentication required
    const response = await apiCall<CreateLogisticsResponse>(
      '/logistics',
      'POST',
      data,
      true
    );
    
    if (response.status === 'success' && response.logistics) {
      return response.logistics;
    } else {
      const errorMessage = typeof response.message === 'string'
        ? response.message
        : 'Failed to create logistics entry';
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    throw new Error(`Failed to create logistics entry: ${error.message || 'Unknown error'}`);
  }
}
