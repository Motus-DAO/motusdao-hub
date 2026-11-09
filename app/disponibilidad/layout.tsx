import { requirePsmPage } from '@/lib/auth/role-guards'

export default async function DisponibilidadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePsmPage()
  return <>{children}</>
}
