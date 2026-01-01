import apiCall from "./api"

export interface PurchaseOrderItem {
  received_quantity: number
  id?: string
  product_id: string
  variant_id?: string | null
  quantity: number
  unit_price: number
  store_id: string
  // Add related objects for UI
  product?: any
  variant?: any
  store?: any
}

export interface PurchaseOrder {
  created_at(created_at: any): import("react").ReactNode
  expected_delivery_date: any
  id: string
  order_number: string
  company_id: string
  supplier_id: string
  discount?: number | null
  order_date: string
  delivery_date: string
  currency_code?: string | null
  status: string
  items: PurchaseOrderItem[]
  parent_id?: string | null
  store_id: string
  comments?: string | null
  // Add related objects for UI
  supplier?: any
  store?: any
}

export interface CreatePurchaseOrderPayload {
  supplier_id: string
  order_date: string
  delivery_date: string
  store_id: string
  comments?: string
  items: Array<{
    product_id: string
    variant_id?: string | null
    quantity: number
    unit_price: number
    store_id: string
  }>
}

export interface UpdatePurchaseOrderPayload {
  supplier_id: string
  order_date: string
  delivery_date: string
  store_id: string
  status: string
  comments?: string
  items: Array<{
    product_id: string
    variant_id?: string | null
    quantity: number
    unit_price: number
    store_id: string
  }>
}

export interface ReceiptPurchaseOrderPayload {
  items: { id: string; received_quantity: number }[]
}

// List purchase orders
export async function getPurchaseOrders(params?: { status?: string; supplier_id?: string }): Promise<PurchaseOrder[]> {
  const query = params ? "?" + Object.entries(params).filter(([_, v]) => v).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`).join("&") : ""
  const response = await apiCall<{ status: string; data: PurchaseOrder[]; message?: string }>(
    `/purchase-orders${query}`,
    "GET",
    undefined,
    true
  )
  if (response.status === "success" && response.data) {
    return response.data
  } else {
    throw new Error(response.message || "Failed to fetch purchase orders")
  }
}

// Get a single purchase order
export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const response = await apiCall<{ status: string; data: PurchaseOrder; message?: string }>(
    `/purchase-orders/${id}`,
    "GET",
    undefined,
    true
  )
  if (response.status === "success" && response.data) {
    return response.data
  } else {
    throw new Error(response.message || "Failed to fetch purchase order")
  }
}

// Create a purchase order
export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
  const response = await apiCall<{ status: string; data: PurchaseOrder; message?: string }>(
    "/purchase-orders",
    "POST",
    payload,
    true
  )
  if (response.status === "success" && response.data) {
    return response.data
  } else {
    throw new Error(response.message || "Failed to create purchase order")
  }
}

// Update a purchase order
export async function updatePurchaseOrder(id: string, payload: UpdatePurchaseOrderPayload): Promise<PurchaseOrder> {
  const response = await apiCall<{ status: string; order: PurchaseOrder; message?: string }>(
    `/purchase-orders/${id}`,
    "PUT",
    payload,
    true
  )
  if (response.status === "success" && response.order) {
    return response.order
  } else {
    throw new Error(response.message || "Failed to update purchase order")
  }
}

// Delete a purchase order
export async function deletePurchaseOrder(id: string): Promise<void> {
  const response = await apiCall<{ status: string; message?: string }>(
    `/purchase-orders/${id}`,
    "DELETE",
    undefined,
    true
  )
  if (response.status !== "success") {
    throw new Error(response.message || "Failed to delete purchase order")
  }
}

// Receipt a purchase order (partial or full)
export async function receiptPurchaseOrder(id: string, payload: ReceiptPurchaseOrderPayload): Promise<{ order: PurchaseOrder; new_purchase_order?: PurchaseOrder }> {
  const response = await apiCall<{ status: string; purchase_order: PurchaseOrder; new_purchase_order?: PurchaseOrder; message?: string }>(
    `/purchase-orders/${id}/receipt`,
    "POST",
    payload,
    true
  )
  if (response.status === "success" && response.purchase_order) {
    return { order: response.purchase_order, new_purchase_order: response.new_purchase_order }
  } else {
    throw new Error(response.message || "Failed to receipt purchase order")
  }
}

// Return a purchase order
export async function returnPurchaseOrder(id: string, payload: { items: { id: string; returned_quantity: number }[]; reason?: string }): Promise<{ order: PurchaseOrder }> {
  const response = await apiCall<{ status: string; order: PurchaseOrder; message?: string }>(
    `/purchase-orders/${id}/return`,
    "POST",
    payload,
    true
  )
  if (response.status === "success" && response.order) {
    return { order: response.order }
  } else {
    throw new Error(response.message || "Failed to return purchase order")
  }
} 