'use client'

import { useEffect, useRef, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { Loader, QrCode, X } from 'lucide-react'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (errorMessage: string) => void
  onClose: () => void
}

type Html5QrcodeScannerRef = {
  stop: () => Promise<void> | void
  clear: () => Promise<void> | void
} | null

const SCAN_AREA_ID = 'motusdao-qr-scan-area'

export default function QRScanner({ onScanSuccess, onScanError, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScannerRef>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const initScanner = async () => {
      try {
        if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Este dispositivo o navegador no soporta acceso a la cámara.')
        }

        // Comprobar permiso de cámara
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        stream.getTracks().forEach(track => track.stop())
        if (!isMounted) return
        setHasPermission(true)

        const { Html5Qrcode } = await import('html5-qrcode')
        if (!isMounted) return

        const html5QrCode = new Html5Qrcode(SCAN_AREA_ID)
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1
          },
          (decodedText: string) => {
            onScanSuccess(decodedText)
            stopScanner()
          },
          (scanError: string) => {
            if (onScanError) onScanError(scanError)
          }
        )
      } catch (err) {
        console.error('Error inicializando QR scanner:', err)
        if (!isMounted) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo iniciar el escáner QR. Revisa los permisos de cámara.'
        )
        setHasPermission(false)
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
          await scannerRef.current.clear()
        } catch (err) {
          console.warn('Error deteniendo QR scanner:', err)
        } finally {
          scannerRef.current = null
        }
      }
    }

    initScanner()

    return () => {
      isMounted = false
      stopScanner()
    }
  }, [onScanSuccess, onScanError])

  const handleClose = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <GlassCard variant="strong" className="w-full max-w-md mx-4 p-6 relative">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar escáner QR"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-mauve-500 to-iris-500 flex items-center justify-center mr-3">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Escanear código QR</h2>
              <p className="text-xs text-muted-foreground">
                Apunta la cámara al código QR de la wallet o solicitud de pago.
              </p>
            </div>
          </div>

          {isInitializing && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-mauve-500 mb-3" />
              <p className="text-xs text-muted-foreground text-center">
                Activando cámara y preparando el escáner...
              </p>
            </div>
          )}

          {!isInitializing && hasPermission === false && (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-sm text-red-400 mb-2 text-center">
                No se pudo acceder a la cámara.
              </p>
              <p className="text-xs text-muted-foreground text-center mb-4">
                Revisa los permisos del navegador y vuelve a intentarlo.
              </p>
              <CTAButton size="sm" variant="secondary" onClick={handleClose}>
                Cerrar
              </CTAButton>
            </div>
          )}

          <div className="w-full flex flex-col items-center mt-2">
            <div
              id={SCAN_AREA_ID}
              className="w-full max-w-xs aspect-square rounded-xl border border-white/15 overflow-hidden bg-black/40"
            />
            {error && (
              <p className="mt-3 text-xs text-red-400 text-center">
                {error}
              </p>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              Tus datos de cámara se procesan localmente en tu dispositivo; solo se extrae el
              texto del código QR.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}


