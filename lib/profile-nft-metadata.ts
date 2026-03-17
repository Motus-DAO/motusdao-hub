import { uploadBuffer } from '@lighthouse-web3/sdk'

const PROFILE_NFT_NAME = 'Motus Clinical Profile'

const lighthouseApiKey = process.env.LIGHTHOUSE_API_KEY

if (!lighthouseApiKey) {
  console.warn(
    '[profile-nft-metadata] LIGHTHOUSE_API_KEY is not set. Profile NFTs will fail to upload metadata.'
  )
}

export interface ProfileNftMetadataInput {
  wallet: string
  role: 'usuario' | 'psm'
  registrationDate: string // ISO string YYYY-MM-DD
}

export async function uploadProfileMetadataToIPFS(
  input: ProfileNftMetadataInput
): Promise<string> {
  if (!lighthouseApiKey) {
    throw new Error('LIGHTHOUSE_API_KEY not configured')
  }

  const { wallet, role, registrationDate } = input

  const metadata = {
    name: `${PROFILE_NFT_NAME} - ${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
    description:
      'NFT que certifica el registro financiero básico del usuario en MotusDAO. No contiene datos clínicos sensibles.',
    attributes: [
      {
        trait_type: 'role',
        value: role
      },
      {
        trait_type: 'wallet',
        value: wallet
      },
      {
        trait_type: 'registration_date',
        value: registrationDate
      }
    ]
  }

  const buffer = Buffer.from(JSON.stringify(metadata, null, 2))

  const { data } = await uploadBuffer(buffer, lighthouseApiKey, {
    cidVersion: 1
  })

  const hash = (data as { Hash?: string })?.Hash
  if (!hash) {
    throw new Error('Lighthouse no devolvió CID (Hash) en la respuesta')
  }

  return `ipfs://${hash}`
}

