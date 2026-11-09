/** Public flags only; never expose the CLABE or Stripe account. */
export type PaymentMethods = {
  wallet: boolean
  card: boolean
  spei: boolean
}

export function paymentMethodsFromPsm(input: {
  stripeChargesEnabled?: boolean | null
  speiClabe?: string | null
}): PaymentMethods {
  return {
    // Every listed professional must have a wallet; card and SPEI are extras.
    wallet: true,
    card: input.stripeChargesEnabled === true,
    spei: Boolean(input.speiClabe),
  }
}
