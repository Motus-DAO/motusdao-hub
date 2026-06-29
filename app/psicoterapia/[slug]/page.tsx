import { TherapistProfileView } from '@/components/psicoterapia/TherapistProfileView'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function TherapistProfilePage({ params }: PageProps) {
  const { slug } = await params
  return <TherapistProfileView slug={slug} />
}
