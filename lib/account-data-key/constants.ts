export const ACCOUNT_DATA_PURPOSE = 'motus-account-data' as const
export const ACCOUNT_DATA_KEY_VERSION = 2 as const

export const WALLET_DATA_KEY_VERSION = 1 as const

export type DataKeyMode = 'account' | 'wallet'

export const DATA_KEY_MODE_COPY = {
  account: {
    title: 'Por mi cuenta Motus (recomendado)',
    body: 'Si Human o Thirdweb falla, otra wallet vinculada puede abrir tu copia. Cualquier wallet vinculada comprometida puede desbloquear estos datos.',
  },
  wallet: {
    title: 'Solo esta wallet',
    body: 'Máxima separación por dirección. Si cambias de wallet sin exportar, no podrás abrir esta copia.',
  },
} as const