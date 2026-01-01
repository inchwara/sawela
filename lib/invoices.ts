import apiCall from "./api"

export interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string;
  customer_id: string;
  order_id: string | null;
  payment_id: string | null;
  type: 'sales' | 'service' | 'recurring';
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  invoice_date: string;
  due_date: string;
  subtotal: number | string;
  tax_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  amount_paid: number | string;
  balance_amount: number | string;
  currency: string;
  exchange_rate?: number;
  payment_terms?: string;
  notes?: string;
  terms_and_conditions?: string;
  sent_at?: string;
  viewed_at?: string;
  paid_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  order?: {
    id: string;
    order_number: string;
    final_amount: number | string;
    order_date?: string;
  };
  line_items?: InvoiceLineItem[];
  created_by_user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  variant_id?: string;
  description: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  discount_amount: number | string;
  tax_rate: number | string;
  tax_amount?: number | string;
  line_total?: number | string;
  created_at?: string;
  updated_at?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  variant?: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface CreateInvoiceRequest {
  customer_id: string;
  type: 'sales' | 'service' | 'recurring';
  invoice_date: string;
  due_date: string;
  currency: string;
  payment_terms?: string;
  notes?: string;
  terms_and_conditions?: string;
  line_items: {
    product_id?: string;
    variant_id?: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    discount_amount: number;
    tax_rate: number;
  }[];
}

export interface CreateInvoiceFromOrderRequest {
  invoice_date?: string;
  due_date?: string;
  payment_terms?: string;
  notes?: string;
}

export interface InvoiceStatistics {
  total_invoices: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  paid_invoices: number;
  draft_invoices: number;
  sent_invoices: number;
  overdue_invoices: number;
  average_invoice_amount: number;
}

export async function fetchInvoices(params?: {
  customer_id?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  overdue?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<{ data: Invoice[], meta?: any }> {
  try {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const url = `/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiCall<{ data: Invoice[], meta?: any }>(url, "GET", undefined, true);
    
    return response;
  } catch (error: any) {
    if (error.message?.includes("could not be found") || 
        error.message?.includes("404") || 
        error.message?.includes("500")) {
      return { data: [] };
    }
    
    throw new Error(`Failed to fetch invoices: ${error.message || "Unknown error"}`);
  }
}

export async function fetchInvoiceById(invoiceId: string): Promise<Invoice> {
  try {
    const response = await apiCall<Invoice>(`/invoices/${invoiceId}`, "GET", undefined, true);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to fetch invoice: ${error.message || "Unknown error"}`);
  }
}

export async function createInvoice(invoiceData: CreateInvoiceRequest): Promise<Invoice> {
  try {
    const response = await apiCall<{ message: string; data: Invoice }>("/invoices", "POST", invoiceData, true);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to create invoice: ${error.message || "Unknown error"}`);
  }
}

export async function createInvoiceFromOrder(orderId: string, invoiceData: CreateInvoiceFromOrderRequest): Promise<Invoice> {
  try {
    const response = await apiCall<{ message: string; data: Invoice }>(`/invoices/from-order/${orderId}`, "POST", invoiceData, true);
    return response.data;
  } catch (error: any) {
    // Preserve the original error structure for better debugging
    const enhancedError = new Error(`Failed to create invoice from order: ${error.message || "Unknown error"}`);
    
    // Attach additional error properties
    if (error.response) {
      (enhancedError as any).response = error.response;
      (enhancedError as any).status = error.response.status;
      (enhancedError as any).data = error.response.data;
    }
    
    if (error.code) {
      (enhancedError as any).code = error.code;
    }
    
    throw enhancedError;
  }
}

export async function updateInvoice(invoiceId: string, updates: Partial<CreateInvoiceRequest>): Promise<Invoice> {
  try {
    const response = await apiCall<{ message: string; data: Invoice }>(`/invoices/${invoiceId}`, "PUT", updates, true);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to update invoice: ${error.message || "Unknown error"}`);
  }
}

export async function deleteInvoice(invoiceId: string): Promise<boolean> {
  try {
    await apiCall<{ message: string }>(`/invoices/${invoiceId}`, "DELETE", undefined, true);
    return true;
  } catch (error: any) {
    throw new Error(`Failed to delete invoice: ${error.message || "Unknown error"}`);
  }
}

export async function sendInvoice(invoiceId: string): Promise<Invoice> {
  try {
    const response = await apiCall<{ message: string; data: Invoice }>(`/invoices/${invoiceId}/send`, "POST", undefined, true);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to send invoice: ${error.message || "Unknown error"}`);
  }
}

// Payment management interfaces
export interface RecordPaymentRequest {
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_id?: string;
  notes?: string;
}

export interface MapPaymentRequest {
  payment_id: string;
  apply_amount?: number;
}

export interface InvoicePayment {
  id: string;
  order_id: string | null;
  invoice_id: string;
  customer_id: string;
  company_id: string;
  payment_method: string;
  transaction_id: string | null;
  amount_paid: string | number;
  amount_applied: string | number;
  status: string;
  payment_date: string;
  applied_date: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistoryResponse {
  invoice_id: string;
  invoice_number: string;
  total_amount: string | number;
  amount_paid: string | number;
  balance_amount: string | number;
  payment_count: number;
  payments: InvoicePayment[];
}

export interface PaymentRecordResponse {
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: string | number;
    amount_paid: string | number;
    balance_amount: string | number;
    status: string;
  };
  payment: {
    id: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    transaction_id: string | null;
    notes: string | null;
  };
}

export interface PaymentMappingResponse {
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: string | number;
    amount_paid: string | number;
    balance_amount: string | number;
    status: string;
  };
  payment_mapping: {
    payment_id: string;
    amount_applied: number;
    payment_date: string;
    payment_method: string;
    transaction_id: string | null;
  };
}

export interface AvailablePayment {
  id: string;
  amount_paid: string;
  payment_method: string;
  payment_date: string | null;
  transaction_id: string | null;
  status: string;
  order_id: string | null;
  invoice_id?: string | null;
  customer_id: string;
  company_id: string;
  created_at: string;
}

// New interfaces for unified allocation system
export interface PaymentAllocation {
  invoice_id: string;
  amount: number;
  notes?: string;
}

export interface BulkAllocationResponse {
  payment: {
    id: string;
    total_amount: string;
    previously_allocated: string;
    newly_allocated: string;
    remaining_amount: string;
  };
  allocations: Array<{
    invoice_id: string;
    invoice_number: string;
    allocated_amount: number;
    new_balance: string;
    new_status: string;
  }>;
  summary: {
    invoices_affected: number;
    total_allocated: number;
  };
}

export interface PaymentAvailabilityResponse {
  payment_id: string;
  transaction_id: string;
  payment_method: string;
  payment_date: string;
  total_amount: string;
  allocated_amount: string;
  available_amount: string;
  is_fully_allocated: boolean;
  allocation_percentage: number;
  allocations_count: number;
  allocations: Array<{
    allocation_id: string;
    invoice_id: string;
    invoice_number: string;
    amount_allocated: string;
    allocated_date: string;
    notes: string | null;
  }>;
}

export interface InvoiceBalanceResponse {
  id: string;
  invoice_number: string;
  total_amount: string;
  amount_paid: string;
  balance_amount: string;
  status: string;
}

// Payment management functions
export async function recordInvoicePayment(invoiceId: string, paymentData: RecordPaymentRequest): Promise<PaymentRecordResponse> {
  try {
    const response = await apiCall<{ message: string; data: PaymentRecordResponse }>(
      `/invoices/${invoiceId}/record-payment`,
      "POST",
      paymentData,
      true
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to record payment: ${error.message || "Unknown error"}`);
  }
}

export async function mapPaymentToInvoice(invoiceId: string, paymentData: MapPaymentRequest): Promise<PaymentMappingResponse> {
  try {
    const response = await apiCall<{ message: string; data: PaymentMappingResponse }>(
      `/invoices/${invoiceId}/map-payment`,
      "POST",
      paymentData,
      true
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to map payment: ${error.message || "Unknown error"}`);
  }
}

export async function fetchInvoicePaymentHistory(invoiceId: string): Promise<PaymentHistoryResponse> {
  try {
    const response = await apiCall<{ message: string; data: PaymentHistoryResponse }>(
      `/invoices/${invoiceId}/payment-history`,
      "GET",
      undefined,
      true
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to fetch payment history: ${error.message || "Unknown error"}`);
  }
}

// Utility function to safely parse invoice amounts
export function parseInvoiceAmount(amount: any): number {
  if (amount === null || amount === undefined || amount === '') {
    return 0
  }
  
  const parsed = Number(amount)
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed
}

export async function fetchInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
  try {
    const response = await apiCall<{ message: string; data: Invoice }>(`/invoices/by-order/${orderId}`, "GET", undefined, true);
    return response.data;
  } catch (error: any) {
    // Return null if no invoice found (404) instead of throwing error
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch invoice by order ID: ${error.message || "Unknown error"}`);
  }
}

// Fetch available payments for mapping to invoices
export async function fetchAvailablePaymentsForMapping(
  customerId: string,
  filters: {
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  payments: AvailablePayment[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('customer_id', customerId);
    queryParams.append('status', 'completed');
    queryParams.append('unmapped_only', 'true'); // Only payments without invoice_id
    
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.offset) queryParams.append('offset', filters.offset.toString());
    
    const response = await apiCall<{
      message: string;
      data: {
        payments: AvailablePayment[];
        total: number;
        hasMore: boolean;
      };
    }>(`/payments/available-for-mapping?${queryParams.toString()}`, "GET", undefined, true);
    
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to fetch available payments: ${error.message || "Unknown error"}`);
  }
}

// NEW: Bulk payment allocation - allocate one payment to multiple invoices
export async function allocatePaymentToInvoices(
  paymentId: string,
  allocations: PaymentAllocation[]
): Promise<BulkAllocationResponse> {
  try {
    const response = await apiCall<{ message: string; data: BulkAllocationResponse }>(
      `/payments/allocate-to-invoices`,
      "POST",
      {
        payment_id: paymentId,
        allocations
      },
      true
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to allocate payment to invoices: ${error.message || "Unknown error"}`);
  }
}

// NEW: Get available amount from a payment for allocation
export async function getPaymentAvailableAmount(paymentId: string): Promise<PaymentAvailabilityResponse> {
  try {
    const response = await apiCall<{ message: string; data: PaymentAvailabilityResponse }>(
      `/payments/${paymentId}/available-amount`,
      "GET",
      undefined,
      true
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to fetch payment availability: ${error.message || "Unknown error"}`);
  }
}

// NEW: Get current outstanding balance for multiple invoices
export async function getInvoicesOutstandingBalances(invoiceIds: string[]): Promise<InvoiceBalanceResponse[]> {
  try {
    const response = await apiCall<{ message: string; data: InvoiceBalanceResponse[] }>(
      `/invoices/outstanding-balances`,
      "POST",
      { invoice_ids: invoiceIds },
      true
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to fetch invoice balances: ${error.message || "Unknown error"}`);
  }
}
