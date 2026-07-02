# Jitsi Docker Setup - Complete Guide

## Overview

This guide will help you set up a self-hosted Jitsi Meet server using Docker for unlimited video calls on your platform.

## What's Included

✅ **Docker Compose configuration** - Ready-to-use setup  
✅ **Automated setup script** - One-command installation  
✅ **JWT authentication** - Secure room access  
✅ **Unlimited session duration** - No 5-minute limit  
✅ **Local and production configs** - Works for both environments  

## Quick Start

### Step 1: Navigate to Jitsi Directory

```bash
cd jitsi
```

### Step 2: Run Setup Script

```bash
./setup.sh
```

The script will:
- Check Docker installation
- Create `.env` file from template
- Generate secure JWT secrets
- Start Jitsi services

### Step 3: Configure Next.js

After setup, update your Next.js `.env.local`:

```env
# For local development
NEXT_PUBLIC_JITSI_DOMAIN=localhost:8080

# For production (after setting up domain)
# NEXT_PUBLIC_JITSI_DOMAIN=videochat.motusdao.org

NEXT_PUBLIC_JITSI_ROOM_PREFIX=motusdao-
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=<copy-from-jitsi/.env-JWT_APP_SECRET>
```

**⚠️ CRITICAL:** The `JITSI_APP_SECRET` in Next.js must **exactly match** `JWT_APP_SECRET` in `jitsi/.env`

## Manual Setup (Alternative)

If you prefer manual setup:

### 1. Create Environment File

```bash
cd jitsi
cp env.example .env
```

### 2. Edit Configuration

```bash
nano .env  # or your preferred editor
```

**For Local Development:**
```env
PUBLIC_URL=http://localhost:8080
HTTP_PORT=8080
HTTPS_PORT=8443
ENABLE_LETSENCRYPT=0
JWT_APP_ID=motusdao
JWT_APP_SECRET=<generate-with-openssl-rand-hex-32>
```

**For Production:**
```env
PUBLIC_URL=https://videochat.motusdao.org
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=videochat.motusdao.org
LETSENCRYPT_EMAIL=your-email@example.com
HTTP_PORT=80
HTTPS_PORT=443
JWT_APP_ID=motusdao
JWT_APP_SECRET=<generate-with-openssl-rand-hex-32>
```

### 3. Generate JWT Secret

```bash
openssl rand -hex 32
```

Copy the output and use it as `JWT_APP_SECRET` in `.env`

### 4. Start Services

```bash
docker-compose up -d
```

### 5. Verify Services

```bash
docker-compose ps
```

You should see three services running:
- `web` (Jitsi web interface)
- `prosody` (XMPP server)
- `jvb` (Jitsi Videobridge)

## Configuration Details

### Environment Variables

#### Domain Configuration

- `PUBLIC_URL`: Your public domain or localhost URL
- `XMPP_DOMAIN`: Internal XMPP domain (default: `meet.jitsi`)

#### Authentication

- `JWT_APP_ID`: Your app identifier (e.g., `motusdao`)
- `JWT_APP_SECRET`: Secret key for JWT signing (min 32 chars)
- `ENABLE_AUTH`: Set to `1` to enable authentication
- `AUTH_TYPE`: Set to `jwt` for JWT authentication
- `JWT_ALLOW_EMPTY`: Set to `0` to require JWT (recommended)

#### SSL/HTTPS (Production)

- `ENABLE_LETSENCRYPT`: Set to `1` for automatic SSL
- `LETSENCRYPT_DOMAIN`: Your domain name
- `LETSENCRYPT_EMAIL`: Email for Let's Encrypt notifications

#### Ports

- `HTTP_PORT`: HTTP port (default: 80 for production, 8080 for local)
- `HTTPS_PORT`: HTTPS port (default: 443 for production, 8443 for local)
- `JVB_PORT`: UDP port for media (default: 10000)
- `JVB_TCP_PORT`: TCP port for fallback (default: 4443)

## Testing

### 1. Test Server Access

```bash
# Local
curl http://localhost:8080

# Production
curl https://your-domain.com
```

### 2. Test in Browser

1. Open `http://localhost:8080` (or your production domain)
2. Create a test room
3. Join from multiple devices/browsers
4. Verify there's no 5-minute limit

### 3. Test JWT Authentication

1. Check Next.js logs when accessing `/videochat`
2. Verify JWT token is generated: Look for "✅ JWT token generado correctamente"
3. Check browser console for any authentication errors

## Troubleshooting

### Services Not Starting

**Problem:** `docker-compose up -d` fails

**Solutions:**
1. Check Docker is running: `docker ps`
2. Check ports are available:
   ```bash
   lsof -i :8080  # or your configured ports
   ```
3. View error logs: `docker-compose logs`

### JWT Authentication Errors

**Problem:** "autenticación falló" error in browser

**Solutions:**
1. Verify secrets match exactly:
   ```bash
   # In jitsi/.env
   grep JWT_APP_SECRET .env
   
   # In Next.js .env.local
   grep JITSI_APP_SECRET .env.local
   ```
   Both should have the **exact same value** (no spaces, no quotes)

2. Restart services after changing secrets:
   ```bash
   cd jitsi
   docker-compose restart
   ```

3. Check Prosody logs:
   ```bash
   docker-compose logs prosody
   ```

### Can't Connect to Rooms

**Problem:** Rooms don't load or connection fails

**Solutions:**
1. **Check firewall rules:**
   - HTTP (80 or 8080)
   - HTTPS (443 or 8443)
   - UDP 10000 (for media)

2. **Verify DNS (production):**
   ```bash
   dig videochat.motusdao.org
   ```

3. **Check SSL certificate (production):**
   ```bash
   openssl s_client -connect your-domain.com:443
   ```

4. **Test with curl:**
   ```bash
   curl -I http://localhost:8080
   ```

### 5-Minute Limit Still Appears

**Problem:** Sessions still disconnect after 5 minutes

**Solutions:**
1. Verify you're using your own domain, not `meet.jit.si`
2. Check `PUBLIC_URL` in `.env` matches your domain
3. Verify JWT is configured: `ENABLE_AUTH=1` and `AUTH_TYPE=jwt`
4. Restart services: `docker-compose restart`

### Port Conflicts

**Problem:** Port already in use

**Solutions:**
1. Find what's using the port:
   ```bash
   lsof -i :8080
   ```

2. Change ports in `.env`:
   ```env
   HTTP_PORT=8081
   HTTPS_PORT=8444
   ```

3. Update Next.js `.env.local`:
   ```env
   NEXT_PUBLIC_JITSI_DOMAIN=localhost:8081
   ```

## Production Deployment

### 1. Server Requirements

- **Minimum:** 2GB RAM, 2 CPU cores
- **Recommended:** 4GB RAM, 4 CPU cores
- **For many users:** 8GB+ RAM, 8+ CPU cores

### 2. Domain Setup

1. Point your domain to server IP:
   ```
   A record: videochat.motusdao.org -> YOUR_SERVER_IP
   ```

2. Wait for DNS propagation (can take up to 48 hours)

3. Verify DNS:
   ```bash
   dig videochat.motusdao.org
   ```

### 3. SSL Certificate

The setup uses Let's Encrypt for automatic SSL:

1. Set in `.env`:
   ```env
   ENABLE_LETSENCRYPT=1
   LETSENCRYPT_DOMAIN=videochat.motusdao.org
   LETSENCRYPT_EMAIL=your-email@example.com
   ```

2. Start services:
   ```bash
   docker-compose up -d
   ```

3. Let's Encrypt will automatically obtain and renew certificates

### 4. Firewall Configuration

Open these ports:

```bash
# HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# JVB (media)
sudo ufw allow 10000/udp
sudo ufw allow 4443/tcp
```

### 5. Update Next.js

Update production `.env.local`:

```env
NEXT_PUBLIC_JITSI_DOMAIN=videochat.motusdao.org
NEXT_PUBLIC_JITSI_ROOM_PREFIX=motusdao-
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=<same-as-jitsi-.env>
```

## Maintenance

### Update Jitsi

```bash
cd jitsi
docker-compose pull
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f prosody
docker-compose logs -f jvb
```

### Backup Configuration

```bash
# Backup config directory
tar -czf jitsi-backup-$(date +%Y%m%d).tar.gz jitsi-meet-cfg/

# Backup .env (contains secrets!)
cp .env .env.backup
```

### Restart Services

```bash
docker-compose restart
```

### Stop Services

```bash
docker-compose down
```

### Start Services

```bash
docker-compose up -d
```

## Security Checklist

- [ ] JWT authentication enabled (`ENABLE_AUTH=1`)
- [ ] JWT required (`JWT_ALLOW_EMPTY=0`)
- [ ] HTTPS enabled for production (`ENABLE_LETSENCRYPT=1`)
- [ ] Firewall configured (only necessary ports open)
- [ ] Strong JWT secret (32+ characters, random)
- [ ] Secrets match between Jitsi and Next.js
- [ ] Regular updates (`docker-compose pull`)
- [ ] Log monitoring set up

## Next Steps

1. ✅ Set up Jitsi server (this guide)
2. ✅ Configure Next.js environment variables
3. ✅ Test video calls
4. ✅ Deploy to production
5. ✅ Monitor performance and logs

## Support

If you need help:

1. Check service logs: `docker-compose logs -f`
2. Verify configuration matches this guide
3. Test with a simple room first
4. Check [Official Jitsi Documentation](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker)









