import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, UserPlus, Check, X, Clock } from 'lucide-react'
import { connectApi } from '@/core/api/connect.api'
import { queryKeys } from '@/core/constants/query-keys'
import { Card, CardHeader } from '@/shared/components/ui/Card'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { toast } from '@/shared/hooks/use-toast'
import { extractApiError } from '@/core/utils/error.utils'
import { cn } from '@/core/utils/cn'
import { useAuthStore } from '@/shared/stores/auth.store'
import type { ConnectionDto, CoupleSearchResultDto } from '@/core/types/api.types'

export function ConnectPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'connections' | 'pending' | 'search'>('connections')
  const queryClient = useQueryClient()
  const { togetherID } = useAuthStore()

  const { data: connections } = useQuery({
    queryKey: queryKeys.connect.connections('Accepted'),
    queryFn: () => connectApi.getConnections('Accepted'),
    enabled: activeTab === 'connections',
  })

  const { data: pendingConnections } = useQuery({
    queryKey: queryKeys.connect.connections('Pending'),
    queryFn: () => connectApi.getConnections('Pending'),
    enabled: activeTab === 'pending',
  })

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: queryKeys.connect.search(searchQuery),
    queryFn: () => connectApi.searchCouples(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 1000 * 30,
  })

  const sendRequestMutation = useMutation({
    mutationFn: connectApi.sendConnectionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connect.connections() })
      toast({ title: 'Request sent!', description: 'The couple will be notified.', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Request failed', description: extractApiError(error).message, variant: 'error' })
    },
  })

  const acceptMutation = useMutation({
    mutationFn: connectApi.acceptConnectionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connect.connections() })
      toast({ title: 'Connection accepted!', variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: extractApiError(error).message, variant: 'error' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: connectApi.rejectConnectionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connect.connections() })
      toast({ title: 'Request declined', variant: 'default' })
    },
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-header">Connect</h1>
        <p className="text-sandstone-500 dark:text-sandstone-400 mt-1">
          Find other couples and build your social circle
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sandstone-50 dark:bg-sandstone-800 border border-sandstone-100 dark:border-sandstone-700">
          <span className="text-xs font-mono text-forest-600 dark:text-sage-300 tracking-wider">{togetherID}</span>
          <span className="text-xs text-sandstone-400">— Your Together ID</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-sandstone-100 dark:bg-sandstone-900 rounded-2xl">
        {([
          { key: 'connections', label: 'Connected' },
          { key: 'pending', label: 'Pending' },
          { key: 'search', label: 'Find Couples' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              activeTab === key
                ? 'bg-white dark:bg-sandstone-800 text-sandstone-900 dark:text-sandstone-100 shadow-warm-sm'
                : 'text-sandstone-500 hover:text-sandstone-700 dark:text-sandstone-400',
            )}
          >
            {label}
            {key === 'pending' && pendingConnections && pendingConnections.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gold-500 text-white rounded-full">
                {pendingConnections.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Connected couples */}
      {activeTab === 'connections' && (
        <Card>
          <CardHeader title="Connected Couples" />
          {!connections?.length ? (
            <EmptyState
              icon={<UserPlus className="w-8 h-8 text-sandstone-300" />}
              message="No connections yet. Search for couples to connect!"
              action={<Button size="sm" onClick={() => setActiveTab('search')}>Find Couples</Button>}
            />
          ) : (
            <div className="space-y-3">
              {connections.map((conn) => (
                <ConnectionCard key={conn.connectionId} connection={conn} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Pending requests */}
      {activeTab === 'pending' && (
        <Card>
          <CardHeader title="Pending Requests" />
          {!pendingConnections?.length ? (
            <EmptyState
              icon={<Clock className="w-8 h-8 text-sandstone-300" />}
              message="No pending requests"
            />
          ) : (
            <div className="space-y-3">
              {pendingConnections.map((conn) => (
                <div key={conn.connectionId} className="flex items-center gap-4 p-4 rounded-xl bg-sandstone-50 dark:bg-sandstone-900/50 border border-sandstone-100 dark:border-sandstone-800">
                  <div className="flex -space-x-2">
                    <Avatar src={conn.husbandProfilePictureUrl} name={conn.husbandName} size="sm" />
                    <Avatar src={conn.wifeProfilePictureUrl} name={conn.wifeName} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sandstone-900 dark:text-sandstone-100 font-mono tracking-wider">{conn.togetherID}</p>
                    <p className="text-xs text-sandstone-500">{conn.husbandName} & {conn.wifeName}</p>
                    <p className="text-xs text-sandstone-400 mt-0.5">{conn.isInitiator ? 'Request sent by you' : 'Request received'}</p>
                  </div>
                  {!conn.isInitiator && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectMutation.mutate(conn.connectionId)}
                        loading={rejectMutation.isPending}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => acceptMutation.mutate(conn.connectionId)}
                        loading={acceptMutation.isPending}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Search */}
      {activeTab === 'search' && (
        <Card>
          <CardHeader title="Find Couples" />
          <div className="space-y-4">
            <Input
              placeholder="Search by Together ID (e.g. JOHN-JANE)"
              leftIcon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            />

            {isSearching && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
              </div>
            )}

            {searchResults && searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <SearchResultCard
                    key={result.togetherID}
                    result={result}
                    onConnect={() => sendRequestMutation.mutate(result.togetherID)}
                    isLoading={sendRequestMutation.isPending}
                  />
                ))}
              </div>
            )}

            {searchResults?.length === 0 && searchQuery.length >= 2 && (
              <EmptyState
                icon={<Search className="w-8 h-8 text-sandstone-300" />}
                message={`No couples found for "${searchQuery}"`}
              />
            )}

            {searchQuery.length < 2 && (
              <p className="text-center text-sm text-sandstone-400 py-4">
                Enter at least 2 characters to search
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function ConnectionCard({ connection }: { connection: ConnectionDto }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-sandstone-50 dark:bg-sandstone-900/50 border border-sandstone-100 dark:border-sandstone-800">
      <div className="flex -space-x-2">
        <Avatar src={connection.husbandProfilePictureUrl} name={connection.husbandName} size="sm" />
        <Avatar src={connection.wifeProfilePictureUrl} name={connection.wifeName} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sandstone-900 dark:text-sandstone-100 font-mono tracking-wider">{connection.togetherID}</p>
        <p className="text-xs text-sandstone-500">{connection.husbandName} & {connection.wifeName}</p>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-forest-50 dark:bg-forest-900/20 border border-forest-100 dark:border-forest-800">
        <Check className="w-3 h-3 text-forest-500" />
        <span className="text-xs font-medium text-forest-600 dark:text-forest-400">Connected</span>
      </div>
    </div>
  )
}

function SearchResultCard({
  result,
  onConnect,
  isLoading,
}: {
  result: CoupleSearchResultDto
  onConnect: () => void
  isLoading: boolean
}) {
  const statusMap = {
    Accepted: { label: 'Connected', class: 'bg-forest-50 text-forest-600 border-forest-100' },
    Pending: { label: 'Pending', class: 'bg-sandstone-50 text-sandstone-600 border-sandstone-100' },
    Rejected: null,
  }

  const status = result.existingConnectionStatus
    ? statusMap[result.existingConnectionStatus]
    : null

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-sandstone-50 dark:bg-sandstone-900/50 border border-sandstone-100 dark:border-sandstone-800">
      <div className="flex -space-x-2">
        <Avatar src={result.husbandProfilePictureUrl} name={result.husbandName} size="sm" />
        <Avatar src={result.wifeProfilePictureUrl} name={result.wifeName} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sandstone-900 dark:text-sandstone-100 font-mono tracking-wider">{result.togetherID}</p>
        <p className="text-xs text-sandstone-500">{result.husbandName} & {result.wifeName}</p>
      </div>
      {status ? (
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', status.class)}>
          {status.label}
        </span>
      ) : (
        <Button size="sm" onClick={onConnect} loading={isLoading}>
          <UserPlus className="w-3.5 h-3.5" />
          Connect
        </Button>
      )}
    </div>
  )
}

function EmptyState({
  icon,
  message,
  action,
}: {
  icon: React.ReactNode
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12 space-y-3">
      <div className="flex justify-center">{icon}</div>
      <p className="text-sm text-sandstone-500 dark:text-sandstone-400">{message}</p>
      {action}
    </div>
  )
}
