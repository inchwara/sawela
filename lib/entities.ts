import apiCall from "./api"

export interface Entity {
  id: string
  name: string
  company_id: string
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EntityResponse {
  status: string
  entities: Entity[]
  message?: string
}

/**
 * Fetches all entities for the current user's company
 */
export async function getEntities(): Promise<Entity[]> {
  try {
    const response = await apiCall<EntityResponse>("/entities", "GET", undefined, true)

    if (response.status === "success" && response.entities) {
      return response.entities
    } else {
      const errorMessage = typeof response.message === "string" ? response.message : "Failed to fetch entities"
      throw new Error(errorMessage)
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch entities: ${error.message || "Unknown error"}`)
  }
}
