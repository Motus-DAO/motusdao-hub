import type { DataKeyAadInput } from './mode'
import { dataKeyAadInput } from './mode'
import type { DataKeyMode } from './constants'

export function exportAadFromMetadata(input: {
  dataKeyMode?: DataKeyMode
  dataKeyVersion?: number
  eoaAddress: string
  userId: string
}): DataKeyAadInput {
  const mode: DataKeyMode = input.dataKeyMode ?? 'wallet'
  return dataKeyAadInput(mode, input.userId, input.eoaAddress)
}