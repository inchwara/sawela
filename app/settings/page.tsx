"use client"
import { useState, useEffect } from "react"
import { UserProfile } from "@/app/profile/components/user-profile"
import { StoreSettings } from "@/app/settings/components/store-settings"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PermissionGuard } from "@/components/PermissionGuard"

type ActiveSection = "profile" | "stores"

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("profile")
  const { userProfile, isLoading: authLoading } = useAuth()
  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    title: "",
    location: "",
    email: "",
    phone: "",
    bio: "",
    country: "",
    cityState: "",
    postalCode: "",
    taxId: "",
    avatar: "/placeholder.svg?height=80&width=80",
  })

  function mapApiUserToUserProfileProps(apiUser: any) {
    return {
      firstName: apiUser.first_name || "",
      lastName: apiUser.last_name || "",
      title: apiUser.title || "",
      location: apiUser.location || "",
      email: apiUser.email || "",
      phone: apiUser.phone || "",
      bio: apiUser.bio || "",
      country: apiUser.country || "",
      cityState: apiUser.city_state || "",
      postalCode: apiUser.postal_code || "",
      taxId: apiUser.tax_id || "",
      avatar: apiUser.avatar_url || "/placeholder.svg?height=80&width=80",
    }
  }

  useEffect(() => {
    if (userProfile) {
      setUser(mapApiUserToUserProfileProps(userProfile))
    }
  }, [userProfile])

  const handleEditProfile = () => {
    // Implement your edit logic here
  }

  const handleEditPersonalInfo = () => {
    // Implement your edit logic here
  }

  const handleEditAddress = () => {
    // Implement your edit logic here
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <PermissionGuard permissions={["can_view_settings_menu", "can_manage_system", "can_manage_company"]}>
      <div className="w-full py-8 min-h-screen bg-gray-50">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Settings</h2>
        </div>
        <Tabs
          value={activeSection}
          onValueChange={(value) => setActiveSection(value as ActiveSection)}
          className="w-full"
        >
          <TabsList className="grid w-fit grid-cols-2 bg-gray-100 rounded-lg p-1 mb-8">
            <TabsTrigger value="profile" className="text-sm px-6">
              My Profile
            </TabsTrigger>
            <TabsTrigger value="stores" className="text-sm px-6">
              Stores
            </TabsTrigger>
          </TabsList>
          <div className="w-full">
            <TabsContent value="profile">
              <UserProfile
                user={user}
                onEditProfile={handleEditProfile}
                onEditPersonalInfo={handleEditPersonalInfo}
                onEditAddress={handleEditAddress}
              />
            </TabsContent>
            <TabsContent value="stores">
              <StoreSettings />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </PermissionGuard>
  )
}