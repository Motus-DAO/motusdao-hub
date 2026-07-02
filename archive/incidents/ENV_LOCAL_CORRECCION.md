# Corrección de .env.local

## 🔧 Cambios Necesarios

Edita manualmente tu archivo `.env.local` y reemplaza las líneas de `DATABASE_URL` y `DIRECT_URL`:

### ❌ Líneas Actuales (INCORRECTAS):
```bash
DATABASE_URL="postgresql://postgres:0199384jjdjdn@db.ryjkpaiknsnjyydxwugl.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres.ryjkpaiknsnjyydxwugl:[0199384jjdjdn]@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
```

### ✅ Líneas Correctas (REEMPLAZAR):
```bash
# Para Vercel/Serverless: Usa Transaction mode (puerto 6543) con connection pooling
DATABASE_URL="postgresql://postgres.ryjkpaiknsnjyydxwugl:0199384jjdjdn@aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Para migraciones: Conexión directa (puerto 5432)
DIRECT_URL="postgresql://postgres.ryjkpaiknsnjyydxwugl:0199384jjdjdn@db.ryjkpaiknsnjyydxwugl.supabase.co:5432/postgres"
```

## 📝 Explicación de los Cambios

### DATABASE_URL (para Vercel/Producción):
1. **Formato del usuario**: `postgres.ryjkpaiknsnjyydxwugl` (no solo `postgres`)
2. **Host**: `aws-1-us-west-1.pooler.supabase.com` (connection pooler)
3. **Puerto**: `6543` (Transaction mode para serverless)
4. **Parámetros**: `?pgbouncer=true&connection_limit=1` (necesarios para Prisma en serverless)

### DIRECT_URL (para migraciones):
1. **Quita los corchetes**: `[0199384jjdjdn]` → `0199384jjdjdn`
2. **Host**: `db.ryjkpaiknsnjyydxwugl.supabase.co` (conexión directa)
3. **Puerto**: `5432` (conexión directa)

## ⚠️ Importante

- **NO dejes los corchetes `[]`** - son solo placeholders
- **Tu contraseña es**: `0199384jjdjdn` (sin corchetes)
- **DATABASE_URL** debe tener `?pgbouncer=true&connection_limit=1` al final
- **DIRECT_URL** es para migraciones locales, no para producción

## 🚀 Después de Cambiar

1. Guarda el archivo `.env.local`
2. Reinicia tu servidor de desarrollo: `npm run dev`
3. Prueba la conexión: `npm run diagnose:db`

## 📋 Para Vercel

Cuando configures en Vercel, usa **solo** la `DATABASE_URL` (sin `DIRECT_URL`):

```
DATABASE_URL="postgresql://postgres.ryjkpaiknsnjyydxwugl:0199384jjdjdn@aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

**NO** configures `DIRECT_URL` en Vercel, solo se usa localmente para migraciones.










