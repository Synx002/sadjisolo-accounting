import { useLayoutEffect } from 'react'
import { useLayoutPage } from '@/components/layout/LayoutPageContext'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  const { setLayoutPage } = useLayoutPage()

  useLayoutEffect(() => {
    setLayoutPage({ title, description })
    return () => setLayoutPage(null)
  }, [title, description, setLayoutPage])

  if (!action) return null

  return (
    <div className="flex justify-end mb-6">
      <div>{action}</div>
    </div>
  )
}
