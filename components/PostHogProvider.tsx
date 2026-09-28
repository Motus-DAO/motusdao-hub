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
      // Capture after register so `site` is on the first $pageview.
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: true,
      loaded: (client) => {
        client.register({ site: SITE })
        client.capture('$pageview')
      },
    })
    initialized = true
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
