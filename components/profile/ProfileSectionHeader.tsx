'use client'

import { getProfileSection, type ProfileSectionId } from '@/lib/profile-settings-sections'

export function ProfileSectionHeader({ sectionId }: { sectionId: ProfileSectionId }) {
  const def = getProfileSection(sectionId)
  if (!def) return null

  return (
    <header className="mb-6">
      <h2 className="text-2xl font-bold">{def.label}</h2>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">{def.description}</p>
    </header>
  )
}