import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { reportsApi } from '@/api/reports'
import { exportCashBookExcel, exportCashBookPdf } from '@/lib/cashBookExport'
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/layout/PageHeader'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function getFirstAndLast() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: formatDateInput(first.toISOString()),
    end: formatDateInput(last.toISOString()),
  }
}

export default function CashBookPage() {
  const defaults = getFirstAndLast()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [filter, setFilter] = useState(defaults)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cash-book', filter.start, filter.end],
    queryFn: () => reportsApi.cashBook(filter.start, filter.end).then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Buku Kas Harian" description="Mutasi masuk dan keluar dari akun Kas & Bank" />

      {/* Filter Tanggal */}
      <Card className="shadow-sm border border-gray-200 rounded-xl">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dari Tanggal</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sampai Tanggal</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button className="shadow-sm" onClick={() => setFilter({ start: startDate, end: endDate })}>
              Tampilkan
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shadow-sm"
                  disabled={!data || isLoading || isFetching}
                >
                  <Download className="w-4 h-4" />
                  Ekspor
                  <ChevronDown className="w-4 h-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    if (!data) return
                    exportCashBookPdf(data)
                  }}
                >
                  <FileText className="w-4 h-4" />
                  Unduh PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!data) return
                    exportCashBookExcel(data)
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Unduh Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Ringkasan */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Saldo Awal',
              value: data.opening_balance,
              icon: <Wallet className="w-5 h-5 text-gray-400" />,
              color: 'text-gray-700',
              bg: 'border-gray-200',
            },
            {
              label: 'Total Pemasukan',
              value: data.total_pemasukan,
              icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
              color: 'text-emerald-600',
              bg: 'border-gray-200',
            },
            {
              label: 'Total Pengeluaran',
              value: data.total_pengeluaran,
              icon: <TrendingDown className="w-5 h-5 text-red-400" />,
              color: 'text-red-600',
              bg: 'border-gray-200',
            },
            {
              label: 'Saldo Akhir',
              value: data.closing_balance,
              icon: <Wallet className="w-5 h-5 text-blue-500" />,
              color: data.closing_balance >= 0 ? 'text-blue-700' : 'text-red-700',
              bg: 'border-gray-200',
            },
          ].map((item) => (
            <Card key={item.label} className={`shadow-sm border rounded-xl ${item.bg}`}>
              <CardContent className="py-4 flex items-start gap-3">
                <div className="mt-0.5">{item.icon}</div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                  <p className={`text-lg font-semibold tabular-nums ${item.color}`}>
                    {formatCurrency(item.value)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabel Mutasi */}
      <Card className="shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <CardHeader className="border-b border-gray-100 py-3 px-6">
          <CardTitle className="text-sm font-medium text-gray-500">
            {data
              ? `Mutasi ${formatDate(data.period.start_date)} – ${formatDate(data.period.end_date)}`
              : 'Mutasi Kas & Bank'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-24">
              <Spinner />
            </div>
          ) : data?.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">Tidak ada transaksi Kas/Bank</p>
                <p className="text-xs text-gray-400 mt-1">Pastikan transaksi sudah di-"bayar" agar jurnal terposting.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-6 py-3 w-[110px]">
                      Tanggal
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[140px]">
                      No. Jurnal
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                      Keterangan
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 w-[120px]">
                      Akun
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-emerald-600 uppercase tracking-wide py-3 text-right w-[150px]">
                      Pemasukan (Rp)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-red-500 uppercase tracking-wide py-3 text-right w-[150px]">
                      Pengeluaran (Rp)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6 py-3 text-right w-[140px]">
                      Saldo (Rp)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Baris saldo awal */}
                  {data && (
                    <TableRow className="bg-gray-50 border-b border-gray-100">
                      <TableCell className="pl-6 py-3 text-xs text-gray-400" colSpan={4}>
                        Saldo Awal — {formatDate(data.period.start_date)}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right pr-6 py-3 font-semibold text-gray-700 tabular-nums">
                        {formatCurrency(data.opening_balance)}
                      </TableCell>
                    </TableRow>
                  )}

                  {data?.rows.map((row, i) => (
                    <TableRow
                      key={i}
                      className={`
                        border-b border-gray-100 transition-colors duration-100
                        hover:bg-blue-50/40
                        ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                      `}
                    >
                      <TableCell className="pl-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 whitespace-nowrap">
                          {row.journal_number}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-gray-700">
                        {row.description ?? '—'}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="text-xs text-gray-500">
                          {row.account_code} · {row.account_name}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-right tabular-nums">
                        {row.pemasukan != null ? (
                          <span className="text-sm font-medium text-emerald-600">{formatCurrency(row.pemasukan)}</span>
                        ) : ''}
                      </TableCell>
                      <TableCell className="py-3.5 text-right tabular-nums">
                        {row.pengeluaran != null ? (
                          <span className="text-sm font-medium text-red-500">{formatCurrency(row.pengeluaran)}</span>
                        ) : ''}
                      </TableCell>
                      <TableCell className="pr-6 py-3.5 text-right font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(row.saldo)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Baris saldo akhir */}
                  {data && data.rows.length > 0 && (
                    <TableRow className="bg-blue-50 border-t-2 border-blue-100">
                      <TableCell colSpan={4} className="pl-6 py-3.5 text-sm font-semibold text-blue-700">
                        Saldo Akhir — {formatDate(data.period.end_date)}
                      </TableCell>
                      <TableCell className="py-3.5 text-right font-semibold text-emerald-600 tabular-nums">
                        {formatCurrency(data.total_pemasukan)}
                      </TableCell>
                      <TableCell className="py-3.5 text-right font-semibold text-red-500 tabular-nums">
                        {formatCurrency(data.total_pengeluaran)}
                      </TableCell>
                      <TableCell className="pr-6 py-3.5 text-right text-base font-bold text-blue-700 tabular-nums">
                        {formatCurrency(data.closing_balance)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}