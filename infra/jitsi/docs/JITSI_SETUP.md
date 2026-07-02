# Jitsi Meet Setup Guide

## Problem: 5-Minute Time Limit

The public Jitsi Meet service (`meet.jit.si`) has a **5-minute time limit** in tryout mode. To remove this limitation and have unlimited session duration, you need to set up your own self-hosted Jitsi Meet server.

## Solution: Self-Hosted Jitsi Server

This guide will help you set up a production-ready Jitsi Meet server with:
- ✅ Unlimited session duration
- ✅ JWT authentication (optional but recommended)
- ✅ Custom branding
- ✅ Better privacy and control

## Option 1: Quick Setup with Docker (Recommended)

### Prerequisites

- A server with at least 2GB RAM and 2 CPU cores
- Docker and Docker Compose installed
- A domain name pointing to your server (e.g., `videochat.motusdao.org`)
- Ports 80, 443, 4443, 10000/udp open in your firewall

### Step 1: Install Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin
```

### Step 2: Create Jitsi Configuration

Create a directory for your Jitsi setup:

```bash
mkdir jitsi-meet && cd jitsi-meet
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Frontend
  web:
    image: jitsi/web:latest
    restart: ${RESTART_POLICY:-unless-stopped}
    ports:
      - '${HTTP_PORT:-80}:80'
      - '${HTTPS_PORT:-443}:443'
    volumes:
      - ${CONFIG}/web:/config:Z
      - ${CONFIG}/web/letsencrypt:/etc/letsencrypt:Z
    environment:
      - ENABLE_AUTH=${ENABLE_AUTH:-1}
      - ENABLE_GUESTS=${ENABLE_GUESTS:-1}
      - ENABLE_LETSENCRYPT=${ENABLE_LETSENCRYPT:-1}
      - ENABLE_HTTP_REDIRECT=${ENABLE_HTTP_REDIRECT:-1}
      - LETSENCRYPT_DOMAIN=${LETSENCRYPT_DOMAIN:-}
      - LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-}
      - PUBLIC_URL=${PUBLIC_URL:-}
      - JWT_APP_ID=${JWT_APP_ID:-}
      - JWT_APP_SECRET=${JWT_APP_SECRET:-}
      - ENABLE_RECORDING=${ENABLE_RECORDING:-0}
    networks:
      meet.jitsi:
        aliases:
          - ${XMPP_DOMAIN}

  # XMPP server
  prosody:
    image: jitsi/prosody:latest
    restart: ${RESTART_POLICY:-unless-stopped}
    ports:
      - '5222:5222'
      - '5347:5347'
      - '5280:5280'
    volumes:
      - ${CONFIG}/prosody:/config:Z
    environment:
      - AUTH_TYPE=${AUTH_TYPE:-jwt}
      - ENABLE_AUTH=${ENABLE_AUTH:-1}
      - ENABLE_GUESTS=${ENABLE_GUESTS:-1}
      - GLOBAL_MODULES=${GLOBAL_MODULES:-}
      - GLOBAL_CONFIG=${GLOBAL_CONFIG:-}
      - LDAP_URL=${LDAP_URL:-}
      - LDAP_BASE=${LDAP_BASE:-}
      - LDAP_BINDDN=${LDAP_BINDDN:-}
      - LDAP_BINDPW=${LDAP_BINDPW:-}
      - LDAP_FILTER=${LDAP_FILTER:-}
      - LDAP_AUTH_METHOD=${LDAP_AUTH_METHOD:-}
      - LDAP_VERSION=${LDAP_VERSION:-}
      - LDAP_USE_TLS=${LDAP_USE_TLS:-}
      - LDAP_TLS_CIPHERS=${LDAP_TLS_CIPHERS:-}
      - LDAP_TLS_CHECK_PEER=${LDAP_TLS_CHECK_PEER:-}
      - LDAP_TLS_CACERT_FILE=${LDAP_TLS_CACERT_FILE:-}
      - LDAP_TLS_CACERT_DIR=${LDAP_TLS_CACERT_DIR:-}
      - LDAP_START_TLS=${LDAP_START_TLS:-}
      - XMPP_DOMAIN=${XMPP_DOMAIN:-meet.jitsi}
      - XMPP_AUTH_DOMAIN=${XMPP_AUTH_DOMAIN:-auth.meet.jitsi}
      - XMPP_GUEST_DOMAIN=${XMPP_GUEST_DOMAIN:-guest.meet.jitsi}
      - XMPP_MUC_DOMAIN=${XMPP_MUC_DOMAIN:-muc.meet.jitsi}
      - XMPP_INTERNAL_MUC_DOMAIN=${XMPP_INTERNAL_MUC_DOMAIN:-internal-muc.meet.jitsi}
      - XMPP_MODULES=${XMPP_MODULES:-}
      - XMPP_MUC_MODULES=${XMPP_MUC_MODULES:-}
      - XMPP_INTERNAL_MUC_MODULES=${XMPP_INTERNAL_MUC_MODULES:-}
      - XMPP_RECORDER_DOMAIN=${XMPP_RECORDER_DOMAIN:-recorder.meet.jitsi}
      - JWT_APP_ID=${JWT_APP_ID:-}
      - JWT_APP_SECRET=${JWT_APP_SECRET:-}
      - JWT_ACCEPTED_ISSUERS=${JWT_ACCEPTED_ISSUERS:-}
      - JWT_ACCEPTED_AUDIENCES=${JWT_ACCEPTED_AUDIENCES:-}
      - JWT_ASAP_KEYSERVER=${JWT_ASAP_KEYSERVER:-}
      - JWT_ALLOW_EMPTY=${JWT_ALLOW_EMPTY:-}
      - JWT_AUTH_TYPE=${JWT_AUTH_TYPE:-}
      - JWT_TOKEN_AUTH_MODULE=${JWT_TOKEN_AUTH_MODULE:-}
      - LOG_LEVEL=${LOG_LEVEL:-}
    networks:
      meet.jitsi:
        aliases:
          - ${XMPP_DOMAIN}
          - ${XMPP_AUTH_DOMAIN}
          - ${XMPP_GUEST_DOMAIN}
          - ${XMPP_INTERNAL_MUC_DOMAIN}

  # JVB (Jitsi Videobridge)
  jvb:
    image: jitsi/jvb:latest
    restart: ${RESTART_POLICY:-unless-stopped}
    ports:
      - '${JVB_PORT:-10000}:10000/udp'
      - '${JVB_TCP_PORT:-4443}:4443/tcp'
    volumes:
      - ${CONFIG}/jvb:/config:Z
    environment:
      - DOCKER_HOST_ADDRESS=${DOCKER_HOST_ADDRESS:-}
      - ENABLE_APIS=${ENABLE_APIS:-}
      - XMPP_AUTH_DOMAIN=${XMPP_AUTH_DOMAIN:-auth.meet.jitsi}
      - XMPP_INTERNAL_MUC_DOMAIN=${XMPP_INTERNAL_MUC_DOMAIN:-internal-muc.meet.jitsi}
      - XMPP_SERVER=${XMPP_SERVER:-prosody.meet.jitsi}
      - JVB_AUTH_USER=${JVB_AUTH_USER:-jvb}
      - JVB_AUTH_PASSWORD=${JVB_AUTH_PASSWORD:-}
      - JVB_AUTH_TOKEN=${JVB_AUTH_TOKEN:-}
      - JVB_BREWERY_MUC=${JVB_BREWERY_MUC:-jvbbrewery}
      - JVB_PORT=${JVB_PORT:-10000}
      - JVB_TCP_HARVESTER_DISABLED=${JVB_TCP_HARVESTER_DISABLED:-}
      - JVB_TCP_PORT=${JVB_TCP_PORT:-4443}
      - JVB_TCP_MAPPED_PORT=${JVB_TCP_MAPPED_PORT:-}
      - JVB_STUN_SERVERS=${JVB_STUN_SERVERS:-}
      - JVB_ENABLE_APIS=${JVB_ENABLE_APIS:-}
      - JVB_WS_DOMAIN=${JVB_WS_DOMAIN:-}
      - JVB_WS_SERVER_ID=${JVB_WS_SERVER_ID:-}
      - PUBLIC_URL=${PUBLIC_URL:-}
      - TZ=${TZ:-}
    networks:
      meet.jitsi:

networks:
  meet.jitsi:
    name: meet.jitsi
```

Create `.env` file:

```bash
# Domain Configuration
PUBLIC_URL=https://videochat.motusdao.org
XMPP_DOMAIN=meet.jitsi
XMPP_AUTH_DOMAIN=auth.meet.jitsi
XMPP_GUEST_DOMAIN=guest.meet.jitsi
XMPP_MUC_DOMAIN=muc.meet.jitsi
XMPP_INTERNAL_MUC_DOMAIN=internal-muc.meet.jitsi
XMPP_RECORDER_DOMAIN=recorder.meet.jitsi

# Let's Encrypt
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=videochat.motusdao.org
LETSENCRYPT_EMAIL=your-email@example.com

# JWT Authentication (Optional but recommended)
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_APP_ID=your-app-id
JWT_APP_SECRET=your-app-secret-min-32-chars

# Ports
HTTP_PORT=80
HTTPS_PORT=443
JVB_PORT=10000
JVB_TCP_PORT=4443

# Configuration directory
CONFIG=/opt/jitsi-meet-cfg
```

### Step 3: Generate JWT Credentials

Generate a secure secret for JWT:

```bash
# Generate a random 32+ character secret
openssl rand -hex 32
```

Use this as your `JWT_APP_SECRET` in the `.env` file. Choose an `JWT_APP_ID` (e.g., `motusdao`).

### Step 4: Start Jitsi

```bash
docker-compose up -d
```

### Step 5: Configure Your Application

Update your `.env.local`:

```env
NEXT_PUBLIC_JITSI_DOMAIN=videochat.motusdao.org
NEXT_PUBLIC_JITSI_ROOM_PREFIX=motusdao-
JITSI_APP_ID=your-app-id
JITSI_APP_SECRET=your-app-secret
```

## Option 2: Using a Cloud Provider

### DigitalOcean Droplet

1. Create a Droplet (4GB RAM minimum recommended)
2. Follow the Docker setup above
3. Configure firewall rules:
   - HTTP (80)
   - HTTPS (443)
   - UDP (10000)

### AWS EC2

1. Launch an EC2 instance (t3.medium or larger)
2. Configure security groups to allow:
   - HTTP (80)
   - HTTPS (443)
   - UDP (10000)
3. Follow the Docker setup above

### Google Cloud Platform

1. Create a Compute Engine instance
2. Configure firewall rules
3. Follow the Docker setup above

## Option 3: Using Jitsi as a Service

If you don't want to self-host, consider:

- **8x8.vc** (formerly Jitsi Meet): Paid service with unlimited duration
- **Whereby**: Alternative video conferencing solution
- **Daily.co**: Video infrastructure as a service

## Verification

After setup, test your server:

1. Visit `https://your-domain.com`
2. Create a test room
3. Join from multiple devices
4. Verify there's no 5-minute limit

## Troubleshooting

### Rooms disconnect after 5 minutes

- Check that you're using your own domain, not `meet.jit.si`
- Verify JWT is configured correctly
- Check server logs: `docker-compose logs -f`

### JWT authentication not working

- Verify `JITSI_APP_ID` and `JITSI_APP_SECRET` match in both:
  - Jitsi server `.env`
  - Your Next.js `.env.local`
- Check that `ENABLE_AUTH=1` and `AUTH_TYPE=jwt` in Jitsi config

### Can't connect to rooms

- Check firewall rules (ports 80, 443, 10000/udp)
- Verify DNS is pointing to your server
- Check SSL certificate is valid

## Security Best Practices

1. **Enable JWT authentication** - Prevents unauthorized room access
2. **Use HTTPS** - Always use Let's Encrypt or similar
3. **Firewall rules** - Only open necessary ports
4. **Regular updates** - Keep Docker images updated
5. **Monitor logs** - Set up log monitoring

## Performance Optimization

For better performance with many concurrent users:

1. **Increase server resources** - More RAM and CPU
2. **Enable recording** - Only if needed (uses more resources)
3. **Configure TURN server** - For better connectivity
4. **Use load balancer** - For multiple JVB instances

## Additional Resources

- [Official Jitsi Documentation](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker)
- [Jitsi Community Forum](https://community.jitsi.org/)
- [JWT Configuration Guide](https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/tokens.md)

## Support

If you encounter issues:
1. Check Jitsi server logs: `docker-compose logs`
2. Verify environment variables are set correctly
3. Test with a simple room first
4. Check the official Jitsi documentation

