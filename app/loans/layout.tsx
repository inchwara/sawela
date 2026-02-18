import type React from "react"
import { AppLayout } from "@/components/layouts/app-layout"

export default function LoansLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
