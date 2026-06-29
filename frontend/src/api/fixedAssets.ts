import api from '@/lib/axios'
import type { DepreciationEntry, FixedAsset, Paginated } from '@/types'

export const fixedAssetsApi = {
  list: (page = 1, perPage = 10, status?: string) =>
    api.get<Paginated<FixedAsset>>('/fixed-assets', {
      params: {
        page,
        per_page: perPage,
        ...(status && status !== 'all' ? { status } : {}),
      },
    }),

  show: (id: number) => api.get<{ data: FixedAsset }>(`/fixed-assets/${id}`),

  create: (data: unknown) =>
    api.post<{ data: FixedAsset; message: string }>('/fixed-assets', data),

  update: (id: number, data: unknown) =>
    api.put<{ data: FixedAsset; message: string }>(`/fixed-assets/${id}`, data),

  destroy: (id: number) => api.delete<{ message: string }>(`/fixed-assets/${id}`),

  depreciations: (id: number, page = 1) =>
    api.get<Paginated<DepreciationEntry>>(`/fixed-assets/${id}/depreciations`, {
      params: { page },
    }),

  addDepreciation: (id: number, data: unknown) =>
    api.post<{ data: DepreciationEntry; message: string }>(
      `/fixed-assets/${id}/depreciations`,
      data
    ),
}
