import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit, Send, Loader2 } from 'lucide-react'
import { journalEntriesApi } from '@/api/journalEntries'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import StatusBadge from '@/components/ui/StatusBadge'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/layout/PageHeader'

export default function JournalEntryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [posting, setPosting] = useState(false)

  const { data: entry, isLoading } = useQuery({
    queryKey: ['journal-entry', id],
    queryFn: () => journalEntriesApi.show(Number(id)).then((r) => r.data.data),
  })

  const postMutation = useMutation({
    mutationFn: () => journalEntriesApi.post(Number(id)),
    onSuccess: () => {
      setPosting(false)
      qc.invalidateQueries({ queryKey: ['journal-entry', id] })
      qc.invalidateQueries({ queryKey: ['journal-entries'] })
    },
    onError: () => setPosting(false),
  })

  const handlePost = () => {
    if (confirm(`Posting jurnal ${entry?.journal_number}? Jurnal yang sudah diposting tidak bisa diubah.`)) {
      setPosting(true)
      postMutation.mutate()
    }
  }

  if (isLoading) return <Spinner />
  if (!entry) return <p className="text-center text-gray-400 mt-20">Jurnal tidak ditemukan.</p>

  const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0)
  const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div>
      <PageHeader title={entry.journal_number} description="Detail jurnal akuntansi" />

      <div className="flex flex-wrap items-center justify-end gap-2 mb-6">
        <Button variant="outline" onClick={() => navigate('/journal-entries')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        {entry.status === 'draft' && (
          <>
            <Button variant="outline" asChild>
              <Link to={`/journal-entries/${entry.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button onClick={handlePost} disabled={posting}>
              {posting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Posting
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Nomor Jurnal</p>
            <p className="font-mono font-semibold text-sm">{entry.journal_number}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Tanggal</p>
            <p className="font-medium text-sm">{formatDate(entry.entry_date)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <div className="mt-0.5"><StatusBadge status={entry.status} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Referensi</p>
            <p className="font-medium text-sm">{entry.reference ?? '-'}</p>
          </CardContent>
        </Card>
      </div>

      {entry.description && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Deskripsi</p>
            <p className="text-sm text-gray-800">{entry.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Baris Jurnal</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Akun</TableHead>
                <TableHead>Deskripsi Baris</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines.map((line, i) => (
                <TableRow key={line.id ?? i}>
                  <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-gray-400 mr-2">{line.account?.code}</span>
                    <span className="text-sm font-medium">{line.account?.name}</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{line.description ?? '-'}</TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {Number(line.debit) > 0 ? formatCurrency(Number(line.debit)) : <span className="text-gray-300">-</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {Number(line.credit) > 0 ? formatCurrency(Number(line.credit)) : <span className="text-gray-300">-</span>}
                  </TableCell>
                </TableRow>
              ))}

              <TableRow className="bg-gray-50 font-semibold border-t-2">
                <TableCell colSpan={3} className="text-right text-sm pr-4 text-gray-600">
                  Total
                </TableCell>
                <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalCredit)}</TableCell>
              </TableRow>

              {!isBalanced && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-red-500 py-2 bg-red-50">
                    Jurnal tidak seimbang — selisih: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 space-y-1">
        {entry.source_type && (
          <p className="text-xs text-gray-400">
            Dibuat otomatis dari: <span className="font-medium">{entry.source_type}</span> #{entry.source_id}
          </p>
        )}
        {entry.posted_at && (
          <p className="text-xs text-gray-400">
            Diposting pada: {formatDate(entry.posted_at)}
          </p>
        )}
      </div>
    </div>
  )
}
