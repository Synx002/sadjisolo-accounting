import api from '@/lib/axios'
import type { InventoryItem, InventoryMovement, Paginated } from '@/types'

export type InventoryStockFilter = 'all' | 'low' | 'ok'

export const inventoryApi = {
  list: (page = 1, perPage = 10, stock?: InventoryStockFilter) =>
    api.get<Paginated<InventoryItem>>('/inventory-items', {
      params: {
        page,
        per_page: perPage,
        ...(stock && stock !== 'all' ? { stock } : {}),
      },
    }),

  show: (id: number) => api.get<{ data: InventoryItem }>(`/inventory-items/${id}`),

  create: (data: unknown) =>
    api.post<{ data: InventoryItem; message: string }>('/inventory-items', data),

  update: (id: number, data: unknown) =>
    api.put<{ data: InventoryItem; message: string }>(`/inventory-items/${id}`, data),

  destroy: (id: number) => api.delete<{ message: string }>(`/inventory-items/${id}`),

  movements: (id: number, page = 1) =>
    api.get<Paginated<InventoryMovement>>(`/inventory-items/${id}/movements`, {
      params: { page },
    }),

  addMovement: (id: number, data: unknown) =>
    api.post<{ data: InventoryMovement; message: string }>(
      `/inventory-items/${id}/movements`,
      data
    ),
}
