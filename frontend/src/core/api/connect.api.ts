import { apiClient } from './axios-instance'
import type {
  ConnectionDto,
  ConnectionStatus,
  CoupleSearchResultDto,
  SendConnectionRequestResult,
} from '@/core/types/api.types'

export const connectApi = {
  getConnections: async (status?: ConnectionStatus): Promise<ConnectionDto[]> => {
    const response = await apiClient.get<ConnectionDto[]>('/connect/connections', {
      params: status ? { status } : undefined,
    })
    return response.data
  },

  searchCouples: async (togetherId: string): Promise<CoupleSearchResultDto[]> => {
    const response = await apiClient.get<CoupleSearchResultDto[]>('/connect/search', {
      params: { togetherId },
    })
    return response.data
  },

  sendConnectionRequest: async (targetTogetherID: string): Promise<SendConnectionRequestResult> => {
    const response = await apiClient.post<SendConnectionRequestResult>('/connect/request', {
      targetTogetherID,
    })
    return response.data
  },

  acceptConnectionRequest: async (connectionId: string): Promise<void> => {
    await apiClient.put(`/connect/request/${connectionId}/accept`)
  },

  rejectConnectionRequest: async (connectionId: string): Promise<void> => {
    await apiClient.put(`/connect/request/${connectionId}/reject`)
  },
}
