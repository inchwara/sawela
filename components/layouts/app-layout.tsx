import type React from "react"
import { Sidebar } from "@/components/sidebar/sidebar"
import { TopNav } from "@/components/navigation/top-nav"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-2 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
