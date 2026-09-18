import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Wallet, ImageIcon, Target, MessageCircle, Users, Calendar, Heart } from 'lucide-react'
import { Link } from 'react-router'
import { format } from 'date-fns'
import { Card } from '@/shared/components/ui/Card'
import { CoupleAvatar } from '@/shared/components/ui/CoupleAvatar'
import { useAuthStore } from '@/shared/stores/auth.store'
import { profileApi } from '@/core/api/profile.api'
import { queryKeys } from '@/core/constants/query-keys'
import { cn } from '@/core/utils/cn'

const moduleCards = [
  {
    href: '/finance',
    icon: Wallet,
    title: 'Finance',
    description: 'Track shared expenses and budgets',
    color:
      'bg-forest-50 border-forest-100 text-forest-700 dark:bg-forest-900/20 dark:border-forest-800 dark:text-forest-300',
    iconColor: 'text-forest-500 dark:text-forest-300',
  },
  {
    href: '/memories',
    icon: ImageIcon,
    title: 'Memories',
    description: 'Preserve your most cherished moments',
    color:
      'bg-sage-50 border-sage-100 text-sage-700 dark:bg-sage-900/20 dark:border-sage-800 dark:text-sage-300',
    iconColor: 'text-sage-500 dark:text-sage-300',
  },
  {
    href: '/goals',
    icon: Target,
    title: 'Goals',
    description: 'Dream and achieve together',
    color:
      'bg-forest-50 border-forest-100 text-forest-700 dark:bg-forest-900/20 dark:border-forest-800 dark:text-forest-300',
    iconColor: 'text-forest-600 dark:text-forest-300',
  },
  {
    href: '/messages',
    icon: MessageCircle,
    title: 'Messages',
    description: 'Private messages between you two',
    color:
      'bg-sage-50 border-sage-100 text-sage-700 dark:bg-sage-900/20 dark:border-sage-800 dark:text-sage-300',
    iconColor: 'text-sage-500 dark:text-sage-300',
  },
  {
    href: '/connect',
    icon: Users,
    title: 'Connect',
    description: 'Discover and connect with other couples',
    color:
      'bg-sage-50 border-sage-100 text-sage-700 dark:bg-sage-900/20 dark:border-sage-800 dark:text-sage-300',
    iconColor: 'text-sage-600 dark:text-sage-300',
  },
  {
    href: '/calendar',
    icon: Calendar,
    title: 'Calendar',
    description: 'Shared events and special dates',
    color:
      'bg-forest-50 border-forest-100 text-forest-700 dark:bg-forest-900/20 dark:border-forest-800 dark:text-forest-300',
    iconColor: 'text-forest-500 dark:text-forest-300',
  },
] as const

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export function DashboardPage() {
  const { partnerName, togetherID, role } = useAuthStore()

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: profileApi.getMyProfile,
  })

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  /**
   * How to address the signed-in partner.
   *
   * `username` is a login credential, not a name — greeting someone "Good morning, sri" when they
   * are called Srikanth reads as a system talking to an account rather than a person. The profile
   * query is authoritative; `partnerName` on the auth store is the same person's name captured at
   * login (the field name is misleading — it is the *signed-in* partner, not their spouse) and
   * covers the moment before the query resolves. Username is deliberately not a fallback.
   */
  const myName = profile?.name ?? partnerName ?? ''

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-6"
      >
        <div>
          <p className="text-copy-muted text-sm font-medium">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
          <h1 className="page-header mt-1">
            {greeting()}, {myName}
          </h1>
          <p className="text-copy-muted mt-1 flex items-center gap-2">
            <span className="text-xs font-mono bg-forest-50 dark:bg-forest-900/40 px-2 py-0.5 rounded-full text-forest-600 dark:text-sage-300 tracking-wider">
              {togetherID}
            </span>
          </p>
        </div>
      </motion.div>

      {/* Couple card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="relative overflow-hidden" padding="lg">
          <div className="absolute inset-0 bg-gradient-to-br from-forest-50 via-white to-sage-50/40 dark:from-forest-900/40 dark:via-forest-950 dark:to-sage-900/10" />
          <div className="relative flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <CoupleAvatar src={profile?.profilePictureUrl} name={myName} role={role} size="xl" />
              <div className="text-center">
                <p className="text-sm font-semibold text-sandstone-900 dark:text-cream-200">
                  {myName}
                </p>
                <p className="text-xs text-forest-600 dark:text-sage-300">{role}</p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sage-400 dark:text-sage-500">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sage-200 dark:to-sage-800 w-12" />
                <Heart className="w-5 h-5 fill-current" />
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sage-200 dark:to-sage-800 w-12" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <CoupleAvatar
                src={profile?.coupleInfo.partner?.profilePictureUrl}
                name={profile?.coupleInfo.partner?.name ?? ''}
                role={profile?.coupleInfo.partner?.role}
                size="xl"
              />
              <div className="text-center">
                <p className="text-sm font-semibold text-sandstone-900 dark:text-cream-200">
                  {profile?.coupleInfo.partner?.name}
                </p>
                <p className="text-xs text-forest-600 dark:text-sage-300">
                  {profile?.coupleInfo.partner?.role}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Module grid */}
      <div>
        <h2 className="section-header mb-5">Your Modules</h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {moduleCards.map(({ href, icon: Icon, title, description, color, iconColor }) => (
            <motion.div key={href} variants={itemVariants}>
              <Link
                to={href}
                className={cn(
                  'flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-warm-md hover:-translate-y-0.5 group',
                  color,
                )}
              >
                <div
                  className={cn(
                    'p-2.5 rounded-xl bg-white/50 dark:bg-black/20 flex-shrink-0',
                    iconColor,
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sandstone-900 dark:text-sandstone-100 group-hover:text-forest-700 dark:group-hover:text-sage-300 transition-colors">
                    {title}
                  </p>
                  <p className="text-xs text-copy-muted mt-0.5 leading-relaxed">{description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
