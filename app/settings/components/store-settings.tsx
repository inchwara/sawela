"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Store, Loader2, Plus, Pencil, Trash2, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getStores, forceRefreshStores, type Store as StoreType } from "@/lib/stores"
import apiCall from "@/lib/api"

const formSchema = z.object({
  name: z.string().min(2, { message: "Store name must be at least 2 characters." }).max(255, { message: "Store name must be less than 255 characters." }),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function StoreSettings() {
  const { toast } = useToast()
  const { companyId } = useAuth()
  const [stores, setStores] = useState<StoreType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreType | null>(null)
  const [deleteConfirmStore, setDeleteConfirmStore] = useState<StoreType | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const loadStores = async () => {
    try {
      setIsLoading(true)
      const storeList = await getStores()
      setStores(storeList)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load stores",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStores()
  }, [])

  const openCreateDialog = () => {
    setEditingStore(null)
    form.reset({
      name: "",
      description: "",
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (store: StoreType) => {
    setEditingStore(store)
    form.reset({
      name: store.name || "",
      description: (store as any).description || "",
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (values: FormValues) => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID is missing.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (editingStore) {
        // Update existing store
        await apiCall(`/stores/${editingStore.id}`, "PUT", {
          name: values.name.trim(),
          description: values.description?.trim() || null,
        })

        toast({
          title: "Success",
          description: "Store updated successfully!",
        })
      } else {
        // Create new store
        await apiCall(`/stores`, "POST", {
          name: values.name.trim(),
          description: values.description?.trim() || null,
        })

        toast({
          title: "Success",
          description: "Store created successfully!",
        })
      }

      // Refresh stores list
      forceRefreshStores(companyId)
      await loadStores()
      setIsDialogOpen(false)
      form.reset()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save store.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmStore) return

    try {
      await apiCall(`/stores/${deleteConfirmStore.id}`, "DELETE")
      
      toast({
        title: "Success",
        description: "Store deleted successfully!",
      })

      // Refresh stores list
      if (companyId) {
        forceRefreshStores(companyId)
      }
      await loadStores()
      setDeleteConfirmStore(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete store.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stores</h3>
          <p className="text-sm text-muted-foreground">
            Manage your warehouse locations and stores
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Store
        </Button>
      </div>

      {stores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Stores Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first store to start managing inventory
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Store
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{store.name}</CardTitle>
                  </div>
                  <Badge variant={store.is_active ? "default" : "secondary"}>
                    {store.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {(store as any).description && (
                  <CardDescription>{(store as any).description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(store)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmStore(store)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              {editingStore ? "Edit Store" : "Create New Store"}
            </DialogTitle>
            <DialogDescription>
              {editingStore
                ? "Update your store information"
                : "Add a new store or warehouse location"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter store name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this store"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingStore ? "Update Store" : "Create Store"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmStore} onOpenChange={() => setDeleteConfirmStore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Store</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmStore?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmStore(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
