import apiCall from './api';

// Employee interface matching the API specification
export interface Employee {
  id?: string;
  company_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  national_id?: string;
  hire_date: string;
  termination_date?: string | null;
  employment_type: string;
  payment_frequency: string;
  basic_salary: string; // API returns this as a string
  hourly_rate?: string | null; // API returns this as a string
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  bank_name?: string;
  bank_account?: string;
  bank_branch?: string;
  department: string;
  position: string;
  supervisor_id?: string | null;
  is_active: boolean; // API uses is_active instead of employment_status
  employment_status?: 'active' | 'inactive' | 'terminated';
  gross_salary?: number;
  statutory_details: {
    kra_pin: string;
    nssf_number: string;
    shif_number: string;
    has_disability?: boolean;
    disability_exemption_certificate?: string | null;
    disability_exemption_amount?: number | null;
    has_insurance_relief?: boolean;
    insurance_relief_amount?: number;
  };
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
  payroll_history?: any[]; // PayrollRecord[] - moved to payroll.ts
  created_at?: string;
  updated_at?: string;
  company?: {
    id: string;
    name: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    website?: string;
    logo_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_first_time: boolean;
    current_subscription_id?: string;
  };
}



// Employee Statistics interface
interface EmployeeStatistics {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  by_department: Record<string, number>;
  by_employment_type: Record<string, number>;
}

interface EmployeeStatisticsResponse {
  status: string;
  message: string;
  statistics: EmployeeStatistics;
}

// Response interfaces
interface EmployeeResponse {
  status: string;
  employee: Employee;
  message?: string;
}

interface EmployeesResponse {
  status: string;
  employees: Employee[];
  total: number;
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
  message?: string;
}



// Updated Employee interface to match API specification

interface CreateEmployeePayload {
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  national_id?: string;
  hire_date: string;
  termination_date?: string | null;
  employment_type: string;
  payment_frequency: string;
  basic_salary: string; // API expects this as a string
  hourly_rate?: string | null; // API expects this as a string
  department: string;
  position: string;
  supervisor_id?: string | null;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  bank_name?: string;
  bank_account?: string;
  bank_branch?: string;
  statutory_details: {
    kra_pin: string;
    nssf_number: string;
    shif_number: string;
    has_disability?: boolean;
    disability_exemption_certificate?: string | null;
    disability_exemption_amount?: number | null;
    has_insurance_relief?: boolean;
    insurance_relief_amount?: number;
  };
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
}

// Employee Management Functions

/**
 * Fetch all employees with optional filters
 * @param params Optional filtering parameters
 * @returns Promise with employees data
 */
export async function getEmployees(params?: {
  company_id?: string;
  department?: string;
  employment_status?: string;
  search?: string;
  page?: number;
  per_page?: number;
}): Promise<EmployeesResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.company_id) queryParams.append('company_id', params.company_id);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.employment_status) queryParams.append('employment_status', params.employment_status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const url = `/employees${queryString}`;
    
    const response = await apiCall<EmployeesResponse>(url, 'GET');
    return response;
  } catch (error: any) {
    throw new Error(`Failed to fetch employees: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch a single employee by ID
 * @param id Employee ID
 * @returns Promise with employee data
 */
export async function getEmployee(id: string): Promise<EmployeeResponse> {
  try {
    const response = await apiCall<EmployeeResponse>(`/employees/${id}`, 'GET');
    return response;
  } catch (error: any) {
    throw new Error(`Failed to fetch employee: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Create a new employee
 * @param data Employee data
 * @returns Promise with created employee
 */
export async function createEmployee(data: CreateEmployeePayload): Promise<EmployeeResponse> {
  try {
    // Validate data before sending
    if (!data.employee_number) {
      throw new Error('Employee number is required');
    }
    if (!data.first_name) {
      throw new Error('First name is required');
    }
    if (!data.last_name) {
      throw new Error('Last name is required');
    }
    if (!data.email) {
      throw new Error('Email is required');
    }
    if (!data.hire_date) {
      throw new Error('Hire date is required');
    }
    if (!data.employment_type) {
      throw new Error('Employment type is required');
    }
    if (!data.payment_frequency) {
      throw new Error('Payment frequency is required');
    }
    if (data.basic_salary === undefined || data.basic_salary === null) {
      throw new Error('Basic salary is required');
    }
    if (!data.department) {
      throw new Error('Department is required');
    }
    if (!data.position) {
      throw new Error('Position is required');
    }
    if (!data.statutory_details?.kra_pin) {
      throw new Error('KRA PIN is required');
    }
    if (!data.statutory_details?.nssf_number) {
      throw new Error('NSSF number is required');
    }
    if (!data.statutory_details?.shif_number) {
      throw new Error('SHIF number is required');
    }
    
    const response = await apiCall<EmployeeResponse>('/employees', 'POST', data);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to create employee: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update an existing employee
 * @param id Employee ID
 * @param data Updated employee data
 * @returns Promise with updated employee
 */
export async function updateEmployee(id: string, data: Partial<CreateEmployeePayload>): Promise<EmployeeResponse> {
  try {
    const response = await apiCall<EmployeeResponse>(`/employees/${id}`, 'PUT', data);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to update employee: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete an employee
 * @param id Employee ID
 * @returns Promise with deletion confirmation
 */
export async function deleteEmployee(id: string): Promise<{ status: string; message: string }> {
  try {
    const response = await apiCall<{ status: string; message: string }>(`/employees/${id}`, 'DELETE');
    return response;
  } catch (error: any) {
    throw error; // The apiCall function already formats the error message properly
  }
}





/**
 * Fetch employee statistics
 * @returns Promise with employee statistics
 */
export async function getEmployeeStatistics(): Promise<EmployeeStatisticsResponse> {
  try {
    const response = await apiCall<EmployeeStatisticsResponse>('/employees/statistics', 'GET');
    return response;
  } catch (error: any) {
    throw new Error(`Failed to fetch employee statistics: ${error.message || 'Unknown error'}`);
  }
}

// Export all functions as a single object for easier imports
export const employeesApi = {
  // Employee Management
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  
  // Employee Statistics
  getEmployeeStatistics,
};