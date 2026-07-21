import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Eye, Camera, X, Check, User, Mail, Phone, Calendar, Shield } from 'lucide-react'
import { format } from 'date-fns'
import { profileApi } from '@/core/api/profile.api'
import { queryKeys } from '@/core/constants/query-keys'
import { Card, CardHeader } from '@/shared/components/ui/Card'
import { CoupleAvatar } from '@/shared/components/ui/CoupleAvatar'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useAuthStore } from '@/shared/stores/auth.store'
import { usePartnerViewStore } from '@/shared/stores/partner-view.store'
import { toast } from '@/shared/hooks/use-toast'
import { extractApiError } from '@/core/utils/error.utils'
import { cn } from '@/core/utils/cn'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  email: z.string().email('Enter a valid email'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Enter a valid phone number'),
})

type UpdateProfileValues = z.infer<typeof updateProfileSchema>

export function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'me' | 'partner'>('me')
  const queryClient = useQueryClient()
  const { updateProfilePicture, role } = useAuthStore()
  const { enterPartnerView, isViewingAsPartner } = usePartnerViewStore()

  const { data: myProfile, isLoading: myLoading } = useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: profileApi.getMyProfile,
  })

  const { data: partnerProfile, isLoading: partnerLoading } = useQuery({
    queryKey: queryKeys.profile.partner,
    queryFn: profileApi.getPartnerProfile,
    enabled: activeTab === 'partner',
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
  })

  const updateMutation = useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
      setIsEditing(false)
      toast({ title: 'Profile updated', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Update failed', description: extractApiError(error).message, variant: 'error' })
    },
  })

  const pictureMutation = useMutation({
    mutationFn: profileApi.uploadProfilePicture,
    onSuccess: (data) => {
      updateProfilePicture(data.profilePictureUrl)
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
      toast({ title: 'Photo updated', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Upload failed', description: extractApiError(error).message, variant: 'error' })
    },
  })

  const startEditing = () => {
    if (!myProfile) return
    reset({
      name: myProfile.name,
      dateOfBirth: format(new Date(myProfile.dateOfBirth), 'yyyy-MM-dd'),
      email: myProfile.email,
      phoneNumber: myProfile.phoneNumber,
    })
    setIsEditing(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) pictureMutation.mutate(file)
  }

  const handlePartnerView = () => {
    if (partnerProfile) {
      enterPartnerView(partnerProfile.name)
    }
  }

  const currentProfile = activeTab === 'me' ? myProfile : partnerProfile
  const isLoading = activeTab === 'me' ? myLoading : partnerLoading
  const isReadOnly = activeTab === 'partner' || isViewingAsPartner

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-header">Profile</h1>
        <p className="text-sandstone-500 dark:text-sandstone-400 mt-1">
          Manage your personal details and view your couple information
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-sandstone-100 dark:bg-sandstone-900 rounded-2xl">
        {(['me', 'partner'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setIsEditing(false) }}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              activeTab === tab
                ? 'bg-white dark:bg-sandstone-800 text-sandstone-900 dark:text-sandstone-100 shadow-warm-sm'
                : 'text-sandstone-500 dark:text-sandstone-400 hover:text-sandstone-700',
            )}
          >
            {tab === 'me' ? 'My Profile' : `${myProfile?.coupleInfo.partner?.name ?? 'Partner'}'s Profile`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
        </div>
      ) : currentProfile ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* Profile picture & name */}
            <Card padding="lg">
              <div className="flex items-start gap-6">
                <div className="relative flex-shrink-0">
                  <CoupleAvatar
                    src={currentProfile.profilePictureUrl}
                    name={currentProfile.name}
                    role={activeTab === 'me' ? role : currentProfile.role}
                    size="xl"
                  />
                  {!isReadOnly && (
                    <label
                      htmlFor="profile-picture"
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-forest-500 hover:bg-forest-600 flex items-center justify-center cursor-pointer shadow-warm-md transition-colors"
                      aria-label="Change profile picture"
                    >
                      <Camera className="w-3.5 h-3.5 text-white" />
                      <input
                        id="profile-picture"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={handleFileChange}
                        disabled={pictureMutation.isPending}
                      />
                    </label>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-medium text-sandstone-900 dark:text-sandstone-100">
                        {currentProfile.name}
                      </h2>
                      <p className="text-sandstone-500 dark:text-sandstone-400 mt-0.5">
                        @{currentProfile.username} · {currentProfile.role}
                      </p>
                    </div>

                    {!isReadOnly && !isEditing && (
                      <Button variant="outline" size="sm" onClick={startEditing}>
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    )}

                    {activeTab === 'partner' && !isViewingAsPartner && (
                      <Button variant="secondary" size="sm" onClick={handlePartnerView}>
                        <Eye className="w-3.5 h-3.5" />
                        View as partner
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sandstone-50 dark:bg-sandstone-800 border border-sandstone-100 dark:border-sandstone-700">
                    <Shield className="w-3.5 h-3.5 text-gold-500" />
                    <span className="text-xs font-medium text-sandstone-600 dark:text-sandstone-400 font-mono tracking-wider">
                      {currentProfile.coupleInfo.togetherID}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Profile details */}
            {isEditing && !isReadOnly ? (
              <Card padding="lg">
                <CardHeader title="Edit Profile" />
                <form
                  noValidate
                  onSubmit={handleSubmit((values) =>
                    updateMutation.mutate(values)
                  )}
                  className="space-y-4"
                >
                  <Input label="Full Name" error={errors.name?.message} required {...register('name')} />
                  <Input label="Date of Birth" type="date" leftIcon={Calendar} error={errors.dateOfBirth?.message} required {...register('dateOfBirth')} />
                  <Input label="Email" type="email" leftIcon={Mail} error={errors.email?.message} required {...register('email')} />
                  <Input label="Phone Number" type="tel" leftIcon={Phone} error={errors.phoneNumber?.message} required {...register('phoneNumber')} />

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} className="flex-1">
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" loading={updateMutation.isPending}>
                      <Check className="w-4 h-4" />
                      Save changes
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card padding="lg">
                <CardHeader title="Personal Details" />
                <dl className="space-y-4">
                  {[
                    { icon: User, label: 'Name', value: currentProfile.name },
                    { icon: Calendar, label: 'Date of Birth', value: format(new Date(currentProfile.dateOfBirth), 'MMMM d, yyyy') },
                    { icon: Mail, label: 'Email', value: currentProfile.email },
                    { icon: Phone, label: 'Phone', value: currentProfile.phoneNumber },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-sandstone-50 dark:bg-sandstone-800 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-sandstone-400" />
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-sandstone-400 dark:text-sandstone-500 uppercase tracking-wider">{label}</dt>
                        <dd className="text-sm font-medium text-sandstone-900 dark:text-sandstone-100 mt-0.5">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </Card>
            )}

            {/* Couple info */}
            <Card padding="lg">
              <CardHeader title="Together" />
              <div className="flex items-center gap-4 p-4 rounded-xl bg-sandstone-50 dark:bg-sandstone-900/50 border border-sandstone-100 dark:border-sandstone-800">
                <CoupleAvatar
                  src={currentProfile.coupleInfo.partner?.profilePictureUrl}
                  name={currentProfile.coupleInfo.partner?.name ?? ''}
                  role={currentProfile.coupleInfo.partner?.role}
                  size="md"
                />
                <div>
                  <p className="text-sm font-medium text-sandstone-900 dark:text-sandstone-100">
                    {currentProfile.coupleInfo.partner?.name}
                  </p>
                  <p className="text-xs text-sandstone-500 dark:text-sandstone-400">
                    @{currentProfile.coupleInfo.partner?.username} · {currentProfile.coupleInfo.partner?.role}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      ) : null}
    </div>
  )
}
