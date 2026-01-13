'use client'

import { useState, useEffect } from 'react'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'
import { useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { motusNameService, MNS_CONTRACT_ADDRESS } from '@/lib/motus-name-service'
import { getCeloExplorerUrl } from '@/lib/celo'
import type { Address } from 'viem'

export default function MotusNamesPage() {
  const { kernelClient, smartAccountAddress, isInitializing } = useSmartAccount()
  const { wallets } = useWaaPWallets()
  const [name, setName] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [price, setPrice] = useState<string>('5')
  const [totalSupply, setTotalSupply] = useState<number>(0)
  const [myName, setMyName] = useState<string | null>(null)
  
  // Estado para detectar discrepancia de direcciones
  const [registeredAddress, setRegisteredAddress] = useState<Address | null>(null)
  const [hasAddressMismatch, setHasAddressMismatch] = useState(false)
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)
  const [updateResult, setUpdateResult] = useState<string | null>(null)
  const [nftOwner, setNftOwner] = useState<Address | null>(null)
  const [canUpdateAddress, setCanUpdateAddress] = useState(false)

  // Cargar precio y total de nombres registrados
  useEffect(() => {
    const loadInfo = async () => {
      const [priceResult, totalResult] = await Promise.all([
        motusNameService.getRegistrationPrice(),
        motusNameService.getTotalSupply()
      ])
      setPrice(priceResult)
      setTotalSupply(totalResult)
    }
    loadInfo()
  }, [])

  // Buscar mi nombre y verificar discrepancia de direcciones
  useEffect(() => {
    const loadMyNameAndCheckMismatch = async () => {
      if (!smartAccountAddress) {
        setMyName(null)
        setRegisteredAddress(null)
        setHasAddressMismatch(false)
        setNftOwner(null)
        setCanUpdateAddress(false)
        return
      }
      
      // Buscar nombre asociado a la smart wallet actual
      const nameFromWallet = await motusNameService.reverseLookup(smartAccountAddress)
      setMyName(nameFromWallet)
      
      // Si tiene nombre, verificar la información completa
      if (nameFromWallet) {
        const addressFromName = await motusNameService.resolve(nameFromWallet)
        setRegisteredAddress(addressFromName)
        
        // Verificar si hay discrepancia
        const mismatch = addressFromName?.toLowerCase() !== smartAccountAddress.toLowerCase()
        setHasAddressMismatch(mismatch)
        
        // Verificar el dueño del NFT usando el API de debug
        try {
          const response = await fetch(`/api/debug/wallets?name=${nameFromWallet}&address=${smartAccountAddress}`)
          if (response.ok) {
            const data = await response.json()
            setNftOwner(data.analysis?.nftOwner as Address || null)
            setCanUpdateAddress(data.analysis?.currentWalletOwnsNFT || false)
            
            console.log('📊 MNS Debug:', {
              name: nameFromWallet,
              registeredAddress: addressFromName,
              currentSmartWallet: smartAccountAddress,
              nftOwner: data.analysis?.nftOwner,
              canUpdate: data.analysis?.currentWalletOwnsNFT,
            })
          }
        } catch (err) {
          console.error('Error fetching NFT owner info:', err)
        }
        
        if (mismatch) {
          console.log('⚠️ Address mismatch detected:', {
            registeredAddress: addressFromName,
            currentSmartWallet: smartAccountAddress,
          })
        }
      }
    }
    loadMyNameAndCheckMismatch()
  }, [smartAccountAddress])

  const checkAvailability = async (inputName: string) => {
    if (!inputName) {
      setIsAvailable(null)
      setIsValid(null)
      return
    }
    
    setIsChecking(true)
    
    // Validar formato localmente
    const valid = motusNameService.isValidNameFormat(inputName)
    setIsValid(valid)
    
    if (valid) {
      // Verificar disponibilidad en el contrato
      const available = await motusNameService.isAvailable(inputName)
      setIsAvailable(available)
    } else {
      setIsAvailable(null)
    }
    
    setIsChecking(false)
  }

  const handleNameChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setName(normalized)
    setResult(null)
    setTxHash(null)
    checkAvailability(normalized)
  }

  const handleRegister = async () => {
    if (!kernelClient || !smartAccountAddress || !name) {
      setResult('❌ Por favor conecta tu wallet primero')
      return
    }

    if (!isAvailable || !isValid) {
      setResult('❌ El nombre no está disponible o no es válido')
      return
    }
    
    setIsRegistering(true)
    setResult('🔄 Preparando transacciones...')
    setTxHash(null)
    
    const response = await motusNameService.registerName(
      kernelClient,
      name,
      smartAccountAddress
    )
    
    if (response.success) {
      setResult('✅ ¡Nombre registrado exitosamente!')
      setTxHash(response.txHash || null)
      setName('')
      setIsAvailable(null)
      setIsValid(null)
      
      // Actualizar total supply
      const newTotal = await motusNameService.getTotalSupply()
      setTotalSupply(newTotal)
      
      // Actualizar mi nombre
      setMyName(name)
      setRegisteredAddress(smartAccountAddress as Address)
      setHasAddressMismatch(false)
    } else {
      setResult(`❌ Error: ${response.error}`)
    }
    
    setIsRegistering(false)
  }
  
  // Función para actualizar la dirección del nombre .motus
  const handleUpdateAddress = async () => {
    if (!kernelClient || !smartAccountAddress || !myName) {
      setUpdateResult('❌ Por favor conecta tu wallet primero')
      return
    }
    
    setIsUpdatingAddress(true)
    setUpdateResult('🔄 Actualizando dirección del nombre...')
    
    try {
      // Llamar a updateNameAddress en el contrato
      const { encodeFunctionData } = await import('viem')
      
      const data = encodeFunctionData({
        abi: [{
          name: 'updateNameAddress',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'name', type: 'string' },
            { name: 'newAddress', type: 'address' }
          ],
          outputs: []
        }],
        functionName: 'updateNameAddress',
        args: [myName, smartAccountAddress as Address]
      })
      
      const userOpHash = await kernelClient.sendUserOperation({
        calls: [{
          to: MNS_CONTRACT_ADDRESS,
          value: BigInt(0),
          data: data as `0x${string}`
        }]
      })
      
      console.log('📝 Update address tx sent:', userOpHash)
      
      const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOpHash })
      const hash = receipt?.receipt?.transactionHash
      
      setUpdateResult('✅ ¡Dirección actualizada exitosamente!')
      setRegisteredAddress(smartAccountAddress as Address)
      setHasAddressMismatch(false)
      setTxHash(hash || null)
      
    } catch (error) {
      console.error('Error updating address:', error)
      setUpdateResult(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsUpdatingAddress(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Motus Name Service
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
            Tu identidad descentralizada en MotusDAO
          </p>
          <p className="text-sm text-gray-500">
            {totalSupply} nombre{totalSupply !== 1 ? 's' : ''} registrado{totalSupply !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Mi Nombre Actual */}
        {myName && (
          <div className={`mb-8 p-6 rounded-xl border ${
            hasAddressMismatch 
              ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-300 dark:border-red-800'
              : 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tu nombre actual:</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {myName}.motus
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Smart Wallet actual:</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
                  {smartAccountAddress?.slice(0, 6)}...{smartAccountAddress?.slice(-4)}
                </p>
              </div>
            </div>
            
            {/* Alerta de discrepancia */}
            {hasAddressMismatch && registeredAddress && (
              <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-700">
                <h4 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2">
                  ⚠️ ¡Discrepancia de Direcciones Detectada!
                </h4>
                <div className="text-xs text-red-700 dark:text-red-400 space-y-2">
                  <p>
                    <strong>Problema:</strong> Tu nombre <span className="font-mono">{myName}.motus</span> apunta a una dirección diferente.
                  </p>
                  <div className="grid grid-cols-1 gap-2 mt-3 p-3 bg-white/50 dark:bg-black/20 rounded">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Dirección registrada (recibe fondos):</span>
                      <p className="font-mono text-xs break-all text-red-800 dark:text-red-300">
                        {registeredAddress}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Tu smart wallet actual:</span>
                      <p className="font-mono text-xs break-all text-green-800 dark:text-green-300">
                        {smartAccountAddress}
                      </p>
                    </div>
                    {nftOwner && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Dueño del NFT (puede actualizar):</span>
                        <p className="font-mono text-xs break-all text-purple-800 dark:text-purple-300">
                          {nftOwner}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="mt-3">
                    <strong>Consecuencia:</strong> Si alguien te envía fondos a <span className="font-mono">{myName}.motus</span>, 
                    llegarán a la dirección registrada, no a tu smart wallet actual.
                  </p>
                </div>
                
                {/* Mostrar si puede o no actualizar */}
                {canUpdateAddress ? (
                  <>
                    <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-800 dark:text-green-300">
                      ✅ Tu smart wallet actual es la dueña del NFT. Puedes actualizar la dirección.
                    </div>
                    
                    {/* Botón para actualizar dirección */}
                    <button
                      onClick={handleUpdateAddress}
                      disabled={isUpdatingAddress || !kernelClient}
                      className="mt-4 w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-lg 
                               font-semibold shadow-lg hover:shadow-xl
                               disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                               hover:from-red-700 hover:to-orange-700 transition-all duration-200
                               disabled:opacity-50"
                    >
                      {isUpdatingAddress ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⏳</span>
                          Actualizando...
                        </span>
                      ) : (
                        '🔄 Actualizar dirección a mi Smart Wallet actual'
                      )}
                    </button>
                  </>
                ) : (
                  <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-300 dark:border-yellow-700">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300 font-semibold mb-2">
                      ❌ No puedes actualizar desde esta wallet
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
                      Tu smart wallet actual NO es la dueña del NFT. Solo el dueño del NFT puede actualizar la dirección.
                    </p>
                    <div className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                      <p><strong>Opciones:</strong></p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Usa la wallet que registró el nombre para actualizar</li>
                        <li>Transfiere el NFT desde la wallet antigua a la actual</li>
                        <li>Registra un nuevo nombre con tu wallet actual</li>
                      </ul>
                    </div>
                    {nftOwner && (
                      <div className="mt-3">
                        <a
                          href={`https://explorer.celo.org/mainnet/address/${nftOwner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline text-yellow-700 dark:text-yellow-400"
                        >
                          Ver wallet dueña del NFT en Celo Explorer →
                        </a>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Resultado de la actualización */}
                {updateResult && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    updateResult.startsWith('✅')
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : updateResult.startsWith('🔄')
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                      : 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-200'
                  }`}>
                    <p className="text-sm">{updateResult}</p>
                    {txHash && updateResult.startsWith('✅') && (
                      <a
                        href={getCeloExplorerUrl(txHash, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline mt-1 block"
                      >
                        Ver transacción →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Formulario de Registro */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">
            {myName ? 'Registra otro nombre' : 'Registra tu nombre'}
          </h2>

          {/* Input de Nombre */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
              Elige tu nombre único
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="tunombre"
                maxLength={32}
                disabled={isRegistering}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="flex items-center px-4 py-3 bg-gray-100 dark:bg-gray-700 
                             text-gray-700 dark:text-gray-300 rounded-lg font-medium">
                .motus
              </span>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Solo letras minúsculas, números y guiones (máximo 32 caracteres)
            </p>
            
            {/* Estado de Validación */}
            {name && (
              <div className="mt-3">
                {isChecking && (
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    🔍 Verificando disponibilidad...
                  </p>
                )}
                
                {!isChecking && isValid === false && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ❌ Formato inválido
                  </p>
                )}
                
                {!isChecking && isValid === true && isAvailable === true && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✅ Disponible
                  </p>
                )}
                
                {!isChecking && isValid === true && isAvailable === false && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ❌ No disponible
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info de Smart Wallet */}
          {smartAccountAddress && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-300">
                📍 Tu Smart Wallet
              </h3>
              <p className="text-xs font-mono break-all text-blue-700 dark:text-blue-400">
                {smartAccountAddress}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                El nombre apuntará a esta dirección
              </p>
            </div>
          )}

          {/* Estado de Conexión */}
          {!smartAccountAddress && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                {isInitializing 
                  ? '⏳ Inicializando smart wallet...'
                  : '⚠️ Por favor conecta tu wallet para continuar'
                }
              </p>
            </div>
          )}

          {/* Botón de Registro */}
          <button
            onClick={handleRegister}
            disabled={!isAvailable || !isValid || isRegistering || !kernelClient || isInitializing}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg 
                     font-semibold text-lg shadow-lg hover:shadow-xl
                     disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                     hover:from-blue-700 hover:to-purple-700 transition-all duration-200
                     disabled:opacity-50"
          >
            {isRegistering ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Registrando...
              </span>
            ) : (
              `Registrar Nombre (${price} cUSD)`
            )}
          </button>

          {/* Resultado */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.startsWith('✅') 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                : result.startsWith('🔄')
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}>
              <p className="font-medium">{result}</p>
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
        </div>

        {/* Información Adicional */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              🎯 ¿Qué es .motus?
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>✅ Identidad legible en lugar de direcciones complejas</li>
              <li>✅ NFT transferible que puedes vender o regalar</li>
              <li>✅ Personalizable con avatar y bio</li>
              <li>✅ Compatible con todos los servicios de MotusDAO</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              💎 Ventajas
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>⚡ Transacciones gasless (sin fees)</li>
              <li>🔒 Registro permanente on-chain</li>
              <li>🎨 Metadata customizable</li>
              <li>💸 Precio fijo: {price} cUSD</li>
            </ul>
          </div>
        </div>

        {/* Debug: Información técnica de wallets */}
        {wallets && wallets.length > 0 && (
          <div className="mt-8 bg-gray-100 dark:bg-gray-900 rounded-xl p-6 border border-gray-300 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-300 flex items-center">
              🔧 Debug: Información de Wallets
              <span className="ml-2 text-xs font-normal text-gray-500">(para diagnóstico)</span>
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-1">EOA (WaaP Wallet):</p>
                <p className="font-mono text-gray-900 dark:text-gray-100 break-all">
                  {wallets.find(w => w.walletClientType === 'waap')?.address || wallets[0]?.address || 'No encontrada'}
                </p>
                <p className="text-yellow-600 dark:text-yellow-400 mt-1 text-[10px]">
                  ⚠️ Esta es la &quot;semilla&quot; que genera tu smart wallet. Si cambia, tu smart wallet cambia.
                </p>
              </div>
              
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-1">Smart Wallet (ZeroDev Kernel):</p>
                <p className="font-mono text-gray-900 dark:text-gray-100 break-all">
                  {smartAccountAddress || 'Inicializando...'}
                </p>
                <p className="text-blue-600 dark:text-blue-400 mt-1 text-[10px]">
                  Esta es tu dirección para recibir y enviar fondos.
                </p>
              </div>
              
              {wallets.filter(w => w.walletClientType === 'external').length > 0 && (
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Otras wallets conectadas:</p>
                  {wallets.filter(w => w.walletClientType === 'external').map((w, i) => (
                    <p key={i} className="font-mono text-gray-900 dark:text-gray-100 break-all">
                      {w.address} <span className="text-gray-500">({w.walletClientType})</span>
                    </p>
                  ))}
                </div>
              )}
              
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <p className="text-purple-800 dark:text-purple-300 text-[11px]">
                  <strong>💡 Tip:</strong> Si tu smart wallet cambia entre sesiones, el problema está en que 
                  Privy te asigna diferentes EOAs. Contacta al soporte de Privy o verifica tu configuración.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




