import { requirePsmPage } from '@/lib/auth/role-guards'

export default async function CobrosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePsmPage()
  return <>{children}</>
}
