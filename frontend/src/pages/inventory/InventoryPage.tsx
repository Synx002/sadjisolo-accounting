import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Edit, Trash2, ArrowUpDown, Package } from 'lucide-react'
import { inventoryApi, type InventoryStockFilter } from '@/api/inventory'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import Spinner from '@/components/ui/Spinner'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import type { InventoryItem } from '@/types'

export default function InventoryPage() {
  const [page, setPage] = useState(1)
  const [stockFilter, setStockFilter] = useState<InventoryStockFilter>('all')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page, stockFilter],
    queryFn: () => inventoryApi.list(page, 10, stockFilter).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryApi.destroy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })

  const handleDelete = (item: InventoryItem) => {
    if (confirm(`Hapus item ${item.name}?`)) {
      deleteMutation.mutate(item.id)
    }
  }

  const isLowStock = (item: InventoryItem) => item.quantity_on_hand <= item.reorder_level

  return (
    <div className="space-y-6">
      <PageHeader title="Inventori" description="Kelola item stok barang" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stok</span>
          <Select
            value={stockFilter}
            onValueChange={(v) => {
              setStockFilter(v as InventoryStockFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua item</SelectItem>
              <SelectItem value="low">Stok menipis</SelectItem>
              <SelectItem value="ok">Di atas minimum</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link to="/inventory/create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tambah Item
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
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-6 py-3 w-[140px]">
                      SKU
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                      Nama Item
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[100px]">
                      Satuan
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 text-right w-[140px]">
                      Stok
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 text-right w-[120px]">
                      Min. Stok
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6 py-3 text-right w-[110px]">
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
                            <Package className="w-6 h-6 text-gray-300" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">Belum ada item</p>
                            <p className="text-xs text-gray-400 mt-1">Tambahkan item inventori pertama Anda</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {data?.data.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className={`
                        border-b border-gray-100 transition-colors duration-100
                        hover:bg-blue-50/40
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                      `}
                    >
                      {/* SKU */}
                      <TableCell className="pl-6 py-4">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 whitespace-nowrap">
                          {item.sku}
                        </span>
                      </TableCell>

                      {/* Nama */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[220px]">
                            {item.name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Satuan */}
                      <TableCell className="py-4">
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                          {item.unit}
                        </span>
                      </TableCell>

                      {/* Stok */}
                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLowStock(item) && (
                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                              Rendah
                            </span>
                          )}
                          <span className={`text-sm font-semibold tabular-nums ${isLowStock(item) ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.quantity_on_hand.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </TableCell>

                      {/* Min. Stok */}
                      <TableCell className="py-4 text-right">
                        <span className="text-sm text-gray-500 tabular-nums">
                          {item.reorder_level.toLocaleString('id-ID')}
                        </span>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="py-4 pr-6">
                        <div className="flex justify-end items-center gap-0.5">
                          {/* Mutasi Stok */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            asChild
                            title="Riwayat Mutasi"
                          >
                            <Link to={`/inventory/${item.id}/movements`}>
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </Link>
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            asChild
                            title="Edit Item"
                          >
                            <Link to={`/inventory/${item.id}/edit`}>
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                          </Button>

                          {/* Hapus */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            onClick={() => handleDelete(item)}
                            title="Hapus Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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