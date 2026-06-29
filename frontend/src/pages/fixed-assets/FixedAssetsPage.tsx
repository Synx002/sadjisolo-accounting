import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Edit, Trash2, Calculator, Landmark } from 'lucide-react'
import { fixedAssetsApi } from '@/api/fixedAssets'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatusBadge from '@/components/ui/StatusBadge'
import Spinner from '@/components/ui/Spinner'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import type { FixedAsset } from '@/types'

export default function FixedAssetsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['fixed-assets', page, statusFilter],
    queryFn: () => fixedAssetsApi.list(page, 10, statusFilter).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fixedAssetsApi.destroy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed-assets'] }),
  })

  const handleDelete = (asset: FixedAsset) => {
    if (confirm(`Hapus aset ${asset.name}?`)) {
      deleteMutation.mutate(asset.id)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Aset Tetap" description="Kelola aset tetap dan penyusutan" />

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
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="fully_depreciated">Habis disusutkan</SelectItem>
              <SelectItem value="disposed">Dilepas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link to="/fixed-assets/create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tambah Aset
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
                      Kode
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                      Nama Aset
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[130px]">
                      Tgl. Beli
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 text-right w-[150px]">
                      Harga Beli
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 text-right w-[150px]">
                      Nilai Buku
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[110px]">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6 py-3 text-right w-[110px]">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <Landmark className="w-6 h-6 text-gray-300" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">Belum ada aset tetap</p>
                            <p className="text-xs text-gray-400 mt-1">Tambahkan aset tetap pertama Anda</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {data?.data.map((asset, index) => (
                    <TableRow
                      key={asset.id}
                      className={`
                        border-b border-gray-100 transition-colors duration-100
                        hover:bg-blue-50/40
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                      `}
                    >
                      {/* Kode */}
                      <TableCell className="pl-6 py-4">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 whitespace-nowrap">
                          {asset.asset_code}
                        </span>
                      </TableCell>

                      {/* Nama */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none">
                            {asset.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[220px]">
                            {asset.name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Tgl. Beli */}
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">{formatDate(asset.acquisition_date)}</span>
                      </TableCell>

                      {/* Harga Beli */}
                      <TableCell className="py-4 text-right">
                        <span className="text-sm text-gray-600 tabular-nums">
                          {formatCurrency(asset.cost)}
                        </span>
                      </TableCell>

                      {/* Nilai Buku */}
                      <TableCell className="py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {formatCurrency(asset.book_value)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <StatusBadge status={asset.status} />
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="py-4 pr-6">
                        <div className="flex justify-end items-center gap-0.5">
                          {/* Penyusutan */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            asChild
                            title="Catat Penyusutan"
                          >
                            <Link to={`/fixed-assets/${asset.id}/depreciation`}>
                              <Calculator className="w-3.5 h-3.5" />
                            </Link>
                          </Button>

                          {/* Edit */}
                          {asset.status !== 'fully_depreciated' && asset.status !== 'disposed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              asChild
                              title="Edit Aset"
                            >
                              <Link to={`/fixed-assets/${asset.id}/edit`}>
                                <Edit className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          )}

                          {/* Hapus */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            onClick={() => handleDelete(asset)}
                            title="Hapus Aset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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