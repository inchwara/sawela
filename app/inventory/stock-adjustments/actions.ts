"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getApiUrl } from "@/lib/config"
import type { CreateStockAdjustmentData, UpdateStockAdjustmentData } from "@/lib/stock-adjustments"

// Helper function to get token from cookies for server actions
async function getTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value || null
    return token
  } catch (error) {
    return null
  }
}

// Server-side API call function that uses cookies for authentication
async function serverApiCall<T>(
  path: string,
  method: string,
  body?: object
): Promise<T> {
  const token = await getTokenFromCookies()

  if (!token) {
    throw new Error("Authentication required, but no token found")
  }

  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const config: RequestInit = {
    method,
    headers,
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const BASE_URL = getApiUrl()

  try {
    const response = await fetch(`${BASE_URL}${path}`, config)
    const contentType = response.headers.get("content-type") || ""
    
    if (!contentType.includes("application/json")) {
      const text = await response.text()
      throw new Error(
        `Server returned a non-JSON response. This may indicate a server error, a misconfigured endpoint, or a session timeout.\n\nResponse snippet: ${text.slice(0, 200)}`
      )
    }
    
    const data = await response.json()

    if (!response.ok || (data && data.status === "failed")) {
      const errorMessage =
        typeof data.message === "string"
          ? data.message
          : Object.values(data.message || {})
              .flat()
              .join(", ") || "An unknown API error occurred."

      throw new Error(`API Error: ${errorMessage}`)
    }

    return data as T
  } catch (error: any) {
    throw new Error(`Network or API call failed: ${error.message}`)
  }
}

/**
 * Create a stock adjustment using server action
 */
export async function createStockAdjustmentAction(data: CreateStockAdjustmentData) {
  try {
    const response: any = await serverApiCall("/stock-adjustments", "POST", data)

    revalidatePath("/inventory/stock-adjustments")

    return {
      success: true,
      data: response.data,
      message: "Stock adjustment created successfully.",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to create stock adjustment.",
    }
  }
}

/**
 * Update a stock adjustment using server action
 */
export async function updateStockAdjustmentAction(
  id: string,
  data: UpdateStockAdjustmentData
) {
  try {
    const response: any = await serverApiCall(`/stock-adjustments/${id}`, "PATCH", data)

    revalidatePath("/inventory/stock-adjustments")
    revalidatePath(`/inventory/stock-adjustments/${id}`)

    return {
      success: true,
      data: response.data,
      message: "Stock adjustment updated successfully.",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to update stock adjustment.",
    }
  }
}

/**
 * Delete a stock adjustment using server action
 */
export async function deleteStockAdjustmentAction(id: string) {
  try {
    await serverApiCall(`/stock-adjustments/${id}`, "DELETE")

    revalidatePath("/inventory/stock-adjustments")

    return {
      success: true,
      message: "Stock adjustment deleted successfully.",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to delete stock adjustment.",
    }
  }
}

/**
 * Approve a stock adjustment using server action
 */
export async function approveStockAdjustmentAction(id: string) {
  try {
    const response: any = await serverApiCall(`/stock-adjustments/${id}/approve`, "POST", {})

    revalidatePath("/inventory/stock-adjustments")
    revalidatePath(`/inventory/stock-adjustments/${id}`)

    return {
      success: true,
      data: response.data,
      message: "Stock adjustment approved successfully.",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to approve stock adjustment.",
    }
  }
}

/**
 * Submit a stock adjustment for approval using server action
 */
export async function submitStockAdjustmentAction(id: string) {
  try {
    const response: any = await serverApiCall(`/stock-adjustments/${id}`, "PATCH", {
      status: "pending"
    })

    revalidatePath("/inventory/stock-adjustments")
    revalidatePath(`/inventory/stock-adjustments/${id}`)

    return {
      success: true,
      data: response.data,
      message: "Stock adjustment submitted for approval successfully.",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to submit stock adjustment.",
    }
  }
}

/**
 * Reject a stock adjustment using server action
 */
export async function rejectStockAdjustmentAction(id: string, rejectionReason: string) {
  try {
    const response: any = await serverApiCall(`/stock-adjustments/${id}/reject`, "POST", {
      rejection_reason: rejectionReason,
    })

    revalidatePath("/inventory/stock-adjustments")
    revalidatePath(`/inventory/stock-adjustments/${id}`)

    return {
      success: true,
      data: response.data,
      message: "Stock adjustment rejected successfully.",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to reject stock adjustment.",
    }
  }
}

/**
 * Apply a stock adjustment to inventory using server action
 */
export async function applyStockAdjustmentAction(id: string) {
  try {
    const response: any = await serverApiCall(`/stock-adjustments/${id}/apply`, "POST", {})

    revalidatePath("/inventory/stock-adjustments")
    revalidatePath(`/inventory/stock-adjustments/${id}`)
    revalidatePath("/inventory/products")

    return {
      success: true,
      data: response.data,
      message: "Stock adjustment applied successfully. Inventory has been updated.",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to apply stock adjustment.",
    }
  }
}
