import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Edit, Trash2, CheckCircle, Loader2, Receipt } from 'lucide-react'
import { purchaseBillsApi } from '@/api/purchaseBills'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatusBadge from '@/components/ui/StatusBadge'
import Spinner from '@/components/ui/Spinner'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import type { PurchaseBill } from '@/types'

export default function PurchaseBillsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [payingId, setPayingId] = useState<number | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-bills', page, statusFilter],
    queryFn: () => purchaseBillsApi.list(page, 10, statusFilter).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseBillsApi.destroy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-bills'] }),
  })

  const payMutation = useMutation({
    mutationFn: (id: number) => purchaseBillsApi.pay(id),
    onSuccess: () => {
      setPayingId(null)
      qc.invalidateQueries({ queryKey: ['purchase-bills'] })
    },
    onError: () => setPayingId(null),
  })

  const handleDelete = (b: PurchaseBill) => {
    if (confirm(`Hapus purchase bill ${b.purchase_number}?`)) {
      deleteMutation.mutate(b.id)
    }
  }

  const handlePay = (b: PurchaseBill) => {
    if (confirm(`Tandai ${b.purchase_number} sebagai LUNAS dan posting jurnal?`)) {
      setPayingId(b.id)
      payMutation.mutate(b.id)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Bill" description="Kelola tagihan pembelian" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="draft">Draf</SelectItem>
              <SelectItem value="received">Diterima</SelectItem>
              <SelectItem value="paid">Lunas</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link to="/purchase-bills/create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Buat Purchase Bill
          </Link>
        </Button>
      </div>

      <Card className="shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Spinner />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-6 py-3 w-[160px]">
                      Nomor Bill
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[120px]">
                      Tanggal
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                      Supplier
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 text-right w-[150px]">
                      Total
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[110px]">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6 py-3 text-right w-[100px]">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <Receipt className="w-6 h-6 text-gray-300" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">Belum ada purchase bill</p>
                            <p className="text-xs text-gray-400 mt-1">Buat tagihan pembelian pertama Anda sekarang</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {data?.data.map((b, index) => (
                    <TableRow
                      key={b.id}
                      className={`
                        border-b border-gray-100 transition-colors duration-100
                        hover:bg-blue-50/40
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                      `}
                    >
                      {/* Nomor Bill */}
                      <TableCell className="pl-6 py-4">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 whitespace-nowrap">
                          {b.purchase_number}
                        </span>
                      </TableCell>

                      {/* Tanggal */}
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">{formatDate(b.purchase_date)}</span>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none">
                            {b.supplier_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                            {b.supplier_name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Total */}
                      <TableCell className="py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {formatCurrency(b.grand_total)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <StatusBadge status={b.status} />
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="py-4 pr-6">
                        <div className="flex justify-end items-center gap-0.5">
                          {b.status !== 'paid' && b.status !== 'cancelled' ? (
                            <>
                              {/* Edit */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                asChild
                              >
                                <Link to={`/purchase-bills/${b.id}/edit`}>
                                  <Edit className="w-3.5 h-3.5" />
                                </Link>
                              </Button>

                              {/* Bayar */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                onClick={() => handlePay(b)}
                                disabled={payingId === b.id}
                                title="Tandai Lunas"
                              >
                                {payingId === b.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                )}
                              </Button>

                              {/* Hapus */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                onClick={() => handleDelete(b)}
                                title="Hapus Bill"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-300 pr-2">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {(data?.last_page ?? 1) > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Halaman {data?.current_page ?? 1} dari {data?.last_page ?? 1}
                  </p>
                  <Pagination
                    currentPage={data?.current_page ?? 1}
                    lastPage={data?.last_page ?? 1}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}