import { useLayoutEffect } from 'react'
import { useLayoutPage } from '@/components/layout/LayoutPageContext'

interface PageHeaderProps {
  title: string
  description?: string
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  const { setLayoutPage } = useLayoutPage()

  useLayoutEffect(() => {
    setLayoutPage({ title, description })
    return () => setLayoutPage(null)
  }, [title, description, setLayoutPage])

  return null
}
