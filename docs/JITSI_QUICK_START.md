# Jitsi Quick Start Guide

## What Was Fixed

The Jitsi video chat feature was working but limited to 5 minutes because it was using the public `meet.jit.si` service. I've updated the code to support:

1. ✅ **JWT Authentication** - Secure room access
2. ✅ **Custom Domain Support** - Use your own Jitsi server
3. ✅ **Unlimited Session Duration** - No more 5-minute limit
4. ✅ **Automatic Token Generation** - Tokens are generated automatically

## What You Need to Do

### Option 1: Quick Test (Still 5 minutes, but JWT ready)

The code will work with `meet.jit.si` but still has the 5-minute limit. To test JWT functionality:

1. Set up a self-hosted Jitsi server (see `JITSI_SETUP.md`)
2. Update your `.env.local`:

```env
NEXT_PUBLIC_JITSI_DOMAIN=your-jitsi-domain.com
NEXT_PUBLIC_JITSI_ROOM_PREFIX=motusdao-
JITSI_APP_ID=your-app-id
JITSI_APP_SECRET=your-app-secret
```

### Option 2: Self-Hosted Server (Recommended for Production)

Follow the detailed guide in `JITSI_SETUP.md` to:
1. Set up a Jitsi server using Docker
2. Configure JWT authentication
3. Point your domain to the server
4. Update environment variables

## Files Changed

1. **`app/api/jitsi/token/route.ts`** - New endpoint to generate JWT tokens
2. **`app/videochat/page.tsx`** - Updated to support JWT tokens and unlimited sessions
3. **`env.example`** - Added JWT configuration variables
4. **`JITSI_SETUP.md`** - Complete setup guide

## Testing

1. Start your development server: `npm run dev`
2. Navigate to `/videochat`
3. If JWT is configured, you'll see "Configurando sala segura..." while the token loads
4. The room should load without the 5-minute limit (if using self-hosted server)

## Current Status

- ✅ Code updated to support JWT
- ✅ Token generation API created
- ✅ Frontend automatically fetches tokens
- ⚠️ **You need to set up a self-hosted Jitsi server** to remove the 5-minute limit

## Next Steps

1. **For Development**: Continue using `meet.jit.si` (5-minute limit still applies)
2. **For Production**: Set up self-hosted server following `JITSI_SETUP.md`

## Need Help?

- Check `JITSI_SETUP.md` for detailed setup instructions
- Verify your environment variables match between:
  - Jitsi server `.env`
  - Your Next.js `.env.local`
- Check server logs if rooms aren't working










