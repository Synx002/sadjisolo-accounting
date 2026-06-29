import api from '@/lib/axios'
import type { Invoice, Paginated } from '@/types'

export const invoicesApi = {
  list: (page = 1, perPage = 10, status?: string) =>
    api.get<Paginated<Invoice>>('/invoices', {
      params: {
        page,
        per_page: perPage,
        ...(status && status !== 'all' ? { status } : {}),
      },
    }),

  show: (id: number) => api.get<{ data: Invoice }>(`/invoices/${id}`),

  create: (data: unknown) => api.post<{ data: Invoice; message: string }>('/invoices', data),

  update: (id: number, data: unknown) =>
    api.put<{ data: Invoice; message: string }>(`/invoices/${id}`, data),

  destroy: (id: number) => api.delete<{ message: string }>(`/invoices/${id}`),

  pay: (id: number) =>
    api.post<{ message: string; data: { invoice: Invoice } }>(`/invoices/${id}/pay`),
}
