import apiCall from "./api"

// ==================== INTERFACES ====================

export interface UserData {
  id: string
  company_id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  email_verified: boolean
  last_login_at: string | null
  role_id: string | null
  created_at: string
  updated_at: string
  password_setup_token: string | null
  password_setup_token_expires_at: string | null
  company: {
    id: string
    name: string
    description: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    country: string | null
    postal_code: string | null
    website: string | null
    logo_url: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    is_first_time: boolean
    current_subscription_id: string | null
  }
  role: {
    id: string
    name: string
    description: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    company_id: string
  } | null
}

export interface Role {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  company_id: string | null
}

// ==================== USER MANAGEMENT ====================

/**
 * Fetch all users
 */
export async function fetchUsers(): Promise<UserData[]> {
  try {
    const response: any = await apiCall<any>("/users", "GET")
    return response.users || []
  } catch (error: any) {
    throw new Error(`Failed to fetch users: ${error.message || "Unknown error"}`)
  }
}

/**
 * Get all users (alias for fetchUsers)
 */
export async function getUsers(): Promise<UserData[]> {
  return fetchUsers();
}

/**
 * Create a new user
 */
export async function createUser(userData: any): Promise<UserData> {
  try {
    const response = await apiCall<UserData>(
      `/users`,
      "POST",
      userData,
      true
    )
    return response
  } catch (error: any) {
    throw new Error(`Failed to create user: ${error.message || "Unknown error"}`)
  }
}

/**
 * Update an existing user
 */
export async function updateUser(userId: string, userData: any): Promise<UserData> {
  try {
    const response = await apiCall<UserData>(
      `/users/${userId}`,
      "PUT",
      userData,
      true
    )
    return response
  } catch (error: any) {
    throw new Error(`Failed to update user: ${error.message || "Unknown error"}`)
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    await apiCall<void>(
      `/users/${userId}`,
      "DELETE",
      undefined,
      true
    )
  } catch (error: any) {
    throw new Error(`Failed to delete user: ${error.message || "Unknown error"}`)
  }
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(userId: string, roleId: string): Promise<UserData> {
  try {
    const response = await apiCall<UserData>(
      `/users/${userId}/assign-role`,
      "POST",
      { role_id: roleId },
      true
    )
    return response
  } catch (error: any) {
    throw new Error(`Failed to assign role to user: ${error.message || "Unknown error"}`)
  }
}