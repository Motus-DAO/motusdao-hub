# Jitsi Meet Self-Hosted Server Setup

This directory contains everything you need to run a self-hosted Jitsi Meet server for unlimited video calls.

## Quick Start

### 1. Prerequisites

- Docker and Docker Compose installed
- At least 2GB RAM and 2 CPU cores
- Ports 80, 443, 4443, 10000/udp available (or custom ports for local dev)

### 2. Setup

```bash
cd jitsi
./setup.sh
```

The setup script will:
- Check Docker installation
- Create `.env` from `env.example`
- Generate JWT secrets
- Start the Jitsi server

### 3. Manual Setup (Alternative)

If you prefer to set up manually:

```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor

# Generate JWT secret
openssl rand -hex 32

# Update .env with:
# - JWT_APP_SECRET=<generated-secret>
# - JWT_APP_ID=motusdao
# - PUBLIC_URL=http://localhost:8080 (for local) or https://your-domain.com (for production)

# Start services
docker-compose up -d
```

### 4. Configure Next.js

Update your Next.js `.env.local`:

```env
# For local development
NEXT_PUBLIC_JITSI_DOMAIN=localhost:8080

# For production
# NEXT_PUBLIC_JITSI_DOMAIN=videochat.motusdao.org

NEXT_PUBLIC_JITSI_ROOM_PREFIX=motusdao-
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=<same-secret-as-in-jitsi-.env>
```

**⚠️ IMPORTANT:** `JITSI_APP_SECRET` in Next.js must match `JWT_APP_SECRET` in Jitsi `.env`

## Branding (MotusDAO Consultorio)

Branding files live in [`branding/`](branding/):

- `interface_config.js` — app name, Spanish UI, no Jitsi watermark
- `css/custom.css` — mauve/iris theme (mounted as `/config/css/custom.css`)
- `images/watermark.svg` — logo shown in Jitsi chrome

`docker-compose.yml` mounts these into the `web` container automatically.

### JWT roles (moderator vs guest) — required on VPS

Prosody must load `token_affiliation` so JWT `moderator` / `affiliation` claims are enforced.
Without it, guests can incorrectly receive owner/moderator powers.

In `~/apps/jitsi/.env` (production VPS):

```env
XMPP_MUC_MODULES=token_affiliation
ENABLE_AUTO_OWNER=0
ENABLE_LOBBY=1
```

Then recreate auth services:

```bash
cd ~/apps/jitsi
docker compose up -d --force-recreate --no-deps prosody jicofo
```

### Deploy branding to production (`jitsi.motusdao.org`)

```bash
cd ~/apps/jitsi   # not ~/jitsi
git pull   # or copy branding/ to the VPS
docker compose restart web
```

Verify at `https://jitsi.motusdao.org` — toolbar and prejoin UI should use MotusDAO colors and show **MotusDAO Consultorio**.

## Configuration

### Local Development

For local development, use these settings in `.env`:

```env
PUBLIC_URL=http://localhost:8080
HTTP_PORT=8080
HTTPS_PORT=8443
ENABLE_LETSENCRYPT=0
```

Then in Next.js `.env.local`:

```env
NEXT_PUBLIC_JITSI_DOMAIN=localhost:8080
```

### Production

For production with SSL:

```env
PUBLIC_URL=https://videochat.motusdao.org
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=videochat.motusdao.org
LETSENCRYPT_EMAIL=your-email@example.com
HTTP_PORT=80
HTTPS_PORT=443
```

Then in Next.js `.env.local`:

```env
NEXT_PUBLIC_JITSI_DOMAIN=videochat.motusdao.org
```

## Services

The Docker Compose setup includes:

- **web**: Jitsi Meet web interface
- **prosody**: XMPP server for signaling
- **jvb**: Jitsi Videobridge for media relay

## Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f web
docker-compose logs -f prosody
docker-compose logs -f jvb

# Restart services
docker-compose restart

# Check service status
docker-compose ps
```

## Troubleshooting

### Services won't start

1. Check Docker is running: `docker ps`
2. Check ports are available: `lsof -i :8080` (or your configured ports)
3. View logs: `docker-compose logs`

### JWT authentication errors

1. Verify secrets match:
   - Jitsi `.env`: `JWT_APP_SECRET` and `JWT_APP_ID`
   - Next.js `.env.local`: `JITSI_APP_SECRET` and `JITSI_APP_ID`
2. Restart both services after changing secrets
3. Check Jitsi logs: `docker-compose logs prosody`

### Can't connect to rooms

1. Check firewall rules (ports 80, 443, 10000/udp)
2. Verify DNS is pointing to your server (for production)
3. Check SSL certificate is valid (for production)
4. Test with: `curl http://localhost:8080` (or your domain)

### 5-minute time limit still appears

- Make sure you're using your own domain, not `meet.jit.si`
- Verify `PUBLIC_URL` in `.env` matches your domain
- Check that JWT is configured correctly
- Restart services: `docker-compose restart`

## Security Best Practices

1. **Enable JWT authentication** - Already configured by default
2. **Use HTTPS** - Enable Let's Encrypt for production
3. **Firewall rules** - Only open necessary ports
4. **Regular updates** - Keep Docker images updated: `docker-compose pull && docker-compose up -d`
5. **Monitor logs** - Set up log monitoring for production

## Performance

For better performance with many concurrent users:

1. **Increase server resources** - More RAM and CPU
2. **Configure TURN server** - For better connectivity (see Jitsi docs)
3. **Use load balancer** - For multiple JVB instances
4. **Enable recording only if needed** - Uses more resources

## Additional Resources

- [Official Jitsi Docker Guide](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker)
- [Jitsi Community Forum](https://community.jitsi.org/)
- [JWT Configuration Guide](https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/tokens.md)

## Support

If you encounter issues:

1. Check service logs: `docker-compose logs -f`
2. Verify environment variables match between Jitsi and Next.js
3. Test with a simple room first
4. Check the official Jitsi documentation









