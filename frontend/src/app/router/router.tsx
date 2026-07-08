import { createBrowserRouter, Navigate } from 'react-router'
import { AuthLayout } from '@/shared/components/layout/AuthLayout'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { ProtectedRoute } from '@/shared/components/layout/ProtectedRoute'
import { GuestRoute } from '@/shared/components/layout/GuestRoute'

// Auth pages
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/modules/auth/pages/ResetPasswordPage'

// App pages
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'
import { FinancePage } from '@/modules/finance/pages/FinancePage'
import { MemoriesPage } from '@/modules/memories/pages/MemoriesPage'
import { GoalsPage } from '@/modules/goals/pages/GoalsPage'
import { MessagesPage } from '@/modules/messages/pages/MessagesPage'
import { ConnectPage } from '@/modules/connect/pages/ConnectPage'
import { CalendarPage } from '@/modules/calendar/pages/CalendarPage'
import { SettingsPage } from '@/modules/settings/pages/SettingsPage'
import { ProfilePage } from '@/modules/profile/pages/ProfilePage'
import { NotFoundPage } from '@/shared/components/feedback/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: (
      <GuestRoute>
        <AuthLayout />
      </GuestRoute>
    ),
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'finance', element: <FinancePage /> },
      { path: 'memories', element: <MemoriesPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'messages/:conversationId', element: <MessagesPage /> },
      { path: 'connect', element: <ConnectPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
