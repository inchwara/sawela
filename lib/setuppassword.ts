import apiCall from "@/lib/api"

interface SetPasswordPayload {
  token: string
  password: string
  password_confirmation: string
}

interface SetPasswordResponse {
  status: "success" | "failed"
  message: string
  data?: {
    user?: any
    token?: string
  }
}

export async function setPassword(userId: string, data: SetPasswordPayload): Promise<SetPasswordResponse> {
  try {
    const response = await apiCall<SetPasswordResponse>(
      `/users/${userId}/set-password`, 
      "POST", 
      data, 
      false // No auth required for setting password
    )
    return response
  } catch (error: any) {
    throw new Error(error.message || "Failed to set password. Please try again.")
  }
}