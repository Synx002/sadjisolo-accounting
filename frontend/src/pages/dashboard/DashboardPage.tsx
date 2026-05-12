import { useQuery } from '@tanstack/react-query'
import { FileText, ShoppingCart, Receipt, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Link } from 'react-router-dom'
import { reportsApi } from '@/api/reports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import { formatCurrency } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'

const today = new Date()
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const endOfMonth = today.toISOString().split('T')[0]

export default function DashboardPage() {
  const { data: income, isLoading } = useQuery({
    queryKey: ['income-statement', startOfMonth, endOfMonth],
    queryFn: () => reportsApi.incomeStatement(startOfMonth, endOfMonth).then((r) => r.data),
  })

  const shortcuts = [
    { to: '/invoices', label: 'Invoice', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { to: '/purchase-bills', label: 'Pembelian', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
    { to: '/expenses', label: 'Biaya', icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-50' },
    { to: '/reports', label: 'Laporan', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Ringkasan bulan ${today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
      />

      {/* Summary cards */}
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Total Pendapatan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(income?.revenue.total_revenue ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Total Beban
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(income?.expense.total_expense ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card className={income?.is_profit ? 'border-green-200' : 'border-red-200'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <DollarSign className={`w-4 h-4 ${income?.is_profit ? 'text-green-600' : 'text-red-600'}`} />
                Laba / Rugi Bersih
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${income?.is_profit ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(income?.net_income ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shortcuts */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Menu Cepat</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {shortcuts.map(({ to, label, icon: Icon, color, bg }) => (
          <Link key={to} to={to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
