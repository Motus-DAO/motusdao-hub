/** Public flags only; never expose the CLABE or Stripe account. */
export type PaymentMethods = {
  wallet: boolean
  card: boolean
  spei: boolean
}

export function paymentMethodsFromPsm(input: {
  eoaAddress?: string | null
  stripeChargesEnabled?: boolean | null
  speiClabe?: string | null
}): PaymentMethods {
  return {
    wallet: Boolean(input.eoaAddress),
    card: input.stripeChargesEnabled === true,
    spei: Boolean(input.speiClabe),
  }
}
