"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context" // Adjust path if needed
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react" // For a loading spinner
import { getToken, isTokenExpired } from "@/lib/token-manager"

interface AuthGuardProps {
  children: React.ReactNode
}

const PUBLIC_PATHS = ['/', '/landing', '/sign-in', '/sign-up', '/forgot-password', '/set-password']; // Add any other public paths
const AUTH_ONLY_PATHS = ['/sign-in', '/sign-up', '/forgot-password', '/set-password']; // Paths only for non-authenticated users

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Quick initial check to prevent flash
    const token = getToken()
    const hasValidToken = token && !isTokenExpired()
    
    const isPublicPath = PUBLIC_PATHS.some(path => 
      pathname === path || pathname.startsWith(`${path}/`)
    );

    const isAuthOnlyPath = AUTH_ONLY_PATHS.some(path => 
      pathname === path || pathname.startsWith(`${path}/`)
    );
    
    // If we have a valid token and we're on a public path, we can show content immediately
    // If we don't have a token and we're on a protected path, we'll redirect
    if (!isLoading) {
      if (!user && !hasValidToken && !isPublicPath) {
        // No user and no valid token on protected route - redirect to login
        router.push("/sign-in")
      } else if (user && isAuthOnlyPath && pathname !== '/sign-up/success') {
        // User logged in trying to access auth pages - redirect to dashboard
        router.push("/dashboard")
      } else {
        // Everything is good, show content
        setIsReady(true)
      }
    }
  }, [user, isLoading, router, pathname])

  // Show loading while checking auth state
  if (isLoading || !isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
