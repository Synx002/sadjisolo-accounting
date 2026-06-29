import api from '@/lib/axios'
import type { Expense, Paginated } from '@/types'

export const expensesApi = {
  list: (page = 1, perPage = 15, status?: string) =>
    api.get<Paginated<Expense>>('/expenses', {
      params: {
        page,
        per_page: perPage,
        ...(status && status !== 'all' ? { status } : {}),
      },
    }),

  show: (id: number) => api.get<{ data: Expense }>(`/expenses/${id}`),

  create: (data: unknown) => api.post<{ data: Expense; message: string }>('/expenses', data),

  update: (id: number, data: unknown) =>
    api.put<{ data: Expense; message: string }>(`/expenses/${id}`, data),

  destroy: (id: number) => api.delete<{ message: string }>(`/expenses/${id}`),

  pay: (id: number) =>
    api.post<{ message: string; data: { expense: Expense } }>(`/expenses/${id}/pay`),
}
