import { requirePsmPage } from '@/lib/auth/role-guards'

export default async function DepositosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePsmPage()
  return <>{children}</>
}
