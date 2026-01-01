import apiCall from "./api"

export interface Document {
  id: string
  document_name: string
  document_number: string
  reference_number?: string | null
  expiry_date?: string | null
  regulatory_body?: string | null
  document_image?: string | null
  documentable_type: string
  documentable_id: string
  company_id: string
  created_by: string
  other_information?: string | null
  created_at: string
  updated_at: string
}

// Define a separate interface for document upload data
export interface DocumentUploadData {
  document_name: string
  reference_number?: string
  expiry_date?: string
  regulatory_body?: string
  documentable_type: string
  documentable_id: string
  other_information?: string
  document_image: File
  company_id: string
}

export async function uploadDocument(
  documentData: DocumentUploadData
): Promise<Document> {
  try {
    // For file uploads, we need to use FormData
    const formData = new FormData()
    formData.append("document_name", documentData.document_name)
    if (documentData.reference_number) formData.append("reference_number", documentData.reference_number)
    if (documentData.expiry_date) formData.append("expiry_date", documentData.expiry_date)
    if (documentData.regulatory_body) formData.append("regulatory_body", documentData.regulatory_body)
    formData.append("documentable_type", documentData.documentable_type)
    formData.append("documentable_id", documentData.documentable_id)
    if (documentData.other_information) formData.append("other_information", documentData.other_information)
    formData.append("document_image", documentData.document_image)
    
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || "Failed to upload document")
    }
    
    const result = await response.json()
    
    if (result.status === "success" && result.data) {
      return result.data
    } else {
      throw new Error(typeof result.message === "string" ? result.message : "Failed to upload document.")
    }
  } catch (error: any) {
    throw new Error(`Failed to upload document: ${error.message || "Unknown error"}`)
  }
}

export async function getDocuments(documentableType: string, documentableId: string): Promise<Document[]> {
  try {
    const response = await apiCall<{
      message: any
      status: string
      data: Document[]
    }>(`/documents?documentable_type=${documentableType}&documentable_id=${documentableId}`, "GET", undefined, true)
    
    if (response.status === "success" && response.data) {
      return response.data
    } else {
      throw new Error(typeof response.message === "string" ? response.message : "Failed to fetch documents.")
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch documents: ${error.message || "Unknown error"}`)
  }
}

export async function getDocument(id: string): Promise<Document | null> {
  try {
    const response = await apiCall<{
      message: any
      status: string
      data: Document
    }>(`/documents/${id}`, "GET", undefined, true)
    
    if (response.status === "success" && response.data) {
      return response.data
    } else {
      throw new Error(typeof response.message === "string" ? response.message : "Failed to fetch document.")
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch document: ${error.message || "Unknown error"}`)
  }
}