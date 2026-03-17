'use client'

import { useState } from 'react'
import { motusNameService } from '@/lib/motus-name-service'
import { getCeloExplorerUrl } from '@/lib/celo'
import type { Address } from 'viem'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { getPrimaryWallet } from '@/lib/wallet-utils'
import { sendCELOPayment } from '@/lib/payments'

interface SendWithMotusNameProps {
  onSuccess?: () => void
}

export default function SendWithMotusName({ onSuccess }: SendWithMotusNameProps = {}) {
  const { authenticated } = useWaaP()
  const { wallets } = useWaaPWallets()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<Address | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handleRecipientChange = async (value: string) => {
    setRecipient(value)
    setError(null)
    setResolvedAddress(null)
    setDisplayName(null)
    setResult(null)
    setTxHash(null)
    
    if (!value) return
    
    setIsResolving(true)
    
    try {
      const resolved = await motusNameService.resolveInput(value)
      
      if (resolved.type === 'invalid') {
        setError('Formato inválido. Usa una dirección 0x... o un nombre .motus')
      } else if (resolved.address) {
        setResolvedAddress(resolved.address)
        setDisplayName(resolved.displayName || null)
      } else if (resolved.type === 'name') {
        setError(`El nombre "${value}" no está registrado en Motus Name Service`)
      }
    } catch {
      setError('Error al resolver el destinatario')
    } finally {
      setIsResolving(false)
    }
  }

  const handleSend = async () => {
    if (!authenticated) {
      setError('Necesitas iniciar sesión para enviar pagos')
      return
    }

    const primaryWallet = getPrimaryWallet(wallets || [])
    if (!primaryWallet) {
      setError('No se encontró una WaaP wallet. Inicia sesión para obtener una.')
      return
    }

    if (!resolvedAddress || !amount) {
      setError('Por favor completa todos los campos')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Monto inválido')
      return
    }

    setIsSending(true)
    setError(null)
    setResult('🔄 Enviando transacción...')

    try {
      const response = await sendCELOPayment(
        primaryWallet,
        {
          from: primaryWallet.address,
          to: resolvedAddress,
          amount: amount,
          currency: 'CELO',
        },
        wallets,
      )

      if (response.success) {
        setResult('✅ Transacción exitosa!')
        setTxHash(response.transactionHash || null)
        setRecipient('')
        setAmount('')
        setResolvedAddress(null)
        setDisplayName(null)
        onSuccess?.()
      } else {
        setError(`Error: ${response.error}`)
        setResult(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setResult(null)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        💸 Enviar CELO
      </h2>

      {/* Campo Destinatario */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Destinatario
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => handleRecipientChange(e.target.value)}
          placeholder="nombre.motus o 0x..."
          disabled={isSending}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Puedes usar un nombre .motus o una dirección completa
        </p>
        
        {isResolving && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
            🔍 Resolviendo destinatario...
          </p>
        )}
        
        {resolvedAddress && !isResolving && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-1">
              ✅ Destinatario encontrado
            </p>
            {displayName && (
              <p className="text-sm text-green-700 dark:text-green-400 mb-1">
                📛 {displayName}
              </p>
            )}
            <p className="text-xs font-mono text-green-600 dark:text-green-500 break-all">
              {resolvedAddress}
            </p>
          </div>
        )}
      </div>

      {/* Campo Monto */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Monto (CELO)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          disabled={isSending}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Botón Enviar */}
      <button
        onClick={handleSend}
        disabled={!resolvedAddress || !amount || isSending}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg 
                 font-semibold shadow-lg hover:shadow-xl
                 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                 hover:from-blue-700 hover:to-purple-700 transition-all duration-200
                 disabled:opacity-50"
      >
        {isSending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Enviando...
          </span>
        ) : (
          'Enviar'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">
            ❌ {error}
          </p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className={`mt-4 p-3 rounded-lg ${
          result.startsWith('✅')
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }`}>
          <p className={`text-sm font-medium ${
            result.startsWith('✅')
              ? 'text-green-800 dark:text-green-300'
              : 'text-blue-800 dark:text-blue-300'
          }`}>
            {result}
          </p>
          {txHash && (
            <a
              href={getCeloExplorerUrl(txHash, 'tx')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline mt-2 block hover:text-green-600 dark:hover:text-green-400"
            >
              Ver transacción en explorador →
            </a>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-300">
          💡 Ventajas de usar nombres .motus
        </h3>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>✅ Fácil de recordar y compartir</li>
          <li>✅ No necesitas copiar direcciones largas</li>
          <li>✅ Experiencia de usuario simplificada</li>
          <li>✅ Verificación automática del destinatario</li>
        </ul>
      </div>
    </div>
  )
}




