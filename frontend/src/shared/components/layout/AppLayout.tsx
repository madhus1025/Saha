import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuthStore } from '@/shared/stores/auth.store'
import { PartnerViewBanner } from './PartnerViewBanner'
import { useState } from 'react'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-sandstone-50 dark:bg-sandstone-950 flex">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <PartnerViewBanner />

        <main className="flex-1 p-6 lg:p-8 overflow-auto scrollbar-warm">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
