import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celoMainnet } from '@/lib/celo'
import MotusClinicalProfileAbi from '@/contracts/abis/MotusClinicalProfile.json'

const PROFILE_NFT_ADDRESS =
  (process.env.MOTUS_PROFILE_NFT_ADDRESS as `0x${string}`) ||
  ('0x3343BDc2bfB3C37405c12AD916bb81e88410a1f5' as const)

export function getCeloClient() {
  const pk = process.env.MOTUS_PROFILE_MINTER_PK

  if (!pk) {
    throw new Error('MOTUS_PROFILE_MINTER_PK no está configurado')
  }

  const account = privateKeyToAccount(pk as `0x${string}`)

  return createWalletClient({
    account,
    chain: celoMainnet,
    transport: http(),
  })
}

export function getProfileNftContract(client: ReturnType<typeof createWalletClient>) {
  return {
    write: {
      mintProfile: (args: [`0x${string}`, string]) =>
        client.writeContract({
          address: PROFILE_NFT_ADDRESS,
          abi: MotusClinicalProfileAbi as any,
          functionName: 'mintProfile',
          args
        })
    }
  }
}

