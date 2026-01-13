# Questions for Working ZeroDev SDK Smart Wallet Project

These questions will help us understand how to properly configure ZeroDev SDK v5 with Pimlico paymaster for smart wallet creation on Celo.

## General Setup Questions

1. **ZeroDev SDK Version**
   - What version of `@zerodev/sdk` are you using?
   - Are you using `@zerodev/ecdsa-validator`? What version?

2. **EntryPoint Version**
   - Which EntryPoint version are you using? (0.6, 0.7, or 0.8)
   - How do you configure the EntryPoint in your code?

3. **Kernel Version**
   - Which Kernel version are you using? (KERNEL_V3_1, KERNEL_V3_3, etc.)
   - How do you import and use it?

## Paymaster Configuration Questions

4. **Paymaster Setup**
   - Are you using ZeroDev's built-in paymaster (`paymaster: true`) or a custom paymaster (Pimlico)?
   - If using Pimlico, how do you configure the paymaster client?
   - Can you share the exact code for creating the paymaster client?

5. **createKernelAccountClient Configuration**
   - Can you share your complete `createKernelAccountClient` call?
   - What parameters do you pass to it?
   - How do you structure the `paymaster` parameter?

6. **getPaymasterData Implementation**
   - If using a custom paymaster, how do you implement `getPaymasterData`?
   - What does the function signature look like?
   - How do you call Pimlico's API? (method name, parameters format)
   - What format does Pimlico return data in?
   - How do you transform Pimlico's response to match `GetPaymasterDataReturnType`?

7. **getPaymasterStubData**
   - Do you also implement `getPaymasterStubData`?
   - If yes, how is it different from `getPaymasterData`?

## Pimlico Integration Questions

8. **Pimlico API Call**
   - What RPC method do you call? (`pm_sponsorUserOperation` or something else?)
   - What is the exact format of the request body?
   - How do you handle the userOperation serialization? (BigInt to string conversion, etc.)
   - What is the response format from Pimlico?

9. **Pimlico URL Configuration**
   - What is the format of your Pimlico paymaster URL?
   - Do you include the API key in the URL or headers?
   - Example: `https://api.pimlico.io/v2/{chainId}/rpc?apikey={key}`

## Code Examples Needed

10. **Complete Working Example**
    - Can you share a complete working example of:
      - Creating the Kernel account
      - Creating the Kernel account client with paymaster
      - The exact paymaster configuration object

11. **Type Imports**
    - What types do you import from `viem/account-abstraction`?
    - Do you use `GetPaymasterDataParameters` and `GetPaymasterDataReturnType`?

12. **Error Handling**
    - How do you handle paymaster errors?
    - What happens if the paymaster is unavailable?

## Chain-Specific Questions (Celo)

13. **Celo Configuration**
    - Are you using Celo Mainnet or Alfajores?
    - Does the same ZeroDev project ID work for both?
    - Any Celo-specific configuration needed?

## Testing Questions

14. **Verification**
    - How do you verify that the paymaster is working?
    - Do you have any test transactions that confirm gasless transactions?
    - Any console logs or debugging tips?

## Alternative Approaches

15. **Simpler Alternatives**
    - Have you tried using `paymaster: true` with ZeroDev's default paymaster?
    - Does that work, or do you need a custom implementation?
    - If ZeroDev's paymaster works, what's the configuration?

---

## What We're Currently Struggling With

- Type error: The paymaster parameter type doesn't match what we're passing
- We're trying to use Pimlico paymaster with a custom `getPaymasterData` implementation
- Need to understand the exact format Pimlico expects and returns
- Need to know how to properly transform between Pimlico's format and viem's expected types
















