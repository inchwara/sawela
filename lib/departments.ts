import apiCall from "./api"

export interface Department {
  id: string
  name: string
  company_id: string
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DepartmentResponse {
  status: string
  departments: Department[]
  message?: string
}

/**
 * Fetches all departments for the current user's company
 */
export async function getDepartments(): Promise<Department[]> {
  try {
    const response = await apiCall<DepartmentResponse>("/departments", "GET", undefined, true)

    if (response.status === "success" && response.departments) {
      return response.departments
    } else {
      const errorMessage = typeof response.message === "string" ? response.message : "Failed to fetch departments"
      throw new Error(errorMessage)
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch departments: ${error.message || "Unknown error"}`)
  }
}
