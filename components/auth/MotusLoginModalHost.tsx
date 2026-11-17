'use client'

import { useEffect } from 'react'
import { MotusLoginModal } from '@/components/auth/MotusLoginModal'
import { useUIStore } from '@/lib/store'
import { useWalletContext } from '@/lib/wallet/WalletContext'

/**
 * Single app-wide login entry — Safari routes default to Thirdweb in the modal.
 */
export function MotusLoginModalHost() {
  const open = useUIStore((s) => s.loginModalOpen)
  const location = useUIStore((s) => s.loginModalLocation)
  const closeLoginModal = useUIStore((s) => s.closeLoginModal)
  const completeLoginModal = useUIStore((s) => s.completeLoginModal)
  const { authenticated } = useWalletContext()

  useEffect(() => {
    if (open && authenticated) {
      completeLoginModal()
    }
  }, [authenticated, completeLoginModal, open])

  const handleClose = () => {
    if (authenticated) {
      completeLoginModal()
      return
    }
    closeLoginModal('cancelled')
  }

  return (
    <MotusLoginModal
      isOpen={open}
      onClose={handleClose}
      location={location}
    />
  )
}