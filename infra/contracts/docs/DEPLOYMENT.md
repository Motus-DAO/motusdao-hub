# MotusDAO Hub - Deployment Guide

## Production Deployment on Vercel with Celo Mainnet

This guide covers deploying MotusDAO Hub to Vercel with Privy wallet integration configured for Celo mainnet.

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Privy Account**: Create an account at [privy.io](https://privy.io)
3. **Celo Wallet**: For testing transactions on Celo mainnet

### Step 1: Privy Configuration

1. **Create Privy App**:
   - Go to [privy.io](https://privy.io) and create a new app
   - Choose "Web App" as the platform
   - Set the app name to "MotusDAO Hub"

2. **Configure Celo Mainnet**:
   - In your Privy dashboard, go to "Chains" settings
   - Add Celo Mainnet (Chain ID: 42220)
   - RPC URL: `https://forno.celo.org`
   - Block Explorer: `https://explorer.celo.org`

3. **Get App ID**:
   - Copy your Privy App ID from the dashboard
   - You'll need this for the environment variables

### Step 2: Environment Variables

Set the following environment variables in your Vercel project:

```bash
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Database Configuration
DATABASE_URL=your_postgresql_connection_string

# Supabase Configuration (if using)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (for AI features)
OPENAI_API_KEY=your_openai_api_key

# Production Environment
NODE_ENV=production

# Celo Network Configuration
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_CELO_CHAIN_ID=42220
```

### Step 3: Vercel Deployment

1. **Connect Repository**:
   - Import your GitHub repository to Vercel
   - Select the main branch for production deployments

2. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all the variables listed above
   - Make sure to set them for Production environment

4. **Deploy**:
   - Click "Deploy" to start the deployment process
   - Wait for the build to complete

### Step 4: Post-Deployment Configuration

1. **Deploy Database Schema**:
   - After the Vercel deployment completes, run the database deployment script:
   ```bash
   npm run deploy:db
   ```
   - This will push the Prisma schema to your Supabase database
   - Make sure your DATABASE_URL is correctly set in Vercel environment variables

2. **Verify Database Connection**:
   - Test the database health endpoint: `https://your-app.vercel.app/api/health/db`
   - This should return a JSON response with `"status": "healthy"`
   - If it fails, check your DATABASE_URL configuration

3. **Update Privy App Settings**:
   - Go back to your Privy dashboard
   - Update the "Allowed Origins" to include your Vercel domain
   - Add: `https://your-app-name.vercel.app`

4. **Test Wallet Connection**:
   - Visit your deployed app
   - Try connecting with different wallet types
   - Verify that embedded wallets are created for users without wallets

### Step 5: Celo Mainnet Features

The app is now configured with:

- **Celo Mainnet as Default Chain**: All wallet connections default to Celo mainnet
- **Embedded Wallet Creation**: Users without wallets get embedded wallets automatically
- **Celo Stable Tokens**: Support for cUSD, cEUR, and cREAL
- **MotusDAO Branding**: Custom logo and theme integration

### Testing Checklist

- [ ] Wallet connection works with MetaMask
- [ ] Wallet connection works with WalletConnect
- [ ] Embedded wallets are created for email-only users
- [ ] Celo mainnet is the default network
- [ ] MotusDAO logo appears in Privy modals
- [ ] Onboarding flow completes successfully
- [ ] User data is stored correctly

### Troubleshooting

**Common Issues**:

1. **Database Connection Errors**:
   - **Error: "Can't reach database server"**: Check your DATABASE_URL in Vercel environment variables
   - **Error: "Database does not exist"**: Verify the database name in your connection string
   - **Error: "Authentication failed"**: Check username and password in DATABASE_URL
   - **Solution**: Run `npm run deploy:db` to push the schema to your database

2. **User Registration Fails**:
   - Check the health endpoint: `https://your-app.vercel.app/api/health/db`
   - Verify database tables are created by running the deploy script
   - Check Vercel function logs for detailed error messages
   - Ensure all required environment variables are set

3. **Wallet Connection Fails**:
   - Check that your Privy App ID is correct
   - Verify that your domain is added to allowed origins
   - Ensure Celo mainnet is configured in Privy

4. **Embedded Wallets Not Created**:
   - Check that `createOnLogin: 'users-without-wallets'` is set
   - Verify the user doesn't already have a connected wallet

5. **Wrong Network**:
   - Ensure Celo mainnet (42220) is set as the default chain
   - Check that the RPC URL is correct

### Security Considerations

- Never commit environment variables to version control
- Use strong, unique API keys
- Regularly rotate your API keys
- Monitor your Privy dashboard for unusual activity
- Set up proper CORS policies

### Support

For issues with:
- **Privy**: Check [Privy Documentation](https://docs.privy.io)
- **Celo**: Visit [Celo Documentation](https://docs.celo.org)
- **Vercel**: See [Vercel Documentation](https://vercel.com/docs)
