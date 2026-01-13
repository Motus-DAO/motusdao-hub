# Análisis del Proyecto y Dashboard de Administración

## 📊 Resumen del Proyecto

**MotusDAO Hub** es una plataforma integral de salud mental que combina:
- Tecnología blockchain (Celo, ZeroDev smart wallets)
- Inteligencia artificial (MotusAI)
- Atención profesional (PSM - Profesionales de Salud Mental)
- Sistema de pagos descentralizado
- Academia con cursos
- Bitácora personal

## 🏗️ Arquitectura Actual

### Modelos de Datos (Prisma)

1. **User** - Usuarios base con roles (usuario/psm)
2. **Profile** - Perfil personal básico
3. **PatientProfile** - Perfil terapéutico de usuarios
4. **PSMProfile** - Perfil profesional de terapeutas
5. **Match** - Emparejamientos entre usuarios y PSM
6. **Session** - Sesiones de terapia
7. **PaymentLog** - Registro de transacciones
8. **PaymentPreference** - Preferencias de pago
9. **Course** - Cursos de la academia
10. **Lesson** - Lecciones de cursos
11. **Enrollment** - Inscripciones a cursos
12. **JournalEntry** - Entradas de bitácora
13. **ContactMessage** - Mensajes de contacto

### Roles Actuales

- **usuario**: Pacientes que buscan terapia
- **psm**: Profesionales de salud mental

**⚠️ Nota**: No existe actualmente un rol `admin` en el schema. Se necesita agregar.

### APIs Existentes

- `/api/profile` - Gestión de perfiles
- `/api/matching/match` - Crear matches automáticos
- `/api/matching/[matchId]` - Gestión de matches
- `/api/sessions` - Gestión de sesiones
- `/api/payment-logs` - Registro de pagos
- `/api/contact` - Mensajes de contacto
- `/api/psm` - Gestión de PSM
- `/api/onboarding/*` - Proceso de registro
- `/api/jitsi/token` - Tokens para videochat
- `/api/bitacora` - Entradas de diario
- `/api/chat` - Chat con MotusAI

## 🎯 Funcionalidades Requeridas para Dashboard Admin

### 1. **Dashboard Overview (Home)**
- **Métricas Principales**:
  - Total de usuarios registrados
  - Total de PSM activos
  - Matches activos
  - Sesiones del día/semana/mes
  - Ingresos totales (pagos)
  - Cursos publicados
  - Mensajes de contacto pendientes

- **Gráficos**:
  - Crecimiento de usuarios (línea de tiempo)
  - Distribución de roles (pie chart)
  - Sesiones por estado (bar chart)
  - Ingresos por período (line chart)
  - Top PSM por número de matches
  - Top cursos por inscripciones

- **Actividad Reciente**:
  - Últimos usuarios registrados
  - Últimas sesiones creadas
  - Últimos pagos
  - Últimos mensajes de contacto

### 2. **Gestión de Usuarios**
- **Listado de Usuarios**:
  - Tabla con búsqueda y filtros
  - Filtros: rol, estado de registro, fecha de creación
  - Columnas: nombre, email, rol, wallet, registro completado, fecha
  - Acciones: ver detalle, editar, activar/desactivar, eliminar

- **Detalle de Usuario**:
  - Información personal completa
  - Perfil (Profile, PatientProfile o PSMProfile)
  - Historial de matches
  - Historial de sesiones
  - Historial de pagos
  - Entradas de bitácora (si aplica)
  - Inscripciones a cursos

- **Acciones**:
  - Editar información
  - Cambiar rol (usuario ↔ psm)
  - Marcar registro como completado/pendiente
  - Ver/editar wallet addresses
  - Eliminar usuario (con confirmación)

### 3. **Gestión de PSM (Profesionales)**
- **Listado de PSM**:
  - Tabla con información profesional
  - Filtros: especialidades, experiencia, estado
  - Métricas: número de matches activos, sesiones completadas
  - Verificación de cédula profesional

- **Detalle de PSM**:
  - Información profesional completa
  - Cédula profesional
  - Especialidades
  - Años de experiencia
  - Participaciones (supervisión, cursos, investigación, comunidad)
  - Lista de matches activos
  - Historial de sesiones
  - Ingresos recibidos

- **Acciones**:
  - Verificar/desverificar PSM
  - Editar información profesional
  - Ver matches y sesiones
  - Exportar datos

### 4. **Gestión de Matches**
- **Listado de Matches**:
  - Tabla con todos los matches
  - Filtros: estado (active/paused/ended), fecha, usuario, PSM
  - Información: usuario, PSM, fecha de match, estado, razón de finalización

- **Acciones**:
  - Ver detalle del match
  - Pausar match
  - Finalizar match (con razón)
  - Crear match manualmente
  - Ver sesiones relacionadas

### 5. **Gestión de Sesiones**
- **Listado de Sesiones**:
  - Tabla con todas las sesiones
  - Filtros: estado, fecha, usuario, PSM
  - Estados: requested, accepted, completed, cancelled
  - Información: usuario, PSM, fecha, estado, URL externa (Jitsi)

- **Acciones**:
  - Ver detalle de sesión
  - Cambiar estado manualmente
  - Ver URL de videochat
  - Exportar reporte de sesiones

### 6. **Gestión de Pagos**
- **Listado de Pagos**:
  - Tabla con todas las transacciones
  - Filtros: destino, moneda, fecha, usuario
  - Información: remitente, destinatario, monto, moneda, hash, fecha

- **Reportes Financieros**:
  - Ingresos totales por período
  - Ingresos por destino (own_wallet, matched_psm, dao_treasury)
  - Ingresos por moneda (CELO, cUSD, cEUR)
  - Top usuarios por volumen de pagos
  - Top PSM por ingresos recibidos

- **Acciones**:
  - Ver detalle de transacción
  - Ver en explorador de blockchain
  - Exportar reportes

### 7. **Gestión de Cursos**
- **Listado de Cursos**:
  - Tabla con todos los cursos
  - Filtros: publicado/no publicado, fecha
  - Información: título, slug, estado, lecciones, inscripciones

- **CRUD de Cursos**:
  - Crear nuevo curso
  - Editar curso existente
  - Publicar/despublicar curso
  - Eliminar curso

- **Gestión de Lecciones**:
  - Ver lecciones de un curso
  - Crear/editar/eliminar lecciones
  - Reordenar lecciones

- **Estadísticas**:
  - Inscripciones por curso
  - Progreso promedio
  - Cursos más populares

### 8. **Mensajes de Contacto**
- **Listado de Mensajes**:
  - Tabla con todos los mensajes
  - Filtros: fecha, usuario asociado
  - Información: nombre, email, mensaje, fecha, usuario (si aplica)

- **Acciones**:
  - Ver mensaje completo
  - Responder (abrir email client)
  - Marcar como leído/no leído
  - Eliminar mensaje

### 9. **Reportes y Analytics**
- **Reportes Disponibles**:
  - Reporte de usuarios (crecimiento, distribución)
  - Reporte de matches (tasa de éxito, duración promedio)
  - Reporte de sesiones (completadas vs canceladas)
  - Reporte financiero (ingresos, gastos)
  - Reporte de cursos (inscripciones, completados)

- **Exportación**:
  - Exportar a CSV
  - Exportar a PDF
  - Programar reportes automáticos

### 10. **Configuración del Sistema**
- **Ajustes Generales**:
  - Configuración de Jitsi
  - Configuración de pagos
  - Configuración de blockchain
  - Variables de entorno (solo lectura)

- **Gestión de Roles**:
  - Ver usuarios por rol
  - Cambiar roles de usuarios

- **Logs del Sistema**:
  - Ver logs de errores
  - Ver actividad reciente
  - Filtrar por tipo de evento

## 🔐 Sistema de Autenticación y Autorización

### Requisitos

1. **Rol Admin en Schema**:
   - Agregar `admin` al enum `Role` en Prisma
   - Migración de base de datos

2. **Middleware de Autorización**:
   - Verificar rol admin en rutas protegidas
   - Redirigir si no es admin

3. **Protección de Rutas**:
   - `/admin/*` - Solo accesible para admins
   - Verificar en middleware y componentes

4. **Asignación de Rol Admin**:
   - Manualmente en base de datos
   - O crear endpoint para asignar (protegido)

## 📁 Estructura Propuesta

```
app/
  admin/
    page.tsx                    # Dashboard overview
    usuarios/
      page.tsx                  # Listado de usuarios
      [userId]/
        page.tsx                # Detalle de usuario
    psm/
      page.tsx                  # Listado de PSM
      [psmId]/
        page.tsx                # Detalle de PSM
    matches/
      page.tsx                  # Listado de matches
      [matchId]/
        page.tsx                # Detalle de match
    sesiones/
      page.tsx                  # Listado de sesiones
      [sessionId]/
        page.tsx                # Detalle de sesión
    pagos/
      page.tsx                  # Listado de pagos
      reportes/
        page.tsx                # Reportes financieros
    cursos/
      page.tsx                  # Listado de cursos
      [courseId]/
        page.tsx                # Detalle y edición de curso
    mensajes/
      page.tsx                  # Mensajes de contacto
    reportes/
      page.tsx                  # Reportes y analytics
    configuracion/
      page.tsx                  # Configuración del sistema

app/api/admin/
  stats/
    route.ts                    # Estadísticas generales
  users/
    route.ts                    # CRUD de usuarios
    [userId]/
      route.ts                  # Operaciones específicas
  matches/
    route.ts                    # Listar todos los matches
  sessions/
    route.ts                    # Listar todas las sesiones
  payments/
    route.ts                    # Listar todos los pagos
  courses/
    route.ts                    # CRUD de cursos
  messages/
    route.ts                    # Gestión de mensajes
  reports/
    route.ts                    # Generar reportes
```

## 🎨 Componentes Necesarios

### Componentes de UI
- `AdminLayout` - Layout específico para admin
- `AdminSidebar` - Sidebar de navegación admin
- `StatsCard` - Tarjeta de métricas
- `DataTable` - Tabla de datos con paginación y filtros
- `UserDetailModal` - Modal de detalle de usuario
- `PSMDetailModal` - Modal de detalle de PSM
- `MatchDetailModal` - Modal de detalle de match
- `SessionDetailModal` - Modal de detalle de sesión
- `PaymentDetailModal` - Modal de detalle de pago
- `CourseEditor` - Editor de cursos
- `Chart` - Componentes de gráficos (recharts o similar)
- `ExportButton` - Botón para exportar datos
- `ConfirmDialog` - Diálogo de confirmación

## 🚀 Plan de Implementación

### Fase 1: Infraestructura Base
1. Agregar rol `admin` al schema
2. Crear middleware de autorización
3. Crear layout de admin
4. Crear rutas base del dashboard

### Fase 2: Dashboard Overview
1. API de estadísticas
2. Componentes de métricas
3. Gráficos básicos
4. Actividad reciente

### Fase 3: Gestión de Usuarios
1. API de usuarios
2. Listado con filtros
3. Detalle de usuario
4. Acciones CRUD

### Fase 4: Gestión de PSM
1. API de PSM
2. Listado con métricas
3. Detalle de PSM
4. Verificación de profesionales

### Fase 5: Gestión de Matches y Sesiones
1. APIs de matches y sesiones
2. Listados con filtros
3. Acciones de gestión

### Fase 6: Gestión de Pagos y Reportes
1. API de pagos
2. Reportes financieros
3. Exportación de datos

### Fase 7: Gestión de Cursos
1. API de cursos
2. Editor de cursos
3. Gestión de lecciones

### Fase 8: Mensajes y Configuración
1. Gestión de mensajes
2. Panel de configuración
3. Logs del sistema

## 📝 Notas Importantes

1. **Seguridad**: Todas las rutas admin deben verificar el rol
2. **Performance**: Implementar paginación en todas las listas
3. **UX**: Mantener el diseño glassmorphism consistente
4. **Responsive**: Dashboard debe ser responsive
5. **Validación**: Validar todas las acciones del admin
6. **Logging**: Registrar todas las acciones administrativas

## 🔄 Consideraciones Futuras

- Sistema de permisos granular (no solo admin)
- Notificaciones en tiempo real
- Dashboard de analytics avanzado
- Integración con herramientas de BI
- API de webhooks para eventos importantes










