# ZeroDev Credentials Explained

## You Don't Need API Keys for ZeroDev SDK!

### What ZeroDev Uses: **Project ID** (Not API Key)

ZeroDev uses a **Project ID** (a UUID) to identify your project. This is different from API keys.

### What You Need:

1. **Project ID** (UUID format like: `e46f4ac3-404e-42fc-a3d3-1c75846538a8`)
   - This is what you use in your code
   - Found in ZeroDev dashboard → Your Project → Project ID
   - Goes in `.env` as `NEXT_PUBLIC_ZERODEV_PROJECT_ID`

2. **No API Key Required** for SDK usage
   - The SDK uses the Project ID directly
   - No authentication needed in code
   - Project ID is public (safe to expose in frontend)

### Personal vs Team API Key (If You See This)

If ZeroDev dashboard shows "Personal API Key" or "Team API Key", this is likely for:
- **Dashboard API access** (programmatic dashboard management)
- **Advanced features** (not needed for basic SDK usage)
- **Team management** (if you have a team account)

**You don't need these for the SDK!**

### What Your Code Uses:

```typescript
// This is all you need:
const zeroDevProjectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID

// Used in URLs like:
const bundlerUrl = `https://rpc.zerodev.app/api/v3/${zeroDevProjectId}/chain/${chainId}`
const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}`
```

### Comparison with Other Services:

| Service | What You Need | Where It Goes |
|---------|--------------|---------------|
| **ZeroDev** | Project ID (UUID) | `NEXT_PUBLIC_ZERODEV_PROJECT_ID` |
| **Pimlico** | API Key | `NEXT_PUBLIC_PIMLICO_API_KEY` (not needed if using ZeroDev paymaster) |
| **Privy** | App ID | `NEXT_PUBLIC_PRIVY_APP_ID` |

### Steps to Get Your Project ID:

1. Go to ZeroDev Dashboard
2. Create or select your Alfajores project (Free plan)
3. Go to Project Settings
4. Copy the **Project ID** (UUID format)
5. Add to `.env`:
   ```
   NEXT_PUBLIC_ZERODEV_PROJECT_ID=your-project-id-here
   ```

### Security Note:

- ✅ **Project ID is safe to expose** in frontend code (it's public)
- ✅ It's used in client-side code (that's why it's `NEXT_PUBLIC_`)
- ✅ No authentication/API key needed for SDK usage
- ⚠️ If you see API keys in dashboard, they're for dashboard API access (not needed)

### Summary:

**Answer: You don't need any API key!** Just use the **Project ID** from your ZeroDev project.

The Project ID is what identifies your project and is used in the ZeroDev service URLs. No authentication is required for SDK usage.
















