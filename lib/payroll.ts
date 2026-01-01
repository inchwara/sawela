import apiCall from './api';

// Payroll Item interface for individual employee data
export interface PayrollItem {
  id: string;
  payroll_record_id: string;
  employee_id: string;
  company_id: string;
  basic_salary: string;
  allowances: string;
  overtime_amount: string;
  bonus_amount: string;
  gross_pay: string;
  paye_amount: string;
  nssf_amount: string;
  shif_amount: string;
  other_deductions: string;
  total_deductions: string;
  net_pay: string;
  hours_worked: string;
  overtime_hours: string;
  days_worked: string;
  leave_days: string;
  allowance_breakdown: Array<{
    type: string;
    amount: number;
  }>;
  deduction_breakdown: Array<{
    type: string;
    amount: number;
  }>;
  notes?: string | null;
  metadata?: any | null;
  created_at: string;
  updated_at: string;
  employee: {
    id: string;
    company_id: string;
    employee_number: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth?: string | null;
    gender: string;
    national_id: string;
    kra_pin?: string | null;
    nssf_number?: string | null;
    shif_number?: string | null;
    address: string;
    city: string;
    state: string;
    postal_code?: string | null;
    hire_date: string;
    termination_date?: string | null;
    employment_type: string;
    payment_frequency: string;
    basic_salary: string;
    hourly_rate?: string | null;
    bank_name?: string | null;
    bank_account?: string | null;
    bank_branch?: string | null;
    is_active: boolean;
    department: string;
    position: string;
    supervisor_id?: string | null;
    allowances: any;
    deductions: any;
    metadata?: any | null;
    created_at: string;
    updated_at: string;
    created_by: string;
  };
}

// Company interface
export interface Company {
  id: string;
  name: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  website?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_subscription_id?: string | null;
  is_first_time: boolean;
}

// Payroll Record interface
export interface PayrollRecord {
  id: string;
  company_id: string;
  payroll_number: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  total_gross_pay: string;
  total_deductions: string;
  total_net_pay: string;
  total_paye: string;
  total_nssf: string;
  total_shif: string;
  employee_count: number;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  notes?: string | null;
  metadata?: any | null;
  created_at: string;
  updated_at: string;
  company?: Company;
  items?: PayrollItem[];
}

// Response interfaces
interface PayrollRecordsResponse {
  status: string;
  payroll_records: PayrollRecord[];
  total: number;
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
  message?: string;
}

interface PayrollRecordResponse {
  status: string;
  payroll_record: PayrollRecord;
  message?: string;
}

interface DetailedPayrollRecordResponse {
  status: string;
  message: string;
  payroll_record: PayrollRecord & {
    company: Company;
    items: PayrollItem[];
  };
}

interface PayrollApprovalResponse {
  status: string;
  message: string;
  payroll_record: {
    id: string;
    status: string;
    approved_at: string;
    approved_by: string;
  };
}

interface BulkPayrollResponse {
  status: string;
  payroll_records: PayrollRecord[];
  message?: string;
}

// Payroll Management Functions

/**
 * Fetch payroll records with optional filters
 * @param params Optional filtering parameters
 * @returns Promise with payroll records
 */
export async function getPayrollRecords(params?: {
  company_id?: string;
  employee_id?: string;
  pay_period?: string;
  status?: string;
  department?: string;
  search?: string;
  page?: number;
  per_page?: number;
}): Promise<PayrollRecordsResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.company_id) queryParams.append('company_id', params.company_id);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.pay_period) queryParams.append('pay_period', params.pay_period);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const url = `/payroll${queryString}`;
    
    const response = await apiCall<PayrollRecordsResponse>(url, 'GET');
    return response;
  } catch (error: any) {
    throw new Error(`Failed to fetch payroll records: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch a single payroll record by ID with detailed information
 * @param id Payroll record ID
 * @returns Promise with detailed payroll record data including company and employee items
 */
export async function getPayrollRecord(id: string): Promise<DetailedPayrollRecordResponse> {
  try {
    const response = await apiCall<DetailedPayrollRecordResponse>(`/payroll/${id}`, 'GET');
    return response;
  } catch (error: any) {
    throw new Error(`Failed to fetch payroll record: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Create a new payroll record
 * @param data Payroll record data
 * @returns Promise with created payroll record
 */
export async function createPayrollRecord(data: Partial<PayrollRecord>): Promise<PayrollRecordResponse> {
  try {
    const response = await apiCall<PayrollRecordResponse>('/finance/payroll', 'POST', data);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to create payroll record: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update an existing payroll record
 * @param id Payroll record ID
 * @param data Updated payroll record data
 * @returns Promise with updated payroll record
 */
export async function updatePayrollRecord(id: string, data: Partial<PayrollRecord>): Promise<PayrollRecordResponse> {
  try {
    const response = await apiCall<PayrollRecordResponse>(`/finance/payroll/${id}`, 'PUT', data);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to update payroll record: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a payroll record
 * @param id Payroll record ID
 * @returns Promise with deletion confirmation
 */
export async function deletePayrollRecord(id: string): Promise<{ status: string; message: string }> {
  try {
    const response = await apiCall<{ status: string; message: string }>(`/finance/payroll/${id}`, 'DELETE');
    return response;
  } catch (error: any) {
    throw new Error(`Failed to delete payroll record: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Approve a payroll record
 * @param id Payroll record ID
 * @returns Promise with approval response containing updated status and approval details
 */
export async function approvePayrollRecord(id: string): Promise<PayrollApprovalResponse> {
  try {
    const response = await apiCall<PayrollApprovalResponse>(`/payroll/${id}/approve`, 'POST', {});
    return response;
  } catch (error: any) {
    throw new Error(`Failed to approve payroll record: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Process payroll payment
 * @param id Payroll record ID
 * @param data Payment data
 * @returns Promise with processed payroll record
 */
export async function processPayrollPayment(id: string, data: { 
  pay_date: string; 
  payment_method?: string; 
  reference?: string 
}): Promise<PayrollRecordResponse> {
  try {
    const response = await apiCall<PayrollRecordResponse>(`/finance/payroll/${id}/process-payment`, 'POST', data);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to process payroll payment: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Generate payslip for a payroll record
 * @param id Payroll record ID
 * @returns Promise with payslip blob
 */
export async function generatePayslip(id: string): Promise<Blob> {
  try {
    const response = await fetch(`/api/finance/payroll/${id}/payslip`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate payslip');
    }
    
    return response.blob();
  } catch (error: any) {
    throw new Error(`Failed to generate payslip: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Create payroll records for multiple employees
 * @param data Bulk payroll data
 * @returns Promise with created payroll records
 */
export async function bulkCreatePayroll(data: {
  pay_period: string;
  employee_ids?: string[];
  department?: string;
}): Promise<BulkPayrollResponse> {
  try {
    const response = await apiCall<BulkPayrollResponse>('/finance/payroll/bulk-create', 'POST', data);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to create bulk payroll: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Process bulk payroll with custom data for each employee
 * @param data Detailed bulk payroll data with custom employee data
 * @returns Promise with bulk payroll processing results
 */
export async function processBulkPayroll(data: {
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  employee_ids: string[];
  custom_data: Record<string, {
    basic_salary: number;
    allowances: Array<{ type: string; amount: number }>;
    deductions: Array<{ type: string; amount: number }>;
    overtime_hours: number;
    overtime_type: 'regular' | 'weekend' | 'holiday';
    region: string;
    skill_level: 'unskilled' | 'semi_skilled' | 'skilled' | 'highly_skilled';
  }>;
}) {
  try {
    const response = await apiCall('/payroll/bulk', 'POST', data);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to process bulk payroll: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch payroll company summary
 * @param params Optional filtering parameters
 * @returns Promise with payroll company summary data
 */
export async function getPayrollSummary(params?: {
  pay_period?: string;
  status?: string;
}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.pay_period) queryParams.append('pay_period', params.pay_period);
    if (params?.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const url = `/payroll-company-summary${queryString}`;
    
    const response = await apiCall<any>(url, 'GET');
    return response;
  } catch (error: any) {
    throw new Error(`Failed to fetch payroll company summary: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch employee payroll history
 * @param id Employee ID
 * @param params Optional filtering parameters
 * @returns Promise with employee payroll history
 */
export async function getEmployeePayrollHistory(id: string, params?: {
  pay_period?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.pay_period) queryParams.append('pay_period', params.pay_period);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const url = `/finance/employees/${id}/payroll${queryString}`;
    
    const response = await apiCall<any>(url, 'GET');
    return response;
  } catch (error: any) {
    throw new Error(`Failed to fetch employee payroll history: ${error.message || 'Unknown error'}`);
  }
}

// Export all functions as a single object for easier imports
export const payrollApi = {
  // Payroll Management
  getPayrollRecords,
  getPayrollRecord,
  createPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
  approvePayrollRecord,
  processPayrollPayment,
  generatePayslip,
  bulkCreatePayroll,
  processBulkPayroll,
  getPayrollSummary,
  getEmployeePayrollHistory,
};