import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { journalEntriesApi } from '@/api/journalEntries'
import { accountsApi } from '@/api/accounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageHeader from '@/components/layout/PageHeader'
import { formatCurrency } from '@/lib/utils'

const lineSchema = z.object({
  account_id: z.number({ message: 'Pilih akun' }).int().positive('Pilih akun'),
  debit: z.number().min(0),
  credit: z.number().min(0),
  description: z.string().optional(),
})

const schema = z.object({
  entry_date: z.string().min(1, 'Wajib diisi'),
  reference: z.string().optional(),
  description: z.string().optional(),
  lines: z
    .array(lineSchema)
    .min(2, 'Minimal 2 baris jurnal'),
})

type FormData = z.infer<typeof schema>

const emptyLine = { account_id: 0, debit: 0, credit: 0, description: '' }

export default function JournalEntryFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: accounts } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => accountsApi.list({ active_only: true }).then((r) => r.data.data),
  })

  const { data: existing } = useQuery({
    queryKey: ['journal-entry', id],
    queryFn: () => journalEntriesApi.show(Number(id)).then((r) => r.data.data),
    enabled: isEdit,
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_date: new Date().toISOString().slice(0, 10),
      lines: [emptyLine, emptyLine],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  useEffect(() => {
    if (existing) {
      reset({
        entry_date: existing.entry_date,
        reference: existing.reference ?? '',
        description: existing.description ?? '',
        lines: existing.lines.map((l) => ({
          account_id: l.account_id,
          debit: Number(l.debit),
          credit: Number(l.credit),
          description: l.description ?? '',
        })),
      })
    }
  }, [existing, reset])

  const createMutation = useMutation({
    mutationFn: (data: FormData) => journalEntriesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] })
      navigate('/journal-entries')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => journalEntriesApi.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] })
      qc.invalidateQueries({ queryKey: ['journal-entry', id] })
      navigate('/journal-entries')
    },
  })

  const onSubmit = (data: FormData) => {
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  const lines = watch('lines')
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const postableAccounts = accounts?.filter((a) => a.is_postable) ?? []

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Jurnal' : 'Buat Jurnal'} description="Entri jurnal akuntansi double-entry" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Jurnal</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tanggal *</Label>
              <Input type="date" {...register('entry_date')} />
              {errors.entry_date && (
                <p className="text-xs text-red-600">{errors.entry_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Referensi</Label>
              <Input placeholder="No. bukti / referensi..." {...register('reference')} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea rows={2} placeholder="Keterangan jurnal..." {...register('description')} />
            </div>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Baris Jurnal</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(emptyLine)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Tambah Baris
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Column headers */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-4">Akun</div>
              <div className="col-span-3 text-right">Debit (Rp)</div>
              <div className="col-span-3 text-right">Kredit (Rp)</div>
              <div className="col-span-1">Ket.</div>
              <div className="col-span-1" />
            </div>

            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                {/* Account */}
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Label className="sm:hidden text-xs">Akun</Label>
                  <Select
                    value={lines[i]?.account_id ? String(lines[i].account_id) : ''}
                    onValueChange={(v) => setValue(`lines.${i}.account_id`, Number(v))}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Pilih akun..." />
                    </SelectTrigger>
                    <SelectContent>
                      {postableAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          <span className="font-mono text-xs text-gray-400 mr-2">{acc.code}</span>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.lines?.[i]?.account_id && (
                    <p className="text-xs text-red-600">{errors.lines[i]?.account_id?.message}</p>
                  )}
                </div>

                {/* Debit */}
                <div className="col-span-5 sm:col-span-3 space-y-1">
                  <Label className="sm:hidden text-xs">Debit</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="text-right h-9"
                    {...register(`lines.${i}.debit`, { valueAsNumber: true })}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setValue(`lines.${i}.debit`, val)
                      if (val > 0) setValue(`lines.${i}.credit`, 0)
                    }}
                  />
                </div>

                {/* Credit */}
                <div className="col-span-5 sm:col-span-3 space-y-1">
                  <Label className="sm:hidden text-xs">Kredit</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="text-right h-9"
                    {...register(`lines.${i}.credit`, { valueAsNumber: true })}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setValue(`lines.${i}.credit`, val)
                      if (val > 0) setValue(`lines.${i}.debit`, 0)
                    }}
                  />
                </div>

                {/* Description */}
                <div className="col-span-10 sm:col-span-1 space-y-1">
                  <Label className="sm:hidden text-xs">Keterangan</Label>
                  <Input
                    placeholder="Ket."
                    className="h-9 text-xs"
                    {...register(`lines.${i}.description`)}
                  />
                </div>

                {/* Remove */}
                <div className="col-span-2 sm:col-span-1 flex items-end justify-end pb-0.5">
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 h-9 w-9"
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {errors.lines && typeof errors.lines.message === 'string' && (
              <p className="text-xs text-red-600">{errors.lines.message}</p>
            )}

            {/* Balance summary */}
            <div className="border-t pt-3 mt-2 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total Debit</span>
                <span className="font-medium">{formatCurrency(totalDebit)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total Kredit</span>
                <span className="font-medium">{formatCurrency(totalCredit)}</span>
              </div>
              {!isBalanced && totalDebit + totalCredit > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Jurnal tidak seimbang — selisih{' '}
                    <strong>{formatCurrency(Math.abs(totalDebit - totalCredit))}</strong>
                  </span>
                </div>
              )}
              {isBalanced && totalDebit > 0 && (
                <div className="text-sm text-green-600 font-medium text-right">
                  ✓ Seimbang
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Simpan Draf'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/journal-entries')}>
            Batal
          </Button>
        </div>
      </form>
    </div>
  )
}
