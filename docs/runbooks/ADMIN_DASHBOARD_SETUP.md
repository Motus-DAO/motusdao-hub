# Dashboard de Administración - Guía de Configuración

## 📋 Resumen

Se ha creado la estructura base del dashboard de administración en `/admin` con las siguientes funcionalidades:

- ✅ Rol `admin` agregado al schema de Prisma
- ✅ Layout de administración con sidebar
- ✅ Página principal con métricas y estadísticas
- ✅ Sistema de autorización basado en roles
- ✅ APIs para estadísticas y actividad reciente

## 🚀 Configuración Inicial

### 1. Actualizar el Schema de Prisma

El rol `admin` ya ha sido agregado al enum `Role`. Ahora necesitas:

```bash
# Generar el cliente de Prisma con el nuevo rol
npm run db:generate

# Aplicar los cambios a la base de datos
npm run db:push
```

### 2. Asignar Rol Admin a un Usuario

Para asignar el rol `admin` a un usuario, puedes hacerlo de varias formas:

#### Opción A: Usando Prisma Studio

```bash
npm run db:studio
```

1. Abre Prisma Studio
2. Ve a la tabla `users`
3. Encuentra el usuario que quieres hacer admin
4. Cambia el campo `role` de `usuario` o `psm` a `admin`
5. Guarda los cambios

#### Opción B: Usando SQL directo

```sql
-- Reemplaza 'user-email@example.com' con el email del usuario
UPDATE users 
SET role = 'admin' 
WHERE email = 'user-email@example.com';
```

#### Opción C: Crear un script de migración

Crea un archivo `prisma/scripts/assign-admin.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@motusdao.com' // Cambia por el email del admin
  
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'admin' }
  })
  
  console.log(`✅ Usuario ${user.email} ahora es admin`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## 🔐 Acceso al Dashboard

1. **Inicia sesión** en la aplicación con una cuenta que tenga rol `admin`
2. **Navega a** `/admin` en tu navegador
3. El sistema verificará automáticamente si tienes permisos de admin
4. Si no eres admin, serás redirigido a la página principal

## 📊 Funcionalidades Actuales

### Dashboard Principal (`/admin`)

- **Métricas principales**:
  - Total de usuarios
  - Total de profesionales (PSM)
  - Matches activos
  - Sesiones del día/semana/mes
  - Ingresos totales
  - Cursos publicados
  - Inscripciones
  - Mensajes pendientes

- **Actividad reciente**:
  - Últimos usuarios registrados
  - Últimos matches creados
  - Últimas sesiones
  - Últimos pagos
  - Últimos mensajes de contacto

### Navegación

El sidebar incluye enlaces a (pendientes de implementar):
- `/admin/usuarios` - Gestión de usuarios
- `/admin/psm` - Gestión de profesionales
- `/admin/matches` - Gestión de matches
- `/admin/sesiones` - Gestión de sesiones
- `/admin/pagos` - Gestión de pagos
- `/admin/cursos` - Gestión de cursos
- `/admin/mensajes` - Mensajes de contacto
- `/admin/reportes` - Reportes y analytics
- `/admin/configuracion` - Configuración del sistema

## 🛠️ APIs Disponibles

### `GET /api/admin/check-access?privyId={privyId}`
Verifica si un usuario tiene permisos de admin.

**Respuesta:**
```json
{
  "isAdmin": true,
  "role": "admin"
}
```

### `GET /api/admin/stats?privyId={privyId}`
Obtiene estadísticas generales del dashboard.

**Respuesta:**
```json
{
  "totalUsers": 150,
  "totalPSM": 25,
  "totalAdmins": 2,
  "activeMatches": 45,
  "sessionsToday": 12,
  "sessionsThisWeek": 85,
  "sessionsThisMonth": 320,
  "totalPayments": 250,
  "totalRevenue": "$12,450.00",
  "publishedCourses": 8,
  "totalEnrollments": 180,
  "unreadMessages": 5,
  "usersGrowth": 15,
  "matchesGrowth": 8
}
```

### `GET /api/admin/recent-activity?privyId={privyId}`
Obtiene la actividad reciente de la plataforma.

**Respuesta:**
```json
{
  "activities": [
    {
      "id": "user-123",
      "type": "user_registered",
      "title": "Nuevo usuario registrado",
      "description": "Juan Pérez (juan@example.com)",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## 🔒 Seguridad

- Todas las rutas `/admin/*` están protegidas
- Solo usuarios con rol `admin` pueden acceder
- Las APIs verifican el rol antes de devolver datos
- El sistema redirige automáticamente a usuarios no autorizados

## 📝 Próximos Pasos

Para completar el dashboard, se deben implementar:

1. **Gestión de Usuarios** (`/admin/usuarios`)
   - Listado con búsqueda y filtros
   - Detalle de usuario
   - Edición de información
   - Cambio de roles

2. **Gestión de PSM** (`/admin/psm`)
   - Listado de profesionales
   - Verificación de cédulas
   - Estadísticas por PSM

3. **Gestión de Matches** (`/admin/matches`)
   - Listado de matches
   - Pausar/finalizar matches
   - Crear matches manualmente

4. **Gestión de Sesiones** (`/admin/sesiones`)
   - Listado de sesiones
   - Cambio de estados
   - Acceso a URLs de videochat

5. **Gestión de Pagos** (`/admin/pagos`)
   - Listado de transacciones
   - Reportes financieros
   - Exportación de datos

6. **Gestión de Cursos** (`/admin/cursos`)
   - CRUD de cursos
   - Gestión de lecciones
   - Estadísticas de inscripciones

7. **Mensajes** (`/admin/mensajes`)
   - Listado de mensajes
   - Respuestas
   - Marcar como leído

8. **Reportes** (`/admin/reportes`)
   - Gráficos avanzados
   - Exportación CSV/PDF
   - Reportes programados

9. **Configuración** (`/admin/configuracion`)
   - Ajustes del sistema
   - Logs
   - Variables de entorno

## 🐛 Troubleshooting

### Error: "Acceso Denegado"
- Verifica que el usuario tenga rol `admin` en la base de datos
- Asegúrate de estar autenticado con Privy
- Verifica que el `privyId` coincida en la base de datos

### Error: "User not found"
- El usuario debe estar registrado en la base de datos
- Verifica que el `privyId` esté correctamente guardado

### Las estadísticas no se cargan
- Verifica que las APIs estén funcionando correctamente
- Revisa la consola del navegador para errores
- Asegúrate de que el `privyId` se esté pasando correctamente

## 📚 Referencias

- Ver `ADMIN_DASHBOARD_ANALYSIS.md` para el análisis completo
- Ver `prisma/schema.prisma` para el schema actualizado
- Ver `app/admin/` para la estructura del dashboard










