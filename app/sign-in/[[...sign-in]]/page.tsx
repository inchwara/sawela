"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Eye, EyeOff, Shield, Zap, BarChart3 } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()
  const { signIn, resetPassword } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0
    return isValid
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await signIn(formData.email, formData.password)

      if (error) {
        toast.error(error.message || "Invalid email or password")
        return
      }

      toast.success("You've been signed in successfully.")

      router.push("/dashboard")
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      toast.error("Please enter your email address first.")
      return
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Please enter a valid email address.")
      return
    }

    setIsResetting(true)

    try {
      const { error } = await resetPassword(formData.email)

      if (error) {
        toast.error(error.message || "Failed to send reset email")
        return
      }

      toast.success("Check your inbox for password reset instructions.")
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 relative overflow-hidden">
        {/* Decorative curved shape */}
        <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-r from-amber-200/50 to-orange-300/50 rounded-bl-[100px]" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/logo.png" alt="Sawela Lodge Logo" className="h-16 object-contain" />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
              Streamline your warehouse operations
            </h1>
            <p className="text-gray-600 text-lg mb-10">
              Access powerful tools for inventory management, stock tracking, order fulfillment, and comprehensive warehouse reporting.
            </p>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-700" />
                </div>
                <span className="text-gray-700">Real-time inventory tracking & alerts</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-700" />
                </div>
                <span className="text-gray-700">Fast order processing & dispatch</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-amber-700" />
                </div>
                <span className="text-gray-700">Stock analytics & demand forecasting</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <img src="/logo.png" alt="Sawela Lodge Logo" className="h-16 object-contain" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-500">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`mt-2 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-amber-600 focus:ring-amber-600 ${errors.email ? "border-red-500" : ""}`}
                placeholder="Enter your email"
                autoFocus
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-sm font-medium text-amber-700 hover:text-amber-800 disabled:opacity-50"
                >
                  {isResetting ? "Sending..." : "Forgot password?"}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={`h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-amber-600 focus:ring-amber-600 pr-12 ${errors.password ? "border-red-500" : ""}`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="border-gray-300 data-[state=checked]:bg-amber-700 data-[state=checked]:border-amber-700"
              />
              <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                Remember me for 30 days
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-8">
            Need access? Contact your organization administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
