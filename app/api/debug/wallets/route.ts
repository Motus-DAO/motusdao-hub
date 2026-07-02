import { NextResponse } from 'next/server'
import { motusNameService, MNS_CONTRACT_ADDRESS } from '@/lib/motus-name-service'
import { createPublicClient, http } from 'viem'
import { celoMainnet } from '@/lib/celo'
import { debugApiGuard } from '@/lib/debug-api'

// ABI mínimo para leer ownerOf
const ERC721_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    name: 'nameToTokenId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

/**
 * Debug endpoint to analyze wallet addresses and MNS registrations
 * GET /api/debug/wallets?name=gerry&address=0x...
 */
export async function GET(request: Request) {
  const blocked = debugApiGuard()
  if (blocked) return blocked

  const { searchParams } = new URL(request.url)
  const motusName = searchParams.get('name') || 'gerry'
  const currentSmartWallet = searchParams.get('address')
  
  try {
    const publicClient = createPublicClient({
      chain: celoMainnet,
      transport: http('https://forno.celo.org'),
    })
    
    // 1. Resolve the .motus name to see what address it points to
    const registeredAddress = await motusNameService.resolve(motusName)
    
    // 2. Get the NFT owner (who can update the name)
    let nftOwner: string | null = null
    let tokenId: bigint | null = null
    
    try {
      // Get token ID for this name
      tokenId = await publicClient.readContract({
        address: MNS_CONTRACT_ADDRESS,
        abi: ERC721_ABI,
        functionName: 'nameToTokenId',
        args: [motusName],
      }) as bigint
      
      if (tokenId && tokenId > BigInt(0)) {
        // Get owner of the NFT
        nftOwner = await publicClient.readContract({
          address: MNS_CONTRACT_ADDRESS,
          abi: ERC721_ABI,
          functionName: 'ownerOf',
          args: [tokenId],
        }) as string
      }
    } catch (err) {
      console.error('Error getting NFT owner:', err)
    }
    
    // 3. If we have a current smart wallet, do a reverse lookup
    let reverseResult: string | null = null
    if (currentSmartWallet) {
      reverseResult = await motusNameService.reverseLookup(currentSmartWallet as `0x${string}`)
    }
    
    // 4. Check balances on both addresses
    let registeredAddressBalance = '0'
    let currentSmartWalletBalance = '0'
    let nftOwnerBalance = '0'
    
    if (registeredAddress) {
      try {
        const balance = await publicClient.getBalance({ address: registeredAddress })
        registeredAddressBalance = (Number(balance) / 10**18).toFixed(6)
      } catch { /* ignore */ }
    }
    
    if (currentSmartWallet) {
      try {
        const balance = await publicClient.getBalance({ address: currentSmartWallet as `0x${string}` })
        currentSmartWalletBalance = (Number(balance) / 10**18).toFixed(6)
      } catch { /* ignore */ }
    }
    
    if (nftOwner) {
      try {
        const balance = await publicClient.getBalance({ address: nftOwner as `0x${string}` })
        nftOwnerBalance = (Number(balance) / 10**18).toFixed(6)
      } catch { /* ignore */ }
    }
    
    const isSameAddress = registeredAddress?.toLowerCase() === currentSmartWallet?.toLowerCase()
    const currentWalletOwnsNFT = nftOwner?.toLowerCase() === currentSmartWallet?.toLowerCase()
    const registeredAddressOwnsNFT = nftOwner?.toLowerCase() === registeredAddress?.toLowerCase()
    
    return NextResponse.json({
      analysis: {
        motusName: `${motusName}.motus`,
        registeredAddress,
        currentSmartWallet,
        nftOwner,
        tokenId: tokenId?.toString(),
        isSameAddress,
        currentWalletOwnsNFT,
        registeredAddressOwnsNFT,
        problem: !isSameAddress 
          ? '⚠️ Las direcciones NO coinciden!' 
          : '✅ Las direcciones coinciden',
        canUpdateAddress: currentWalletOwnsNFT
          ? '✅ Tu smart wallet actual puede actualizar la dirección (es dueña del NFT)'
          : '❌ Tu smart wallet actual NO puede actualizar la dirección (no es dueña del NFT)',
      },
      balances: {
        registeredAddress: `${registeredAddressBalance} CELO`,
        currentSmartWallet: `${currentSmartWalletBalance} CELO`,
        nftOwner: `${nftOwnerBalance} CELO`,
      },
      reverseLookup: {
        currentSmartWalletHasName: reverseResult,
      },
      explanation: !isSameAddress ? {
        issue: 'Tu nombre .motus apunta a una smart wallet diferente a la que estás usando actualmente.',
        cause: 'Las smart wallets de ZeroDev se generan determinísticamente desde la EOA (embedded wallet) de Privy.',
        reasons: [
          '1. Privy puede asignar diferentes EOAs a un mismo usuario en distintas sesiones',
          '2. La misma EOA siempre genera la misma smart wallet',
          '3. Si la EOA cambia, la smart wallet cambia',
        ],
        nftOwnership: {
          situation: nftOwner === registeredAddress 
            ? 'El NFT está en la dirección registrada (probablemente la smart wallet original)'
            : nftOwner 
              ? `El NFT pertenece a ${nftOwner}`
              : 'No se pudo determinar el dueño del NFT',
          canFix: currentWalletOwnsNFT,
        },
        solutions: currentWalletOwnsNFT ? [
          '✅ Puedes actualizar la dirección del nombre desde la UI',
        ] : [
          '1. Necesitas acceder a la smart wallet que registró el nombre',
          '2. O transferir el NFT a tu nueva smart wallet primero',
          '3. Verifica en Privy dashboard si tienes múltiples wallets',
        ],
      } : null,
      debug: {
        mnsContract: MNS_CONTRACT_ADDRESS,
        celoExplorerName: `https://explorer.celo.org/mainnet/address/${MNS_CONTRACT_ADDRESS}`,
        celoExplorerRegistered: registeredAddress 
          ? `https://explorer.celo.org/mainnet/address/${registeredAddress}`
          : null,
        celoExplorerCurrent: currentSmartWallet
          ? `https://explorer.celo.org/mainnet/address/${currentSmartWallet}`
          : null,
        celoExplorerNftOwner: nftOwner
          ? `https://explorer.celo.org/mainnet/address/${nftOwner}`
          : null,
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 })
  }
}

