import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Receipt,
  Package,
  Building2,
  BarChart3,
  BookOpen,
  BookMarked,
  LogOut,
  X,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'
import { LayoutPageProvider, useLayoutPage } from '@/components/layout/LayoutPageContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { to: '/dashboard',      label: 'Dashboard', icon: LayoutDashboard },
  { to: '/invoices',       label: 'Invoice',   icon: FileText },
  { to: '/purchase-bills', label: 'Pembelian', icon: ShoppingCart },
  { to: '/expenses',       label: 'Biaya',     icon: Receipt },
  { to: '/inventory',      label: 'Inventori', icon: Package },
  { to: '/fixed-assets',   label: 'Aset Tetap',icon: Building2 },
  { to: '/cash-book',      label: 'Buku Kas',  icon: BookMarked },
  { to: '/reports',        label: 'Laporan',   icon: BarChart3 },
  { to: '/journal-entries',label: 'Jurnal',    icon: BookOpen },
]

// First 4 items shown directly in bottom nav; the rest go in "More" drawer
const BOTTOM_NAV_LIMIT = 4

// ─── Mobile bottom nav ────────────────────────────────────────────────────────

function MobileBottomNav() {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const primaryItems = navItems.slice(0, BOTTOM_NAV_LIMIT)
  const moreItems    = navItems.slice(BOTTOM_NAV_LIMIT)

  const isMoreActive = moreItems.some(item =>
    location.pathname.startsWith(item.to)
  )

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <ul className="flex items-stretch h-16">
          {primaryItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to)
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 h-full w-full',
                    'text-[10px] font-medium transition-colors',
                    active ? 'text-blue-600' : 'text-gray-500'
                  )}
                >
                  <span className={cn(
                    'flex items-center justify-center w-8 h-6 rounded-xl transition-colors',
                    active ? 'bg-blue-50' : ''
                  )}>
                    <Icon className={cn('w-5 h-5', active ? 'stroke-[2.2px]' : 'stroke-[1.6px]')} />
                  </span>
                  <span className="truncate max-w-[56px]">{label}</span>
                </Link>
              </li>
            )
          })}

          {/* "More" button */}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 h-full w-full',
                'text-[10px] font-medium transition-colors',
                isMoreActive ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              <span className={cn(
                'flex items-center justify-center w-8 h-6 rounded-xl transition-colors',
                isMoreActive ? 'bg-blue-50' : ''
              )}>
                <MoreHorizontal className={cn('w-5 h-5', isMoreActive ? 'stroke-[2.2px]' : 'stroke-[1.6px]')} />
              </span>
              <span>Lainnya</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* "More" drawer overlay */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-xl safe-area-inset-bottom">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-semibold text-gray-700">Menu Lainnya</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="px-3 pb-6 grid grid-cols-1 gap-1">
              {moreItems.map(({ to, label, icon: Icon }) => {
                const active = location.pathname.startsWith(to)
                return (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {active && <ChevronRight className="w-4 h-4 opacity-40" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function AppHeader() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { title, description } = useLayoutPage()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      logout()
      navigate('/login')
    }
  }

  const displayTitle = title.trim() || 'Sadji Solo Accounting'

  return (
    <header className="h-auto min-h-14 shrink-0 flex items-center gap-3 px-4 py-2.5">
      {/* Mobile: show app logo instead of hamburger */}
      <div className="lg:hidden flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-gray-900 truncate leading-tight">{displayTitle}</h1>
          {description ? (
            <p className="text-xs text-gray-500 truncate">{description}</p>
          ) : null}
        </div>
      </div>

      {/* Desktop: page title */}
      <div className="hidden lg:block flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 truncate leading-tight">{displayTitle}</h1>
        {description ? (
          <p className="text-xs text-gray-500 truncate mt-0.5">{description}</p>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2 py-1.5',
              'text-left outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block min-w-0 max-w-[140px]">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-0.5">
              <span className="text-sm font-medium text-gray-900 truncate">{user?.name}</span>
              <span className="text-xs text-gray-500 truncate">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
            onSelect={(e) => {
              e.preventDefault()
              void handleLogout()
            }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200">
        <div className="flex items-center gap-2 h-16 px-5 border-b border-gray-200">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm truncate">Sadji Solo Accounting</span>

          
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = location.pathname.startsWith(to)
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <LayoutPageProvider>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader />

          {/*
            pb-16 on mobile so content doesn't hide behind the bottom nav bar.
            On desktop (lg:) no extra padding needed.
          */}
          <main className="flex-1 overflow-y-auto p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </LayoutPageProvider>
    </div>
  )
}