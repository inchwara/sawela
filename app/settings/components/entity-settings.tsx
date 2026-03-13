"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Pencil, Trash2, Landmark } from "lucide-react"

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
import { toast } from "sonner"
import { getEntities, type Entity } from "@/lib/entities"
import apiCall from "@/lib/api"

const formSchema = z.object({
  name: z.string().min(2, { message: "Entity name must be at least 2 characters." }).max(255, { message: "Entity name must be less than 255 characters." }),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function EntitySettings() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [deleteConfirmEntity, setDeleteConfirmEntity] = useState<Entity | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const loadEntities = async () => {
    try {
      setIsLoading(true)
      const list = await getEntities()
      setEntities(list)
    } catch (error: any) {
      toast.error(error.message || "Failed to load entities")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEntities()
  }, [])

  const openCreateDialog = () => {
    setEditingEntity(null)
    form.reset({ name: "", description: "" })
    setIsDialogOpen(true)
  }

  const openEditDialog = (entity: Entity) => {
    setEditingEntity(entity)
    form.reset({ name: entity.name || "", description: entity.description || "" })
    setIsDialogOpen(true)
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      if (editingEntity) {
        await apiCall(`/entities/${editingEntity.id}`, "PUT", {
          name: values.name.trim(),
          description: values.description?.trim() || null,
        })
        toast.success("Entity updated successfully!")
      } else {
        await apiCall(`/entities`, "POST", {
          name: values.name.trim(),
          description: values.description?.trim() || null,
        })
        toast.success("Entity created successfully!")
      }
      await loadEntities()
      setIsDialogOpen(false)
      form.reset()
    } catch (error: any) {
      toast.error(error.message || "Failed to save entity.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmEntity) return
    try {
      await apiCall(`/entities/${deleteConfirmEntity.id}`, "DELETE")
      toast.success("Entity deleted successfully!")
      await loadEntities()
      setDeleteConfirmEntity(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to delete entity.")
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
          <h3 className="text-lg font-semibold">Entities</h3>
          <p className="text-sm text-muted-foreground">
            Manage entities for tracking dispatch destinations
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entity
        </Button>
      </div>

      {entities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Entities Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first entity to track where items are dispatched
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Entity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity) => (
            <Card key={entity.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{entity.name}</CardTitle>
                  </div>
                  <Badge variant={entity.is_active ? "default" : "secondary"}>
                    {entity.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {entity.description && (
                  <CardDescription>{entity.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(entity)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmEntity(entity)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              {editingEntity ? "Edit Entity" : "Create New Entity"}
            </DialogTitle>
            <DialogDescription>
              {editingEntity
                ? "Update your entity information"
                : "Add a new entity for dispatch tracking"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter entity name" {...field} />
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
                      <Textarea placeholder="Brief description of this entity" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingEntity ? "Update Entity" : "Create Entity"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmEntity} onOpenChange={() => setDeleteConfirmEntity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirmEntity?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmEntity(null)}>
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
