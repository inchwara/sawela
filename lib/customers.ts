import apiCall from "./api"

export interface CustomerNote {
  id: string
  customer_id: string
  note_content: string
  created_at: string
  updated_at: string
  // Assuming created_by is not directly in the API response for notes,
  // but might be inferred or added client-side if needed.
  // For now, it's not part of the API response for notes.
}

export interface Payment {
  id: string
  order_id: string
  amount_paid: string // API returns string for decimal
  payment_method: string
  status: string
  created_at: string
}

export interface Order {
  id: string
  customer_id: string
  order_number: string
  total_amount: string // API returns string for decimal
  status: string
  created_at: string
  updated_at: string
  payments: Payment[] // Nested payments
}

export interface CustomerActivity {
  id: string
  customer_id: string
  activity_type: string
  title: string
  description: string
  start_time: string
  end_time: string | null
  location: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  customer_id: string
  quote_number: string
  total_amount: string // API returns string for decimal
  status: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  first_name?: string // Optional, as 'name' might be composite
  last_name?: string // Optional, as 'name' might be composite
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  status: "active" | "inactive" | "pending"
  company: string | null // Assuming company name or ID
  notes: string | null // Assuming notes are a single string field for list view
  tags: string[] | string | null // Can be null or string from API
  preferred_communication_channel: string | null
  last_contact_date: string | null
  customer_type: "individual" | "company" | null
  total_spend: string // API returns string for decimal
  total_orders: number
  loyalty_points: number
  created_at: string
  updated_at: string
  company_id: string // Added company_id as per API response
  
  // New fields for company customers
  business_name?: string | null
  nature_of_business?: string | null
  pin_number?: string | null
  contact_person_name?: string | null
  contact_person_phone?: string | null
  contact_person_email?: string | null
  
  // Payment method
  payment_method?: string | null
  
  // New fields from API response
  customer_number?: string | null
  account_id?: string | null
}

// Interface for the detailed customer profile response
export interface CustomerProfileData extends Omit<Customer, 'notes'> {
  notes: CustomerNote[] | string | null // Can be array of notes, string, or null
  orders: Order[] // Array of Order
  activities: CustomerActivity[] // Array of CustomerActivity
  quotes: Quote[] // Array of Quote
  payments: Payment[] // Array of Payment - Add this line
  // The 'tags' field in the profile response could be a string, string array, or null
  tags: string[] | string | null
  avg_order_value?: number // Add this line for average order value
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    // Check if we're in a browser environment before making the API call
    if (typeof window === 'undefined') {
      return [];
    }
    
    // Add a small delay to ensure auth is loaded (helps with race conditions)
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const response = await apiCall<any>(
      "/customers",
      "GET",
      undefined,
      true, // <-- Restore to authenticated fetch
    )
    console.log("Raw API response for getCustomers:", response);
    
    // Handle the new paginated response format
    if (response.status === "success" && response.data) {
      // The customers data is now in response.data.data array (paginated structure)
      let customersData = [];
      
      // Check if it's the new paginated format or old format
      if (response.data.data && Array.isArray(response.data.data)) {
        // New paginated format
        customersData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Old format - direct array
        customersData = response.data;
      } else {
        console.error("Unexpected response format for customers:", response);
        return [];
      }
      
      const processedCustomers = customersData
        .filter((customer: any) => customer !== null) // Filter out null customers
        .map((customer: any) => {
          console.log("Processing customer:", customer);
          // Ensure we're handling the data correctly
          const processedCustomer = {
            ...customer,
            // Ensure company_id is never null to prevent property access errors
            company_id: customer.company_id || '',
            total_spend: customer.total_spend !== undefined ? String(customer.total_spend) : "0",
            total_orders: customer.total_orders !== undefined ? Number(customer.total_orders) : 0,
            loyalty_points: customer.loyalty_points !== undefined ? Number(customer.loyalty_points) : 0,
            tags: Array.isArray(customer.tags)
              ? customer.tags
              : typeof customer.tags === "string"
                ? customer.tags
                    .split(",")
                    .map((tag: string) => tag.trim())
                    .filter((tag: string) => tag !== "")
                : [],
          };
          
          console.log("Processed customer result:", processedCustomer);
          return processedCustomer;
        })
      console.log("Final processed customers array:", processedCustomers);
      return processedCustomers;
    } else {
      // Handle error responses
      const errorMessage = typeof response.message === "string" 
        ? response.message 
        : "Failed to fetch customers"
      throw new Error(errorMessage)
    }
  } catch (error: any) {
    console.error("Error in getCustomers:", error);
    // Handle specific role-related errors from the API
    if (error.message && error.message.includes("role")) {
      console.error("Role-related error:", error.message);
      return [];
    }
    
    // Handle specific company_id errors
    if (error.message && error.message.includes("company_id") && error.message.includes("null")) {
      console.error("Company ID error:", error.message);
      return [];
    }
    
    // Handle authentication errors
    if (error.message && (error.message.includes("not logged in") || error.message.includes("Unauthorized"))) {
      console.error("Authentication error:", error.message);
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in';
      }
      return [];
    }
    
    console.error("Unknown error in getCustomers:", error.message || "Unknown error");
    // Even if there's an error, return empty array to prevent app crash
    return [];
  }
}

export async function getCustomerProfile(customerId: string): Promise<CustomerProfileData | null> {
  try {
    // Add a small delay to ensure auth is loaded (helps with race conditions)
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const response = await apiCall<{
      message: any; status: string; customer: CustomerProfileData 
}>(
      `/customers/${customerId}/profile`,
      "GET",
      undefined,
      true,
    )
    if (response.status === "success" && response.customer) {
      // Ensure numeric fields are parsed and tags are an array
      return {
        ...response.customer,
        total_spend: String(response.customer.total_spend || "0"),
        total_orders: Number(response.customer.total_orders || 0),
        loyalty_points: Number(response.customer.loyalty_points || 0),
        avg_order_value: response.customer.avg_order_value !== undefined 
          ? Number(response.customer.avg_order_value) 
          : undefined,
        tags: Array.isArray(response.customer.tags)
          ? response.customer.tags
          : typeof response.customer.tags === "string"
            ? response.customer.tags
                .split(",")
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag !== "")
            : [],
      }
    } else {
      // Convert potential object error message to string
      const errorMessage = typeof response.message === "string" 
        ? response.message 
        : "Failed to fetch customer profile"
      throw new Error(errorMessage)
    }
  } catch (error: any) {
    // Handle specific role-related errors from the API
    if (error.message && error.message.includes("role")) {
      return null;
    }
    throw new Error(`Failed to fetch customer profile: ${error.message || "Unknown error"}`)
  }
}

export async function createCustomer(
  customerData: Omit<
    Customer,
    "id" | "created_at" | "updated_at" | "total_spend" | "total_orders" | "loyalty_points" | "status" | "notes" | "tags"
  > & { notes?: string | null; tags?: string[] | null },
): Promise<Customer> {
  try {
    const { ...dataToSend } = customerData;
    
    const finalPayload = {
      ...dataToSend,
      tags: customerData.tags || null,
    };
    
    const response = await apiCall<{
      message?: any
      status: string; 
      customer?: Customer;
      customers?: Customer[];
}>(
      "/customers",
      "POST",
      finalPayload,
      true,
    )
    
    // Handle both possible response formats
    if (response.status === "success") {
      let customerData: Customer | null = null;
      
      // Check if response has a single customer object
      if (response.customer) {
        customerData = response.customer;
      }
      // Check if response has customers array (actual API format)
      else if (response.customers && Array.isArray(response.customers) && response.customers.length > 0) {
        customerData = response.customers[0]; // Take the first (and likely only) customer
      }
      
      if (customerData) {
        const processedCustomer = {
          ...customerData,
          // Ensure proper data types
          total_spend: String(customerData.total_spend || "0"),
          total_orders: Number(customerData.total_orders || 0),
          loyalty_points: Number(customerData.loyalty_points || 0),
          tags: Array.isArray(customerData.tags)
            ? customerData.tags
            : typeof customerData.tags === "string"
              ? customerData.tags
                  .split(",")
                  .map((tag: string) => tag.trim())
                  .filter((tag: string) => tag !== "")
              : [],
        };
        
        return processedCustomer;
      } else {
        throw new Error("No customer data returned from API")
      }
    } else {
      throw new Error(typeof response.message === "string" ? response.message : "Failed to create customer.")
    }
  } catch (error: any) {
    // Handle specific role-related errors from the API
    if (error.message && error.message.includes("role")) {
      // Role-related error
    }
    throw new Error(`Failed to create customer: ${error.message || "Unknown error"}`)
  }
}

export async function updateCustomer(
  id: string,
  updates: Partial<Omit<Customer, "id" | "created_at" | "updated_at">>,
): Promise<Customer | null> {
  try {
    const response = await apiCall<{
      message: string | undefined; customer: Customer; status: string;
}>(`/customers/${id}`, "PUT", updates, true)
    if (response.status === "success" && response.customer) {
      return {
        ...response.customer,
        total_spend: String(response.customer.total_spend || "0"),
        total_orders: Number(response.customer.total_orders || 0),
        loyalty_points: Number(response.customer.loyalty_points || 0),
        tags: Array.isArray(response.customer.tags)
          ? response.customer.tags
          : typeof response.customer.tags === "string"
            ? response.customer.tags
                .split(",")
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag !== "")
            : [],
      }
    } else {
      throw new Error(typeof response.message === "string" ? response.message : "Failed to update customer.")
    }
  } catch (error: any) {
    // Handle specific role-related errors from the API
    if (error.message && error.message.includes("role")) {
      return null;
    }
    throw new Error(`Failed to update customer: ${error.message || "Unknown error"}`)
  }
}

export async function deleteCustomer(id: string): Promise<boolean> {
  try {
    const response = await apiCall<{
      status: string; message: string 
}>(`/customers/${id}`, "DELETE", undefined, true)
    if (response.status === "success") {
      return true
    } else {
      throw new Error(typeof response.message === "string" ? response.message : "Failed to delete customer.")
    }
  } catch (error: any) {
    // Handle specific role-related errors from the API
    if (error.message && error.message.includes("role")) {
      return false;
    }
    throw new Error(`Failed to delete customer: ${error.message || "Unknown error"}`)
  }
}
