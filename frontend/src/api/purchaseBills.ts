import api from '@/lib/axios'
import type { Paginated, PurchaseBill } from '@/types'

export const purchaseBillsApi = {
  list: (page = 1, perPage = 10, status?: string) =>
    api.get<Paginated<PurchaseBill>>('/purchase-bills', {
      params: {
        page,
        per_page: perPage,
        ...(status && status !== 'all' ? { status } : {}),
      },
    }),

  show: (id: number) => api.get<{ data: PurchaseBill }>(`/purchase-bills/${id}`),

  create: (data: unknown) =>
    api.post<{ data: PurchaseBill; message: string }>('/purchase-bills', data),

  update: (id: number, data: unknown) =>
    api.put<{ data: PurchaseBill; message: string }>(`/purchase-bills/${id}`, data),

  destroy: (id: number) => api.delete<{ message: string }>(`/purchase-bills/${id}`),

  pay: (id: number) =>
    api.post<{ message: string; data: { purchase_bill: PurchaseBill } }>(
      `/purchase-bills/${id}/pay`
    ),
}
