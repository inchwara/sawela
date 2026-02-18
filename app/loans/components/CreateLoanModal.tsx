"use client";

import { useState, useEffect } from "react";
import { createDispatch } from "@/lib/dispatch";
import { getStores } from "@/lib/stores";
import { getProducts } from "@/lib/products";
import { fetchUsers, type UserData } from "@/lib/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { HandCoins, Building2, Plus, Minus, Loader2, Search, X, Calendar } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn, toSentenceCase } from "@/lib/utils";

interface CreateLoanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Store { id: string; name: string; description?: string }

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  stock_quantity: number;
  on_hand?: number;
  has_variations: boolean;
  variants?: Array<{ id: string; name: string; sku: string; stock_quantity: number; on_hand?: number }>;
  unit_of_measurement: string;
}

interface LoanItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
  return_date: string;
  notes?: string;
  product?: Product;
  variant?: Product["variants"] extends Array<infer V> ? V : never;
}

interface FormData {
  from_store_id: string;
  to_entity: string;
  to_user_id: string;
  notes: string;
  items: LoanItem[];
}

const DEFAULT_RETURN_DAYS = 7;

export function CreateLoanModal({ open, onOpenChange, onSuccess }: CreateLoanModalProps) {
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  ;

  const defaultReturnDate = format(addDays(new Date(), DEFAULT_RETURN_DAYS), "yyyy-MM-dd");

  const [formData, setFormData] = useState<FormData>({
    from_store_id: "",
    to_entity: "",
    to_user_id: "",
    notes: "",
    items: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) loadInitialData();
    else resetForm();
  }, [open]);

  const resetForm = () => {
    setFormData({ from_store_id: "", to_entity: "", to_user_id: "", notes: "", items: [] });
    setErrors({});
    setSearchQuery("");
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [storesData, usersData, productsResponse] = await Promise.all([
        getStores(),
        fetchUsers(),
        getProducts(1, 10000),
      ]);
      setStores(storesData);
      setUsers(usersData);
      setProducts((productsResponse.data || []) as unknown as Product[]);
    } catch {
      toast.error("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.from_store_id) newErrors.from_store_id = "Store is required";
    if (!formData.to_entity)     newErrors.to_entity     = "Entity is required";
    if (!formData.to_user_id)    newErrors.to_user_id    = "Borrower is required";
    if (formData.items.length === 0) newErrors.items = "At least one item is required";

    formData.items.forEach((item, i) => {
      if (item.quantity <= 0) newErrors[`item_${i}_qty`] = "Quantity must be greater than 0";
      if (!item.return_date)  newErrors[`item_${i}_date`] = "Return date is required";

      const product = products.find(p => p.id === item.product_id);
      if (product) {
        const available = item.variant_id
          ? (product.variants?.find(v => v.id === item.variant_id)?.on_hand ?? product.variants?.find(v => v.id === item.variant_id)?.stock_quantity ?? 0)
          : (product.on_hand ?? product.stock_quantity);
        if (item.quantity > available) newErrors[`item_${i}_stock`] = `Only ${available} units available`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await createDispatch({
        from_store_id: formData.from_store_id,
        to_entity: formData.to_entity,
        to_user_id: formData.to_user_id,
        type: "internal",
        notes: formData.notes || undefined,
        return_date: formData.items[0]?.return_date,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id || undefined,
          quantity: item.quantity,
          is_returnable: true,
          return_date: item.return_date,
          notes: item.notes || undefined,
        })),
      });
      toast.success("The loan has been created successfully.");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const availableFor = (product: Product, variantId?: string) => {
    if (variantId) {
      const v = product.variants?.find(v => v.id === variantId);
      return v ? (v.on_hand ?? v.stock_quantity) : 0;
    }
    return product.on_hand ?? product.stock_quantity;
  };

  const addItem = (product: Product, variant?: Product["variants"] extends Array<infer V> ? V : never) => {
    const avail = availableFor(product, variant?.id);
    if (avail <= 0) {
      toast.error(`${product.name}${variant ? `);
      return;
    }

    const existingIdx = formData.items.findIndex(i =>
      i.product_id === product.id && i.variant_id === (variant?.id || undefined)
    );

    if (existingIdx !== -1) {
      const newQty = formData.items[existingIdx].quantity + 1;
      if (newQty > avail) {
        toast.error(`Only ${avail} units available.`);
        return;
      }
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, idx) => idx === existingIdx ? { ...item, quantity: newQty } : item),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          product_id: product.id,
          variant_id: variant?.id,
          quantity: 1,
          return_date: defaultReturnDate,
          notes: "",
          product,
          variant,
        } as LoanItem],
      }));
    }
  };

  const updateItem = (index: number, updates: Partial<LoanItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, ...updates } : item),
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-4xl sm:max-w-4xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#E30040]/10 rounded-lg">
              <HandCoins className="h-5 w-5 text-[#E30040]" />
            </div>
            <div>
              <SheetTitle className="text-xl font-semibold text-gray-900">Issue Loan</SheetTitle>
              <SheetDescription className="text-sm text-gray-500">
                Issue items on loan — all items must be returned
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Loan Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Loan Details</span>
              </CardTitle>
              <CardDescription>Who is borrowing, from which store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From Store */}
                <div className="space-y-2">
                  <Label>From Store *</Label>
                  <Select
                    value={formData.from_store_id}
                    onValueChange={v => setFormData(prev => ({ ...prev, from_store_id: v }))}
                  >
                    <SelectTrigger className={errors.from_store_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.from_store_id && <p className="text-sm text-red-600">{errors.from_store_id}</p>}
                </div>

                {/* To Entity */}
                <div className="space-y-2">
                  <Label>Entity / Department *</Label>
                  <Select
                    value={formData.to_entity}
                    onValueChange={v => setFormData(prev => ({ ...prev, to_entity: v }))}
                  >
                    <SelectTrigger className={errors.to_entity ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select entity">
                        {formData.to_entity ? toSentenceCase(formData.to_entity) : "Select entity"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="sales">Sales Department</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="external_company">External Company</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.to_entity && <p className="text-sm text-red-600">{errors.to_entity}</p>}
                </div>
              </div>

              {/* Borrower */}
              <div className="space-y-2">
                <Label>Borrower *</Label>
                <Select
                  value={formData.to_user_id}
                  onValueChange={v => setFormData(prev => ({ ...prev, to_user_id: v }))}
                >
                  <SelectTrigger className={errors.to_user_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Who is taking the items?" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.to_user_id && <p className="text-sm text-red-600">{errors.to_user_id}</p>}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Reason for loan, special instructions..."
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Items</CardTitle>
              <CardDescription>Search and add items to be loaned out</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searchQuery && (
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No products found</div>
                  ) : (
                    <div className="divide-y">
                      {filteredProducts.map(product => {
                        const avail = availableFor(product);
                        return (
                          <div key={product.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{product.name}</h4>
                                <p className="text-sm text-gray-500">
                                  SKU: {product.sku || "N/A"} • Available: {avail} {product.unit_of_measurement}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {avail <= 0 && (
                                  <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                                )}
                                {product.has_variations && product.variants ? (
                                  <Select onValueChange={variantId => {
                                    const v = product.variants?.find(v => v.id === variantId);
                                    if (v) addItem(product, v as any);
                                  }}>
                                    <SelectTrigger className="w-40">
                                      <SelectValue placeholder="Select variant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {product.variants.map(v => (
                                        <SelectItem key={v.id} value={v.id} disabled={(v.on_hand ?? v.stock_quantity) <= 0}>
                                          {v.name} — {v.on_hand ?? v.stock_quantity} avail.
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => addItem(product)}
                                    disabled={avail <= 0}
                                    className="bg-[#E30040] hover:bg-[#E30040]/90"
                                  >
                                    <Plus className="h-4 w-4 mr-1" /> Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Items to Loan ({formData.items.length})
              </CardTitle>
              {errors.items && <p className="text-sm text-red-600">{errors.items}</p>}
            </CardHeader>
            <CardContent>
              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <HandCoins className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No items added yet</p>
                  <p className="text-sm">Search and add products above</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => {
                    const product = item.product;
                    const variant = item.variant as any;
                    const avail = product ? availableFor(product, variant?.id) : 0;

                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-medium">{product?.name || "Unknown"}</h4>
                            {variant && <p className="text-sm text-gray-600">Variant: {variant.name}</p>}
                            <p className="text-xs text-gray-500">
                              Available: {avail} {product?.unit_of_measurement}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-700">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Quantity */}
                          <div className="space-y-2">
                            <Label>Quantity *</Label>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })} disabled={item.quantity <= 1}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                max={avail}
                                value={item.quantity}
                                onChange={e => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                                className={cn("text-center w-20", (errors[`item_${index}_qty`] || errors[`item_${index}_stock`]) && "border-red-500")}
                              />
                              <Button variant="outline" size="sm" onClick={() => updateItem(index, { quantity: Math.min(avail, item.quantity + 1) })} disabled={item.quantity >= avail}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            {(errors[`item_${index}_qty`] || errors[`item_${index}_stock`]) && (
                              <p className="text-xs text-red-600">{errors[`item_${index}_qty`] || errors[`item_${index}_stock`]}</p>
                            )}
                          </div>

                          {/* Return Date — mandatory for loans */}
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Return Date *
                            </Label>
                            <Input
                              type="date"
                              value={item.return_date}
                              min={format(new Date(), "yyyy-MM-dd")}
                              onChange={e => updateItem(index, { return_date: e.target.value })}
                              className={cn("text-sm", errors[`item_${index}_date`] && "border-red-500")}
                            />
                            {errors[`item_${index}_date`] && (
                              <p className="text-xs text-red-600">{errors[`item_${index}_date`]}</p>
                            )}
                          </div>

                          {/* Notes */}
                          <div className="space-y-2">
                            <Label>Item Notes</Label>
                            <Input
                              placeholder="Optional notes..."
                              value={item.notes}
                              onChange={e => updateItem(index, { notes: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <SheetFooter className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || formData.items.length === 0}
            className="bg-[#E30040] hover:bg-[#E30040]/90"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <HandCoins className="h-4 w-4 mr-2" />}
            Issue Loan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
