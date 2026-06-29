import { useMemo, useState } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  LayoutGrid,
  MoreHorizontal,
  Send,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { reportsApi } from '@/api/reports'
import PageHeader from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/auth'
import type { CashBookRow } from '@/types'

const CHART_BLUE = '#1e3a8a'
const CHART_PINK = '#db2777'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shortIdrAxis(n: number): string {
  const v = Math.abs(n)
  if (v >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} jt`
  if (v >= 1_000) return `${(n / 1_000).toFixed(0)} rb`
  return String(Math.round(n))
}

function aggregateCashBookByDay(rows: CashBookRow[]) {
  const map = new Map<string, { pendapatan: number; beban: number }>()
  for (const r of rows) {
    const d = (r.date ?? '').split('T')[0]
    if (!d) continue
    if (!map.has(d)) map.set(d, { pendapatan: 0, beban: 0 })
    const e = map.get(d)!
    e.pendapatan += Number(r.pemasukan ?? 0)
    e.beban += Number(r.pengeluaran ?? 0)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      name: new Date(date + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric' }),
      pendapatan: v.pendapatan,
      beban: v.beban,
      _sort: date,
    }))
}

function TrendLine({
  current,
  previous,
  invert,
}: {
  current: number
  previous: number
  invert?: boolean
}) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-gray-400">— vs bulan lalu</span>
  }
  if (previous === 0) {
    return (
      <span className={cn('text-xs font-medium', invert ? 'text-rose-600' : 'text-emerald-600')}>
        ↑ 100% vs bulan lalu
      </span>
    )
  }
  const pct = ((current - previous) / previous) * 100
  const up = pct >= 0
  const favorable = invert ? !up : up
  return (
    <span className={cn('text-xs font-medium', favorable ? 'text-emerald-600' : 'text-rose-600')}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}% vs bulan lalu
    </span>
  )
}

const STAT_COLORS = ['#1e3a8a', '#7c3aed', '#db2777', '#0ea5e9', '#94a3b8']

type FlowPeriod = 'year' | 'month' | 'day'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const today = new Date()
  const cy = today.getFullYear()
  const cm = today.getMonth()

  const curStart = toYmd(new Date(cy, cm, 1))
  const curEnd = toYmd(new Date(cy, cm + 1, 0))
  const prevMonth = cm === 0 ? 11 : cm - 1
  const prevYear = cm === 0 ? cy - 1 : cy
  const prevStart = toYmd(new Date(prevYear, prevMonth, 1))
  const prevEnd = toYmd(new Date(prevYear, prevMonth + 1, 0))

  const [flowPeriod, setFlowPeriod] = useState<FlowPeriod>('month')
  const [txMonthKey, setTxMonthKey] = useState(() => `${cy}-${String(cm + 1).padStart(2, '0')}`)

  const { data: income, isLoading: incomeLoading } = useQuery({
    queryKey: ['income-statement', curStart, curEnd],
    queryFn: () => reportsApi.incomeStatement(curStart, curEnd).then((r) => r.data),
  })

  const { data: incomePrev } = useQuery({
    queryKey: ['income-statement', prevStart, prevEnd],
    queryFn: () => reportsApi.incomeStatement(prevStart, prevEnd).then((r) => r.data),
  })

  const { data: cashCurrent, isLoading: cashLoading } = useQuery({
    queryKey: ['cash-book', curStart, curEnd],
    queryFn: () => reportsApi.cashBook(curStart, curEnd).then((r) => r.data),
  })

  const monthQueries = useQueries({
    queries: MONTHS_SHORT.map((_, monthIndex) => {
      const start = toYmd(new Date(cy, monthIndex, 1))
      const end = toYmd(new Date(cy, monthIndex + 1, 0))
      return {
        queryKey: ['income-statement-dash-month', cy, monthIndex],
        queryFn: () => reportsApi.incomeStatement(start, end).then((r) => r.data),
        staleTime: 1000 * 60 * 10,
      }
    }),
  })

  const yearQueries = useQueries({
    queries: [0, 1, 2, 3, 4].map((offset) => {
      const y = cy - 4 + offset
      return {
        queryKey: ['income-statement-dash-year', y],
        queryFn: () =>
          reportsApi.incomeStatement(toYmd(new Date(y, 0, 1)), toYmd(new Date(y, 11, 31))).then((r) => r.data),
        staleTime: 1000 * 60 * 10,
      }
    }),
  })

  const { data: cashForDay, isLoading: cashDayLoading } = useQuery({
    queryKey: ['cash-book-day-chart', curStart, curEnd],
    queryFn: () => reportsApi.cashBook(curStart, curEnd).then((r) => r.data),
    enabled: flowPeriod === 'day',
  })

  const txRange = useMemo(() => {
    const [y, m] = txMonthKey.split('-').map(Number)
    return {
      start: toYmd(new Date(y, m - 1, 1)),
      end: toYmd(new Date(y, m, 0)),
    }
  }, [txMonthKey])

  const { data: cashTx, isLoading: cashTxLoading } = useQuery({
    queryKey: ['cash-book', txRange.start, txRange.end],
    queryFn: () => reportsApi.cashBook(txRange.start, txRange.end).then((r) => r.data),
  })

  const flowData = useMemo(() => {
    if (flowPeriod === 'month') {
      return monthQueries.map((q, i) => ({
        name: MONTHS_SHORT[i],
        pendapatan: q.data?.revenue.total_revenue ?? 0,
        beban: q.data?.expense.total_expense ?? 0,
      }))
    }
    if (flowPeriod === 'year') {
      return yearQueries.map((q, i) => ({
        name: String(cy - 4 + i),
        pendapatan: q.data?.revenue.total_revenue ?? 0,
        beban: q.data?.expense.total_expense ?? 0,
      }))
    }
    const rows = cashForDay?.rows ?? []
    return aggregateCashBookByDay(rows).map(({ name, pendapatan, beban }) => ({ name, pendapatan, beban }))
  }, [flowPeriod, monthQueries, yearQueries, cashForDay?.rows])

  const chartLoading =
    flowPeriod === 'month'
      ? monthQueries.some((q) => q.isLoading)
      : flowPeriod === 'year'
        ? yearQueries.some((q) => q.isLoading)
        : cashDayLoading

  const expenseBreakdown = useMemo(() => {
    const accounts = income?.expense.accounts ?? []
    const sorted = [...accounts].sort((a, b) => Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)))
    const top = sorted.slice(0, 4)
    const rest = sorted.slice(4)
    const restTotal = rest.reduce((s, a) => s + Math.abs(Number(a.balance)), 0)
    const items = [
      ...top.map((a, i) => ({
        label: a.name,
        value: Math.abs(Number(a.balance)),
        color: STAT_COLORS[i % STAT_COLORS.length],
      })),
    ]
    if (restTotal > 0) {
      items.push({ label: 'Lainnya', value: restTotal, color: STAT_COLORS[4] })
    }
    const total = items.reduce((s, i) => s + i.value, 0) || 1
    return { items, total }
  }, [income?.expense.accounts])

  const recentRows = useMemo(() => {
    const rows = [...(cashTx?.rows ?? [])].reverse().slice(0, 8)
    return rows
  }, [cashTx?.rows])

  const spendingPct = useMemo(() => {
    const pem = Number(cashCurrent?.total_pemasukan ?? 0)
    const peng = Number(cashCurrent?.total_pengeluaran ?? 0)
    if (pem <= 0 && peng <= 0) return 0
    const cap = Math.max(pem * 1.15, peng, 1)
    return Math.min(100, Math.round((peng / cap) * 100))
  }, [cashCurrent?.total_pemasukan, cashCurrent?.total_pengeluaran])

  const txMonthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = []
    for (let m = 0; m < 12; m++) {
      opts.push({
        value: `${cy}-${String(m + 1).padStart(2, '0')}`,
        label: new Date(cy, m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      })
    }
    return opts
  }, [cy])

  if (incomeLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  }

  const rev = income?.revenue.total_revenue ?? 0
  const exp = income?.expense.total_expense ?? 0
  const net = income?.net_income ?? 0
  const revP = incomePrev?.revenue.total_revenue ?? 0
  const expP = incomePrev?.expense.total_expense ?? 0
  const netP = incomePrev?.net_income ?? 0

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Ringkasan ${today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Summary metric cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                title: 'Pendapatan',
                amount: rev,
                trend: { current: rev, previous: revP },
                icon: TrendingUp,
                iconWrap: 'bg-blue-50 text-blue-700',
              },
              {
                title: 'Beban',
                amount: exp,
                trend: { current: exp, previous: expP, invert: true },
                icon: TrendingDown,
                iconWrap: 'bg-pink-50 text-pink-700',
              },
              {
                title: 'Laba bersih',
                amount: net,
                trend: { current: net, previous: netP },
                icon: TrendingUp,
                iconWrap: income?.is_profit ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
              },
            ].map((card) => (
              <Card
                key={card.title}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn('rounded-xl p-2', card.iconWrap)}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/reports">Laporan keuangan</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/cash-book">Buku kas</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">{card.title}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-gray-900 sm:text-2xl">
                    {formatCurrency(card.amount)}
                  </p>
                  <div className="mt-2">
                    <TrendLine
                      current={card.trend.current}
                      previous={card.trend.previous}
                      invert={'invert' in card.trend ? card.trend.invert : false}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Money flow chart */}
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-gray-900">Alur kas</h2>
                <div className="inline-flex self-start rounded-xl bg-gray-100 p-1">
                  {(
                    [
                      ['year', 'Tahun'],
                      ['month', 'Bulan'],
                      ['day', 'Hari'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFlowPeriod(key)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                        flowPeriod === key
                          ? 'bg-[#1e3a8a] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[300px] w-full">
                {chartLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Memuat grafik…
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={flowData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={shortIdrAxis}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatCurrency(Number(value ?? 0)),
                          String(name) === 'pendapatan' ? 'Pendapatan' : 'Beban',
                        ]}
                        contentStyle={{
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: 16 }}
                        formatter={(value) => (value === 'pendapatan' ? 'Pendapatan' : 'Beban')}
                      />
                      <Bar dataKey="pendapatan" fill={CHART_BLUE} radius={[6, 6, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="beban" fill={CHART_PINK} radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent transactions */}
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-gray-900">Transaksi terkini</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Periode</span>
                  <Select value={txMonthKey} onValueChange={setTxMonthKey}>
                    <SelectTrigger className="h-9 w-[200px] rounded-lg border-gray-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {txMonthOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {cashTxLoading ? (
                <div className="flex justify-center py-16">
                  <Spinner />
                </div>
              ) : recentRows.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-gray-500">Belum ada mutasi di periode ini.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-100 hover:bg-transparent">
                      <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Keterangan
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">Jumlah</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</TableHead>
                      <TableHead className="pr-5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">
                        {' '}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRows.map((row, idx) => {
                      const pem = Number(row.pemasukan ?? 0)
                      const peng = Number(row.pengeluaran ?? 0)
                      const isIn = pem > 0
                      const amount = isIn ? pem : peng
                      const label = row.description || row.account_name || 'Mutasi kas'
                      const initial = label.trim().charAt(0).toUpperCase() || '?'
                      const hue = ['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-pink-100 text-pink-700'][
                        idx % 3
                      ]
                      return (
                        <TableRow key={`${row.journal_number}-${row.date}-${idx}`} className="border-gray-50">
                          <TableCell className="pl-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                                  hue
                                )}
                              >
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900">{label}</p>
                                <p className="truncate font-mono text-xs text-gray-500">{row.journal_number}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDate(row.date)}</TableCell>
                          <TableCell className="text-sm font-semibold tabular-nums text-gray-900">
                            {isIn ? '+' : '−'}
                            {formatCurrency(amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success" className="font-medium">
                              Selesai
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to="/cash-book">Buka buku kas</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to="/journal-entries">Jurnal</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
              <div className="border-t border-gray-100 px-5 py-3 text-right">
                <Link
                  to="/cash-book"
                  className="text-sm font-medium text-[#1e3a8a] hover:text-[#1e40af]"
                >
                  Lihat semua mutasi →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet card */}
          <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#7c3aed] text-white shadow-lg shadow-blue-900/15 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-white/80">Kas & bank</p>
                  <p className="mt-1 text-lg font-bold tracking-tight">Sadji Solo</p>
                </div>
                <div className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider">KAS</div>
              </div>
              <div className="mt-6 rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                <p className="text-xs text-white/70">Saldo berjalan</p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                  {cashLoading ? '…' : formatCurrency(cashCurrent?.closing_balance ?? 0)}
                </p>
                <p className="mt-3 text-xs text-white/80 truncate">{user?.name ?? 'Pengguna'}</p>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-xs text-white/80">
                  <span>Penggunaan kas (bulan ini)</span>
                  <span className="tabular-nums">{spendingPct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${spendingPct}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-white/70 tabular-nums">
                  Keluar {formatCurrency(cashCurrent?.total_pengeluaran ?? 0)} · Masuk{' '}
                  {formatCurrency(cashCurrent?.total_pemasukan ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Aksi cepat</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  to: '/expenses/create',
                  label: 'Biaya',
                  icon: Send,
                  box: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
                },
                {
                  to: '/invoices/create',
                  label: 'Invoice',
                  icon: ArrowDownLeft,
                  box: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
                },
                {
                  to: '/invoices',
                  label: 'Penjualan',
                  icon: FileText,
                  box: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
                },
                {
                  to: '/reports',
                  label: 'Lainnya',
                  icon: LayoutGrid,
                  box: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
                },
              ].map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-sm border border-gray-100 transition-shadow hover:shadow-md"
                >
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl transition-colors', a.box)}>
                    <a.icon className="h-5 w-5" />
                  </div>
                  <span className="text-center text-[11px] font-semibold leading-tight text-gray-800">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Beban per kategori</h3>
                <p className="text-lg font-bold tabular-nums text-gray-900">{formatCurrency(exp)}</p>
              </div>
              <div className="mb-4 flex h-3 overflow-hidden rounded-full">
                {expenseBreakdown.items.map((item) => (
                  <div
                    key={item.label}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${(item.value / expenseBreakdown.total) * 100}%`,
                      backgroundColor: item.color,
                    }}
                    title={`${item.label}: ${formatCurrency(item.value)}`}
                  />
                ))}
              </div>
              <ul className="space-y-2.5">
                {expenseBreakdown.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-gray-700">{item.label}</span>
                    </div>
                    <span className="shrink-0 tabular-nums font-semibold text-gray-900">
                      {formatCurrency(item.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Link
            to="/reports"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 py-3 text-sm font-semibold text-[#1e3a8a] hover:bg-gray-100"
          >
            <ArrowUpRight className="h-4 w-4" />
            Buka laporan lengkap
          </Link>
        </div>
      </div>
    </div>
  )
}
