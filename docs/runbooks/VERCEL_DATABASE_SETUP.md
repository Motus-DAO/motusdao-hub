# Configuración de Base de Datos para Vercel

## Problema Común: Error 500 en Endpoints de Base de Datos

Si estás experimentando errores 500 en endpoints que usan Prisma (como `/api/admin/matches`), el problema más común es la configuración incorrecta de la conexión a la base de datos en Vercel.

## Solución: Usar Connection Pooling

### Para Supabase

Supabase requiere usar **connection pooling** en Vercel debido a las limitaciones de conexiones en serverless functions.

#### 1. Obtener la URL de Connection Pooler

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings** → **Database**
3. Busca la sección **Connection Pooling**
4. Copia la **Connection String** que usa el puerto **6543** (no el 5432)

El formato debería ser algo como:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### 2. Configurar en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com)
2. Ve a **Settings** → **Environment Variables**
3. Agrega o actualiza `DATABASE_URL` con la URL del connection pooler
4. Asegúrate de seleccionar **Production**, **Preview**, y **Development** según necesites
5. **Redeploy** tu aplicación después de agregar/actualizar la variable

### Para Otros Proveedores de PostgreSQL

Si usas otro proveedor (como Neon, Railway, etc.), verifica su documentación sobre connection pooling para Vercel.

## Verificación

### 1. Verificar Variables de Entorno

Después de configurar `DATABASE_URL` en Vercel, verifica que esté disponible:

```bash
# El endpoint de health check te dirá si está configurada
curl https://tu-app.vercel.app/api/health/db
```

### 2. Revisar Logs de Vercel

1. Ve a tu proyecto en Vercel
2. Ve a **Deployments** → Selecciona el deployment más reciente
3. Haz clic en **Functions** → Selecciona el endpoint que falla (ej: `api/admin/matches`)
4. Revisa los logs para ver el error específico

Los logs ahora incluyen diagnósticos mejorados que te dirán exactamente qué está mal.

### 3. Endpoint de Diagnóstico

El endpoint `/api/health/db` ahora proporciona información detallada:

- ✅ Si la conexión funciona
- ❌ Si hay errores, incluye diagnóstico específico
- 💡 Sugerencias para resolver el problema

## Errores Comunes y Soluciones

### Error: "Can't reach database server" (P1001)

**Causa**: La URL de la base de datos es incorrecta o el servidor no es accesible.

**Solución**:
- Verifica que `DATABASE_URL` esté configurada en Vercel
- Para Supabase, usa la URL del connection pooler (puerto 6543)
- Verifica que la base de datos no esté pausada (Supabase pausa bases de datos inactivas en el plan gratuito)

### Error: "Server has closed the connection" (P1017)

**Causa**: Estás usando una conexión directa en lugar de connection pooling.

**Solución**:
- Cambia a la URL del connection pooler
- Para Supabase: usa el puerto 6543 con `?pgbouncer=true`
- No uses la conexión directa (puerto 5432) en Vercel

### Error: "Database does not exist" (P1003)

**Causa**: El nombre de la base de datos en la URL es incorrecto.

**Solución**:
- Verifica el nombre de la base de datos en tu `DATABASE_URL`
- Para Supabase, generalmente es `postgres`

### Error: "Connection timeout"

**Causa**: La base de datos está sobrecargada o inaccesible.

**Solución**:
- Verifica que la base de datos esté activa (no pausada)
- Revisa si hay límites de conexión en tu plan
- Considera usar connection pooling si no lo estás usando

## Configuración Recomendada

### Variables de Entorno en Vercel

Asegúrate de tener estas variables configuradas:

```
DATABASE_URL=postgresql://... (connection pooler URL para Supabase)
NODE_ENV=production
```

### Prisma Schema

El schema de Prisma ya está configurado correctamente:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Build Scripts

El `package.json` ya incluye la generación de Prisma Client:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build --turbopack"
  }
}
```

## Testing Local vs Production

### Local Development

Para desarrollo local, puedes usar:
- SQLite: `DATABASE_URL="file:./dev.db"`
- PostgreSQL directo: `DATABASE_URL="postgresql://..."` (puerto 5432)

### Production (Vercel)

**Siempre** usa connection pooling:
- Supabase: puerto 6543 con `?pgbouncer=true`
- Otros proveedores: consulta su documentación

## Pasos de Troubleshooting

1. ✅ Verifica que `DATABASE_URL` esté configurada en Vercel
2. ✅ Verifica que uses connection pooling (puerto 6543 para Supabase)
3. ✅ Revisa los logs de Vercel para el error específico
4. ✅ Usa `/api/health/db` para diagnóstico
5. ✅ Verifica que la base de datos no esté pausada
6. ✅ Redeploy después de cambiar variables de entorno

## Build time (expectations + do-not)

Baseline for this repo on Vercel is often **~6–8 minutes** (many API routes, Prisma, heavy deps). Micro-optimizations rarely reach **~2 minutes** without architectural change.

**Do not** add `docs/` to `.vercelignore` or `outputFileTracingExcludes` for `./docs/**`. Legal pages prerender at build time and read markdown from:

- `docs/compliance/legal/aviso-de-privacidad-integral.md` (`/privacy`)
- `docs/compliance/legal/terminos-y-condiciones.md`, cookies, subprocesadores (`lib/legal/load-legal-markdown.ts`)

A deploy that excludes those paths fails with `ENOENT` on `/privacy`. If optimizing deploy size, exclude only `archive/`, `specs/`, `infra/`, `jitsi/`, `scripts/` — never `docs/compliance/legal/`.

Reverted Oct 2026: full Vercel “lean deploy” experiment (`6268591`) broke prod; **HEAD restored** to pre-optimization `vercel.json` / `next.config.ts`.

## Recursos

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)










