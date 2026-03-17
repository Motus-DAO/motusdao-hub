import { createPublicClient, http, type Address, encodeFunctionData, parseUnits } from 'viem'
import { celoMainnet, CELO_STABLE_TOKENS } from './celo'
import type { KernelAccountClient } from '@zerodev/sdk'

// ✅ Contrato deployado en Celo Mainnet
// Deploy: Jan 4, 2026
// Explorer: https://explorer.celo.org/mainnet/address/0x4eB280b21de012FCAe14c9aB2D29b298c0A91d1c
export const MNS_CONTRACT_ADDRESS = '0x4eB280b21de012FCAe14c9aB2D29b298c0A91d1c' as const

// ABI del contrato Motus Name Service
export const MNS_ABI = [
  {
    name: 'registerName',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'targetAddress', type: 'address' }
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }]
  },
  {
    name: 'resolve',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    name: 'reverseLookup',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'string' }]
  },
  {
    name: 'isAvailable',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'registrationPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'updateMetadata',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'avatar', type: 'string' },
      { name: 'bio', type: 'string' },
      { name: 'twitter', type: 'string' },
      { name: 'discord', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'nameMetadata',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'avatar', type: 'string' },
        { name: 'bio', type: 'string' },
        { name: 'twitter', type: 'string' },
        { name: 'discord', type: 'string' },
        { name: 'registeredAt', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' }
      ]
    }]
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'isValidName',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'setPrimaryName',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: []
  },
  {
    name: 'updateNameAddress',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'newAddress', type: 'address' }
    ],
    outputs: []
  }
] as const

// Token cUSD ABI (solo lo necesario para approve)
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

export interface NameMetadata {
  avatar: string
  bio: string
  twitter: string
  discord: string
  registeredAt: bigint
  expiresAt: bigint
}

/**
 * Motus Name Service - Servicio de nombres descentralizado (.motus)
 * 
 * Permite registrar nombres legibles que apuntan a direcciones de smart wallets.
 * Los nombres son NFTs transferibles con metadata customizable.
 */
export class MotusNameService {
  private publicClient

  constructor() {
    this.publicClient = createPublicClient({
      chain: celoMainnet,
      transport: http('https://forno.celo.org'),
    })
  }

  /**
   * Verifica si el contrato está deployado
   */
  isDeployed(): boolean {
    // Always true since MNS_CONTRACT_ADDRESS is set to the deployed address
    return Boolean(MNS_CONTRACT_ADDRESS && MNS_CONTRACT_ADDRESS.length === 42)
  }

  /**
   * Resuelve un nombre .motus a una dirección
   * @param name - Nombre a resolver (con o sin .motus)
   * @returns Dirección asociada o null si no existe
   */
  async resolve(name: string): Promise<Address | null> {
    try {
      if (!this.isDeployed()) {
        console.warn('⚠️ MNS contract not deployed yet')
        return null
      }

      const normalizedName = name.replace('.motus', '')
      
      const address = await this.publicClient.readContract({
        address: MNS_CONTRACT_ADDRESS,
        abi: MNS_ABI,
        functionName: 'resolve',
        args: [normalizedName],
      }) as Address
      
      // Si devuelve la dirección cero, el nombre no está registrado
      if (address === '0x0000000000000000000000000000000000000000') {
        return null
      }
      
      return address
    } catch (error) {
      console.error('Error resolving name:', error)
      return null
    }
  }

  /**
   * Lookup inverso: dirección a nombre principal
   * @param address - Dirección a resolver
   * @returns Nombre principal asociado o null
   */
  async reverseLookup(address: Address): Promise<string | null> {
    try {
      if (!this.isDeployed()) {
        console.warn('⚠️ MNS contract not deployed yet')
        return null
      }

      const name = await this.publicClient.readContract({
        address: MNS_CONTRACT_ADDRESS,
        abi: MNS_ABI,
        functionName: 'reverseLookup',
        args: [address],
      }) as string
      
      return name || null
    } catch (error) {
      console.error('Error in reverse lookup:', error)
      return null
    }
  }

  /**
   * Verifica si un nombre está disponible para registro
   * @param name - Nombre a verificar (sin .motus)
   * @returns true si está disponible
   */
  async isAvailable(name: string): Promise<boolean> {
    try {
      if (!this.isDeployed()) {
        console.warn('⚠️ MNS contract not deployed yet')
        return false
      }

      const normalizedName = name.replace('.motus', '')
      
      const available = await this.publicClient.readContract({
        address: MNS_CONTRACT_ADDRESS,
        abi: MNS_ABI,
        functionName: 'isAvailable',
        args: [normalizedName],
      }) as boolean
      
      return available
    } catch (error) {
      console.error('Error checking availability:', error)
      return false
    }
  }

  /**
   * Obtiene el precio de registro en cUSD
   * @returns Precio en formato legible (ej: "5")
   */
  async getRegistrationPrice(): Promise<string> {
    try {
      if (!this.isDeployed()) {
        return '5' // Default price
      }

      const price = await this.publicClient.readContract({
        address: MNS_CONTRACT_ADDRESS,
        abi: MNS_ABI,
        functionName: 'registrationPrice',
      }) as bigint
      
      // Convertir de wei a cUSD legible
      return (Number(price) / 10**18).toString()
    } catch (error) {
      console.error('Error getting price:', error)
      return '5' // Default price
    }
  }

  /**
   * Obtiene el total de nombres registrados
   */
  async getTotalSupply(): Promise<number> {
    try {
      if (!this.isDeployed()) {
        return 0
      }

      const total = await this.publicClient.readContract({
        address: MNS_CONTRACT_ADDRESS,
        abi: MNS_ABI,
        functionName: 'totalSupply',
      }) as bigint
      
      return Number(total)
    } catch (error) {
      console.error('Error getting total supply:', error)
      return 0
    }
  }

  /**
   * Valida el formato de un nombre localmente
   * @param name - Nombre a validar
   * @returns true si el formato es válido
   */
  isValidNameFormat(name: string): boolean {
    const normalized = name.replace('.motus', '')
    // Solo letras minúsculas, números y guiones
    return /^[a-z0-9-]+$/.test(normalized) && normalized.length > 0 && normalized.length <= 32
  }

  /**
   * Valida nombre usando el contrato (más estricto)
   */
  async isValidName(name: string): Promise<boolean> {
    try {
      if (!this.isDeployed()) {
        return this.isValidNameFormat(name)
      }

      const normalizedName = name.replace('.motus', '')
      
      const valid = await this.publicClient.readContract({
        address: MNS_CONTRACT_ADDRESS,
        abi: MNS_ABI,
        functionName: 'isValidName',
        args: [normalizedName],
      }) as boolean
      
      return valid
    } catch (error) {
      console.error('Error validating name:', error)
      return false
    }
  }

  /**
   * Registra un nombre .motus usando Smart Wallet (gasless)
   * @param kernelClient - Cliente de ZeroDev Kernel
   * @param name - Nombre a registrar (sin .motus)
   * @param targetAddress - Dirección a la que apuntará el nombre
   * @returns Resultado de la operación
   */
  async registerName(
    kernelClient: KernelAccountClient,
    name: string,
    targetAddress: Address
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (!this.isDeployed()) {
        return {
          success: false,
          error: 'MNS contract not deployed yet. Please update MNS_CONTRACT_ADDRESS in lib/motus-name-service.ts'
        }
      }

      const normalizedName = name.replace('.motus', '')
      
      // Validar nombre localmente primero
      if (!this.isValidNameFormat(normalizedName)) {
        return {
          success: false,
          error: 'Nombre inválido. Solo se permiten letras minúsculas, números y guiones (máximo 32 caracteres).'
        }
      }
      
      // Verificar disponibilidad
      const available = await this.isAvailable(normalizedName)
      if (!available) {
        return {
          success: false,
          error: 'Este nombre ya está registrado.'
        }
      }
      
      // Obtener precio
      const priceStr = await this.getRegistrationPrice()
      const price = parseUnits(priceStr, 18)
      
      console.log('📝 Registrando nombre .motus:', {
        name: normalizedName,
        targetAddress,
        price: priceStr + ' cUSD'
      })
      
      // FIX: Combinar approve + register en UNA sola transacción batched
      // Esto evita el problema de nonce desincronizado entre transacciones secuenciales
      // ZeroDev Kernel soporta múltiples calls en un solo sendUserOperation
      console.log('📝 Preparando transacción batched (approve + register)...')
      
      // Datos para aprobar cUSD
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [MNS_CONTRACT_ADDRESS, price]
      })
      
      // Datos para registrar el nombre
      const registerData = encodeFunctionData({
        abi: MNS_ABI,
        functionName: 'registerName',
        args: [normalizedName, targetAddress]
      })
      
      console.log('📝 Enviando transacción batched: approve cUSD + register nombre...')
      
      // Enviar AMBAS operaciones en una sola transacción
      const batchedHash = await kernelClient.sendUserOperation({
        calls: [
          // Call 1: Approve cUSD
          {
            to: CELO_STABLE_TOKENS.cUSD as `0x${string}`,
            value: BigInt(0),
            data: approveData as `0x${string}`
          },
          // Call 2: Register name
          {
            to: MNS_CONTRACT_ADDRESS,
            value: BigInt(0),
            data: registerData as `0x${string}`
          }
        ]
      })
      
      console.log('✅ Transacción batched enviada:', batchedHash)
      const receipt = await kernelClient.waitForUserOperationReceipt({ hash: batchedHash })
      
      const txHash = receipt?.receipt?.transactionHash
      
      console.log('✅ Nombre registrado exitosamente!')
      
      return {
        success: true,
        txHash: txHash || undefined
      }
    } catch (error) {
      console.error('Error registering name:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al registrar nombre'
      }
    }
  }

  /**
   * Obtiene los metadatos de un nombre
   */
  async getMetadata(name: string): Promise<NameMetadata | null> {
    try {
      if (!this.isDeployed()) {
        return null
      }

      const normalizedName = name.replace('.motus', '')
      
      const metadata = await this.publicClient.readContract({
        address: MNS_CONTRACT_ADDRESS,
        abi: MNS_ABI,
        functionName: 'nameMetadata',
        args: [normalizedName],
      }) as NameMetadata
      
      return metadata
    } catch (error) {
      console.error('Error getting metadata:', error)
      return null
    }
  }

  /**
   * Actualiza los metadatos de un nombre (requiere ser owner del NFT)
   */
  async updateMetadata(
    kernelClient: KernelAccountClient,
    name: string,
    metadata: {
      avatar?: string
      bio?: string
      twitter?: string
      discord?: string
    }
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (!this.isDeployed()) {
        return {
          success: false,
          error: 'MNS contract not deployed yet'
        }
      }

      const normalizedName = name.replace('.motus', '')
      
      const data = encodeFunctionData({
        abi: MNS_ABI,
        functionName: 'updateMetadata',
        args: [
          normalizedName,
          metadata.avatar || '',
          metadata.bio || '',
          metadata.twitter || '',
          metadata.discord || ''
        ]
      })
      
      const userOpHash = await kernelClient.sendUserOperation({
        calls: [{
          to: MNS_CONTRACT_ADDRESS,
          value: BigInt(0),
          data: data as `0x${string}`
        }]
      })
      
      const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOpHash })
      const txHash = receipt?.receipt?.transactionHash
      
      return {
        success: true,
        txHash: txHash || undefined
      }
    } catch (error) {
      console.error('Error updating metadata:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Detecta si el input es un nombre o una dirección
   * @param input - String a detectar
   * @returns 'name' | 'address' | 'invalid'
   */
  detectInputType(input: string): 'name' | 'address' | 'invalid' {
    // Es una dirección Ethereum?
    if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
      return 'address'
    }
    
    // Es un nombre válido?
    const normalized = input.replace('.motus', '')
    if (/^[a-z0-9-]+$/.test(normalized) && normalized.length > 0 && normalized.length <= 32) {
      return 'name'
    }
    
    return 'invalid'
  }

  /**
   * Resuelve automáticamente un input (nombre o dirección)
   * Si es nombre, lo resuelve a dirección. Si es dirección, la devuelve.
   */
  async resolveInput(input: string): Promise<{ 
    address: Address | null
    type: 'name' | 'address' | 'invalid'
    displayName?: string
  }> {
    const type = this.detectInputType(input)
    
    if (type === 'address') {
      // Es dirección, intentar obtener nombre
      const name = await this.reverseLookup(input as Address)
      return {
        address: input as Address,
        type: 'address',
        displayName: name || undefined
      }
    } else if (type === 'name') {
      // Es nombre, resolverlo a dirección
      const address = await this.resolve(input)
      return {
        address,
        type: 'name',
        displayName: input
      }
    }
    
    return {
      address: null,
      type: 'invalid'
    }
  }
}

// Instancia singleton para uso en toda la app
export const motusNameService = new MotusNameService()


