import { useState, useLayoutEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowDown, ArrowUp, RefreshCcw, Loader2 } from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Spinner from '@/components/ui/Spinner'
import Pagination from '@/components/ui/Pagination'
import { useLayoutPage } from '@/components/layout/LayoutPageContext'
import { formatDate } from '@/lib/utils'
import type { InventoryMovement } from '@/types'

const schema = z.object({
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number(),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const typeConfig: Record<InventoryMovement['type'], { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; icon: React.ReactNode }> = {
  in: { label: 'Masuk', variant: 'default', icon: <ArrowDown className="w-3 h-3" /> },
  out: { label: 'Keluar', variant: 'destructive', icon: <ArrowUp className="w-3 h-3" /> },
  adjustment: { label: 'Penyesuaian', variant: 'secondary', icon: <RefreshCcw className="w-3 h-3" /> },
}

export default function InventoryMovementsPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const { setLayoutPage } = useLayoutPage()

  const { data: item } = useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryApi.show(Number(id)).then((r) => r.data.data),
    enabled: !!id,
  })

  const { data: movements, isLoading } = useQuery({
    queryKey: ['inventory-movements', id, page],
    queryFn: () => inventoryApi.movements(Number(id), page).then((r) => r.data),
    enabled: !!id,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'in', quantity: undefined },
  })

  const addMutation = useMutation({
    mutationFn: (d: FormData) => inventoryApi.addMovement(Number(id), d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-movements', id] })
      qc.invalidateQueries({ queryKey: ['inventory-item', id] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      reset({ type: 'in', quantity: undefined, note: '' })
    },
  })

  const errorMsg = (addMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message

  const selectedType = watch('type')

  useLayoutEffect(() => {
    const description = item
      ? `${item.name}${item.sku ? ` · ${item.sku}` : ''}`
      : undefined
    setLayoutPage({ title: 'Riwayat Pergerakan Stok', description })
    return () => setLayoutPage(null)
  }, [item, setLayoutPage])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/inventory"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        {item && (
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-400">Stok Saat Ini</p>
            <p className="text-2xl font-bold text-blue-600">
              {Number(item.quantity_on_hand).toLocaleString('id-ID')}
              {item.unit && <span className="text-sm font-normal ml-1 text-gray-500">{item.unit}</span>}
            </p>
          </div>
        )}
      </div>

      {/* Form tambah pergerakan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catat Pergerakan Stok</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => addMutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Tipe *</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                {...register('type')}
              >
                <option value="in">Masuk (Stok Bertambah)</option>
                <option value="out">Keluar (Stok Berkurang)</option>
                <option value="adjustment">Penyesuaian (Koreksi)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Jumlah *
                {selectedType === 'adjustment' && (
                  <span className="ml-1 text-xs text-gray-400">(+ atau - angka)</span>
                )}
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder={selectedType === 'adjustment' ? 'cth: -5 atau 10' : 'cth: 50'}
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && <p className="text-xs text-red-600">{errors.quantity.message}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Keterangan / Catatan</Label>
              <div className="flex gap-2">
                <Textarea rows={1} placeholder="cth: Pembelian dari supplier X" {...register('note')} className="resize-none" />
                <Button type="submit" disabled={isSubmitting} className="shrink-0">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
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
                Pergerakan berhasil dicatat!
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Tabel riwayat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Mutasi Stok</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Spinner />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Oleh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-10">
                        Belum ada riwayat pergerakan stok
                      </TableCell>
                    </TableRow>
                  )}
                  {movements?.data.map((m) => {
                    const cfg = typeConfig[m.type]
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-gray-600">{formatDate(m.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="gap-1">
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          <span className={m.quantity_change < 0 ? 'text-red-600' : 'text-green-600'}>
                            {m.quantity_change > 0 ? '+' : ''}
                            {Number(m.quantity_change).toLocaleString('id-ID')}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{m.note ?? '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{m.creator?.name ?? '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="px-4 pb-4">
                <Pagination
                  currentPage={movements?.current_page ?? 1}
                  lastPage={movements?.last_page ?? 1}
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
