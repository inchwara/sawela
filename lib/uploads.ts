import apiCall from "./api"

export interface UploadedImage {
  url: string
  path: string
}

interface UploadResponse {
  status: "success" | "failed"
  message: string
  data: UploadedImage[]
  errors: { file: string; error: string }[]
}

/**
 * Upload image files to R2 storage via the API.
 * Returns an array of uploaded image URLs and paths.
 */
export async function uploadImages(
  files: File[],
  folder = "products"
): Promise<{ urls: UploadedImage[]; errors: { file: string; error: string }[] }> {
  const formData = new FormData()
  formData.append("folder", folder)

  for (const file of files) {
    formData.append("images[]", file)
  }

  const response = await apiCall<UploadResponse>(
    "/upload/images",
    "POST",
    formData,
    true
  )

  return {
    urls: response.data || [],
    errors: response.errors || [],
  }
}
