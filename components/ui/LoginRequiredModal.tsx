'use client'

import { MotusLoginModal } from '@/components/auth/MotusLoginModal'

interface LoginRequiredModalProps {
  isOpen: boolean
  onClose: () => void
}

/** @deprecated name kept for call sites — UI lives in MotusLoginModal */
export function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  return (
    <MotusLoginModal isOpen={isOpen} onClose={onClose} location="login_required" />
  )
}