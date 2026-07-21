import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { DocumentTitle } from './DocumentTitle'
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

/**
 * Pathless root that wraps every route, so the document title and the route announcement have a
 * single place to live rather than being repeated in each layout (the 404 route has no layout).
 */
const routes = [
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
      { path: 'login', element: <LoginPage />, handle: { title: 'Sign in' } },
      { path: 'forgot-password', element: <ForgotPasswordPage />, handle: { title: 'Forgot password' } },
      { path: 'reset-password', element: <ResetPasswordPage />, handle: { title: 'Reset password' } },
      { path: 'invite/accept', element: <AcceptInvitationPage />, handle: { title: 'Accept invitation' } },
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
        handle: { title: 'Create our home' },
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
      { path: 'waiting', element: <WaitingPage />, handle: { title: 'Waiting for your partner' } },
      { path: 'invite', element: <InvitePage />, handle: { title: 'Invite your partner' } },
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
      { path: 'dashboard', element: <DashboardPage />, handle: { title: 'Home' } },
      { path: 'finance', element: <FinancePage />, handle: { title: 'Finance' } },
      { path: 'memories', element: <MemoriesPage />, handle: { title: 'Memories' } },
      { path: 'goals', element: <GoalsPage />, handle: { title: 'Goals' } },
      { path: 'messages', element: <MessagesPage />, handle: { title: 'Messages' } },
      { path: 'messages/:conversationId', element: <MessagesPage />, handle: { title: 'Messages' } },
      { path: 'connect', element: <ConnectPage />, handle: { title: 'Connect' } },
      { path: 'calendar', element: <CalendarPage />, handle: { title: 'Calendar' } },
      { path: 'settings', element: <SettingsPage />, handle: { title: 'Settings' } },
      { path: 'profile', element: <ProfilePage />, handle: { title: 'Profile' } },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
    handle: { title: 'Page not found' },
  },
]

export const router = createBrowserRouter([
  {
    element: (
      <>
        <DocumentTitle />
        <Outlet />
      </>
    ),
    children: routes,
  },
])
