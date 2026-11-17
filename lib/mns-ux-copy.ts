/** Copy compartido — multi-wallet + MNS (producto, no contrato). */

export const MNS_ACCOUNT_VS_NAME =
  'Tu cuenta Motus es una: puedes iniciar sesión con cualquier wallet vinculada. Cada nombre .motus es un registro aparte en Celo, único en la red, ligado a un NFT.'

export const MNS_ONE_NAME_ONE_PAYOUT =
  'Un nombre .motus apunta a una sola dirección de cobro. No comparte automáticamente el mismo nombre entre varias wallets.'

export const MNS_CAN_MOVE =
  'Puedes transferir el NFT del nombre entre wallets que controles, o cambiar la dirección donde llegan los pagos de ese nombre.'

export const MNS_PAYMENT_RESOLVE_HINT =
  'Antes de enviar, revisa la dirección 0x… que resuelve el nombre. Los fondos van a esa dirección, no al texto del nombre.'

export const MNS_TRANSFER_STEPS = [
  {
    title: '1. Transfiere el NFT',
    body: `En tu wallet dueña del nombre, envía el NFT del contrato Motus Name Service a la otra wallet tuya (transferencia ERC‑721 estándar en Celo).`,
  },
  {
    title: '2. Ajusta cobro y reverse',
    body:
      'Desde la wallet que ahora posee el NFT, usa «Cambiar dónde cobro» (updateNameAddress) y, si hace falta, configura el nombre principal en esa wallet.',
  },
] as const