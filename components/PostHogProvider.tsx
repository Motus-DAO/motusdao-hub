'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

const SITE = 'hub'

let initialized = false

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    if (!token || initialized) return

    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      defaults: '2026-05-30',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      // Keep free-tier quota for analytics; enable later if needed.
      disable_session_recording: true,
    })
    posthog.register({ site: SITE })
    initialized = true
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
