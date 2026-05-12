import { useState, useLayoutEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Info } from 'lucide-react'
import { fixedAssetsApi } from '@/api/fixedAssets'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Spinner from '@/components/ui/Spinner'
import Pagination from '@/components/ui/Pagination'
import { useLayoutPage } from '@/components/layout/LayoutPageContext'

const schema = z.object({
  period_year: z.number().int().min(1900).max(2100),
  period_month: z.number().int().min(1).max(12),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export default function FixedAssetDepreciationPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const { setLayoutPage } = useLayoutPage()

  const { data: asset } = useQuery({
    queryKey: ['fixed-asset', id],
    queryFn: () => fixedAssetsApi.show(Number(id)).then((r) => r.data.data),
    enabled: !!id,
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['depreciation-entries', id, page],
    queryFn: () => fixedAssetsApi.depreciations(Number(id), page).then((r) => r.data),
    enabled: !!id,
  })

  const now = new Date()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      period_year: now.getFullYear(),
      period_month: now.getMonth() + 1,
    },
  })

  const addMutation = useMutation({
    mutationFn: (d: FormData) => fixedAssetsApi.addDepreciation(Number(id), d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['depreciation-entries', id] })
      qc.invalidateQueries({ queryKey: ['fixed-asset', id] })
      qc.invalidateQueries({ queryKey: ['fixed-assets'] })
      reset({
        period_year: now.getFullYear(),
        period_month: now.getMonth() + 1,
        note: '',
      })
    },
  })

  const errorMsg = (addMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message

  const monthlyDepreciation =
    asset && asset.useful_life_months > 0
      ? (asset.cost - (asset.salvage_value ?? 0)) / asset.useful_life_months
      : 0

  useLayoutEffect(() => {
    const description = asset ? `${asset.name} · ${asset.asset_code}` : undefined
    setLayoutPage({ title: 'Penyusutan Aset Tetap', description })
    return () => setLayoutPage(null)
  }, [asset, setLayoutPage])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/fixed-assets"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
      </div>

      {/* Info Aset */}
      {asset && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Harga Beli', value: formatCurrency(asset.cost) },
            { label: 'Nilai Sisa', value: formatCurrency(asset.salvage_value ?? 0) },
            { label: 'Nilai Buku Saat Ini', value: formatCurrency(asset.book_value) },
            {
              label: 'Penyusutan/Bulan',
              value: formatCurrency(monthlyDepreciation),
              note: `${asset.useful_life_months} bln`,
            },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="py-4">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
                {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Catat Penyusutan */}
      {asset?.status === 'active' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catat Penyusutan Periode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Setiap bulan, daftarkan penyusutan untuk periode bulan/tahun yang bersangkutan.
                Sistem otomatis menghitung{' '}
                <strong>{formatCurrency(monthlyDepreciation)}</strong> per bulan dan memposting
                jurnal penyusutan secara otomatis.
              </p>
            </div>
            <form
              onSubmit={handleSubmit((d) => addMutation.mutate(d))}
              className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
            >
              <div className="space-y-1.5">
                <Label>Bulan *</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  {...register('period_month', { valueAsNumber: true, setValueAs: (v) => parseInt(v, 10) })}
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                {errors.period_month && (
                  <p className="text-xs text-red-600">{errors.period_month.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Tahun *</Label>
                <Input
                  type="number"
                  min="1990"
                  max="2100"
                  {...register('period_year', { valueAsNumber: true })}
                />
                {errors.period_year && (
                  <p className="text-xs text-red-600">{errors.period_year.message}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Catatan</Label>
                <div className="flex gap-2">
                  <Textarea
                    rows={1}
                    placeholder="Opsional: keterangan tambahan"
                    {...register('note')}
                    className="resize-none"
                  />
                  <Button type="submit" disabled={isSubmitting} className="shrink-0">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Catat'}
                  </Button>
                </div>
              </div>

              {errorMsg && (
                <div className="sm:col-span-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
              {addMutation.isSuccess && (
                <div className="sm:col-span-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                  Penyusutan berhasil dicatat dan jurnal otomatis diposting!
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      ) : (
        asset && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-700">
            Aset ini berstatus <strong>{asset.status}</strong> — tidak dapat mencatat penyusutan baru.
          </div>
        )
      )}

      {/* Riwayat Penyusutan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Penyusutan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Spinner />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Beban Penyusutan</TableHead>
                    <TableHead className="text-right">Nilai Buku Setelah</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead>Dicatat Oleh</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-10">
                        Belum ada penyusutan yang dicatat
                      </TableCell>
                    </TableRow>
                  )}
                  {entries?.data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {MONTH_NAMES[(entry.period_month ?? 1) - 1]} {entry.period_year}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.book_value_after)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{entry.note ?? '-'}</TableCell>
                      <TableCell className="text-sm text-gray-400">
                        {entry.creator?.name ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-400">
                        {formatDate(entry.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 pb-4">
                <Pagination
                  currentPage={entries?.current_page ?? 1}
                  lastPage={entries?.last_page ?? 1}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
