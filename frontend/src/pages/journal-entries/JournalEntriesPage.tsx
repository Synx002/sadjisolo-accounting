import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Eye, Edit, Trash2, Send, Loader2, BookOpen } from 'lucide-react'
import { journalEntriesApi } from '@/api/journalEntries'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatusBadge from '@/components/ui/StatusBadge'
import Spinner from '@/components/ui/Spinner'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import type { JournalEntry } from '@/types'

export default function JournalEntriesPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [postingId, setPostingId] = useState<number | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries', page, statusFilter],
    queryFn: () =>
      journalEntriesApi
        .list(page, 15, statusFilter === 'all' ? undefined : statusFilter)
        .then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => journalEntriesApi.destroy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal-entries'] }),
  })

  const postMutation = useMutation({
    mutationFn: (id: number) => journalEntriesApi.post(id),
    onSuccess: () => {
      setPostingId(null)
      qc.invalidateQueries({ queryKey: ['journal-entries'] })
    },
    onError: () => setPostingId(null),
  })

  const handleDelete = (entry: JournalEntry) => {
    if (confirm(`Hapus jurnal ${entry.journal_number}?`)) {
      deleteMutation.mutate(entry.id)
    }
  }

  const handlePost = (entry: JournalEntry) => {
    if (confirm(`Posting jurnal ${entry.journal_number}? Jurnal yang sudah diposting tidak bisa diubah.`)) {
      setPostingId(entry.id)
      postMutation.mutate(entry.id)
    }
  }

  const getTotalDebit = (entry: JournalEntry) =>
    entry.lines?.reduce((s, l) => s + Number(l.debit), 0) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title="Jurnal Akuntansi" description="Kelola jurnal entri double-entry" />

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
              <SelectItem value="posted">Diposting</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link to="/journal-entries/create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Buat Jurnal
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
                      Nomor
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[120px]">
                      Tanggal
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                      Deskripsi
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[250px]">
                      Referensi
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 text-right w-[150px]">
                      Total Debit
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[110px]">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6 py-3 text-right w-[120px]">
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
                            <BookOpen className="w-6 h-6 text-gray-300" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">Belum ada jurnal</p>
                            <p className="text-xs text-gray-400 mt-1">Buat jurnal entri pertama Anda</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {data?.data.map((entry, index) => (
                    <TableRow
                      key={entry.id}
                      className={`
                        border-b border-gray-100 transition-colors duration-100
                        hover:bg-blue-50/40
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                      `}
                    >
                      {/* Nomor */}
                      <TableCell className="pl-6 py-4">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 whitespace-nowrap">
                          {entry.journal_number}
                        </span>
                      </TableCell>

                      {/* Tanggal */}
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">{formatDate(entry.entry_date)}</span>
                      </TableCell>

                      {/* Deskripsi */}
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-700 truncate max-w-xs block">
                          {entry.description ?? '—'}
                        </span>
                      </TableCell>

                      {/* Referensi */}
                      <TableCell className="py-4">
                        {entry.reference ? (
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                            {entry.reference}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>

                      {/* Total Debit */}
                      <TableCell className="py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {formatCurrency(getTotalDebit(entry))}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <StatusBadge status={entry.status} />
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="py-4 pr-6">
                        <div className="flex justify-end items-center gap-0.5">
                          {/* Lihat */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                            asChild
                            title="Lihat detail"
                          >
                            <Link to={`/journal-entries/${entry.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </Button>

                          {entry.status === 'draft' && (
                            <>
                              {/* Edit */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                asChild
                                title="Edit"
                              >
                                <Link to={`/journal-entries/${entry.id}/edit`}>
                                  <Edit className="w-3.5 h-3.5" />
                                </Link>
                              </Button>

                              {/* Posting */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                onClick={() => handlePost(entry)}
                                disabled={postingId === entry.id}
                                title="Posting jurnal"
                              >
                                {postingId === entry.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                              </Button>

                              {/* Hapus */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                onClick={() => handleDelete(entry)}
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
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