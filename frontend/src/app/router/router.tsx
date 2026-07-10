import { createBrowserRouter, Navigate } from 'react-router'
import { AuthLayout } from '@/shared/components/layout/AuthLayout'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { ProtectedRoute } from '@/shared/components/layout/ProtectedRoute'
import { GuestRoute } from '@/shared/components/layout/GuestRoute'
import { CompleteCoupleRoute } from '@/shared/components/layout/CompleteCoupleRoute'

// Auth pages
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/modules/auth/pages/ResetPasswordPage'
import { AcceptInvitationPage } from '@/modules/auth/pages/AcceptInvitationPage'
import { InvitePage } from '@/modules/auth/pages/InvitePage'
import { WaitingPage } from '@/modules/auth/pages/WaitingPage'

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

/**
 * Registration is reachable only when this is on.
 *
 * A couple that registers today cannot complete itself: the invite and invitation-acceptance
 * screens have no approved design yet (spec assumption A6), so every new couple would be stranded
 * at the waiting threshold. Enable this when those screens ship.
 */
const REGISTRATION_ENABLED = import.meta.env.VITE_REGISTRATION_ENABLED === 'true'

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
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'invite/accept', element: <AcceptInvitationPage /> },
    ],
  },
  {
    // Same guest shell, but a successful registration continues to the invite screen rather than the
    // threshold. Registration flips the auth state and navigates imperatively; if this guard
    // disagreed about the destination, whichever redirect landed last would win.
    element: (
      <GuestRoute awaitingRedirect="/invite">
        <AuthLayout />
      </GuestRoute>
    ),
    children: [
      {
        path: 'register',
        element: REGISTRATION_ENABLED ? <RegisterPage /> : <Navigate to="/login" replace />,
      },
    ],
  },
  {
    // Authenticated, but the home may not be open yet. These screens live outside CompleteCoupleRoute.
    element: (
      <ProtectedRoute>
        <AuthLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'waiting', element: <WaitingPage /> },
      { path: 'invite', element: <InvitePage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <CompleteCoupleRoute>
          <AppLayout />
        </CompleteCoupleRoute>
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
