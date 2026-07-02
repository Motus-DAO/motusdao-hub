# Diagnóstico: Error 500 en Base de Datos en Vercel

## 🔍 Análisis del Problema

Basado en los logs y la documentación de Supabase, el problema más probable es que la `DATABASE_URL` en Vercel no está configurada correctamente para serverless functions.

## 📋 Información del Proyecto Supabase

- **Project ID**: `ryjkpaiknsnjyydxwugl`
- **Región**: `us-west-1`
- **Estado**: ACTIVE_HEALTHY ✅
- **Host**: `db.ryjkpaiknsnjyydxwugl.supabase.co`

## 🎯 Solución Requerida

### Para Vercel (Serverless Functions)

**DEBES usar Transaction Mode (puerto 6543) con parámetros específicos para Prisma.**

### Formato Correcto de DATABASE_URL

La URL debe tener este formato exacto:

```
postgres://postgres.ryjkpaiknsnjyydxwugl:[TU-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Parámetros importantes:**
- ✅ Puerto **6543** (Transaction mode para serverless)
- ✅ `?pgbouncer=true` (desactiva prepared statements que Prisma intenta usar)
- ✅ `&connection_limit=1` (recomendado para serverless, evita agotar conexiones)

## 📝 Pasos para Resolver

### Paso 1: Obtener la URL Correcta desde Supabase Dashboard

1. Ve a: https://supabase.com/dashboard/project/ryjkpaiknsnjyydxwugl
2. Haz clic en el botón **"Connect"** (arriba a la derecha)
3. Selecciona la pestaña **"Connection Pooling"**
4. Selecciona **"Transaction"** mode (no Session)
5. Copia la **Connection String** que muestra
6. **IMPORTANTE**: Agrega estos parámetros al final:
   - Si no tiene `?pgbouncer=true`, agrégalo
   - Si no tiene `&connection_limit=1`, agrégalo

**Ejemplo de URL completa:**
```
postgres://postgres.ryjkpaiknsnjyydxwugl:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### Paso 2: Configurar en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com
2. Ve a **Settings** → **Environment Variables**
3. Busca `DATABASE_URL` o créala si no existe
4. **Actualiza** con la URL del paso anterior (con los parámetros `?pgbouncer=true&connection_limit=1`)
5. Asegúrate de seleccionar:
   - ✅ **Production**
   - ✅ **Preview** 
   - ✅ **Development** (si quieres)
6. **Guarda** los cambios

### Paso 3: Redeploy

**CRÍTICO**: Después de cambiar variables de entorno, debes hacer redeploy:

1. En Vercel, ve a **Deployments**
2. Encuentra el deployment más reciente
3. Haz clic en los **3 puntos** (⋯) → **Redeploy**
4. O mejor aún, haz un **nuevo commit** y push para trigger un nuevo deployment

### Paso 4: Verificar

1. Visita: `https://motusdao-hub.vercel.app/api/health/db`
2. Deberías ver:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "databaseUrlFormat": "pooled"
   }
   ```

## 🔧 Si Aún No Funciona

### Verificar en Supabase Dashboard

1. Ve a **Settings** → **Database** → **Connection Pooling**
2. Verifica que:
   - ✅ **Pool Size**: 15 (o más si es necesario)
   - ✅ **Max Client Connections**: 200
   - ✅ El modo **Transaction** esté habilitado

### Verificar Logs de Vercel

1. Ve a **Deployments** → Selecciona el deployment
2. Haz clic en **Functions** → `api/admin/matches`
3. Revisa los logs para ver el error específico
4. Los nuevos logs incluyen diagnósticos mejorados

### Posibles Problemas Adicionales

#### Problema 1: Base de Datos Pausada
- Supabase pausa bases de datos inactivas en el plan gratuito
- **Solución**: Ve al dashboard y "unpause" la base de datos si está pausada

#### Problema 2: Password Incorrecta
- Verifica que la password en `DATABASE_URL` sea correcta
- **Solución**: Puedes resetear la password en Supabase Dashboard → Settings → Database

#### Problema 3: URL Mal Formada
- Asegúrate de que la URL tenga exactamente este formato
- **Solución**: Usa el botón "Connect" en Supabase y copia la URL exacta

## 📊 Comparación: Antes vs Ahora

### ❌ Formato Incorrecto (causa errores)
```
postgresql://postgres:[password]@db.ryjkpaiknsnjyydxwugl.supabase.co:5432/postgres
```
- Puerto 5432 (direct connection, no funciona bien en serverless)
- Sin `pgbouncer=true` (Prisma intenta usar prepared statements)
- Sin `connection_limit` (puede agotar conexiones)

### ✅ Formato Correcto (para Vercel)
```
postgres://postgres.ryjkpaiknsnjyydxwugl:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```
- Puerto 6543 (Transaction mode para serverless)
- `pgbouncer=true` (compatible con Prisma)
- `connection_limit=1` (optimizado para serverless)

## 🧪 Testing Local vs Production

### Local Development
Puedes usar la conexión directa (puerto 5432) localmente:
```
DATABASE_URL="postgresql://postgres:[password]@db.ryjkpaiknsnjyydxwugl.supabase.co:5432/postgres"
```

### Production (Vercel)
**SIEMPRE** usa Transaction mode (puerto 6543):
```
DATABASE_URL="postgres://postgres.ryjkpaiknsnjyydxwugl:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

## 📚 Referencias

- [Supabase: Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Supabase: Prisma Troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
- [Supabase: Serverless Drivers](https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers)

## ✅ Checklist Final

- [ ] Obtuve la URL de Transaction mode desde Supabase Dashboard
- [ ] Agregué `?pgbouncer=true` a la URL
- [ ] Agregué `&connection_limit=1` a la URL
- [ ] Actualicé `DATABASE_URL` en Vercel Environment Variables
- [ ] Seleccioné Production, Preview, y Development
- [ ] Hice redeploy de la aplicación en Vercel
- [ ] Verifiqué `/api/health/db` y funciona correctamente
- [ ] Probé `/api/admin/matches` y ya no da error 500










