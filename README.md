# MotusDAO Hub

Una plataforma integral de salud mental que combina tecnología blockchain, inteligencia artificial y atención profesional para el bienestar mental.

## 🚀 Características

- **MotusAI**: Asistente de IA especializado en salud mental
- **Psicoterapia**: Conecta con profesionales de la salud mental
- **Academia**: Cursos y recursos para el bienestar mental
- **Bitácora**: Diario personal para reflexionar sobre emociones
- **Sistema de Pagos**: Pagos descentralizados (en desarrollo)
- **Documentación**: Recursos completos de la plataforma

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15+ con App Router, TypeScript
- **Styling**: Tailwind CSS con glassmorphism e iridiscencias
- **UI Components**: shadcn/ui, Lucide React
- **Animaciones**: Framer Motion, Three.js
- **Estado**: Zustand
- **Base de Datos**: Prisma ORM con SQLite (dev) / PostgreSQL (prod)
- **Autenticación**: Privy (smart accounts)
- **Blockchain**: Viem para interacciones con wallets

## 🎨 Diseño

- **Tipografías**: Jura (headings) y Inter (texto)
- **Colores**: Esquema morado/iris con gradientes iridiscentes
- **Estilo**: Glassmorphism, minimalista, futurista
- **Tema**: Dark/Light mode con persistencia
- **Responsive**: Diseño adaptativo para todos los dispositivos

## 🏗️ Estructura del Proyecto

```
motusdao-hub/
├── app/                    # App Router de Next.js
│   ├── (app)/             # Rutas principales
│   │   ├── page.tsx       # Home
│   │   ├── motusai/       # MotusAI
│   │   ├── psicoterapia/  # Psicoterapia
│   │   ├── academia/      # Academia
│   │   ├── bitacora/      # Bitácora
│   │   ├── perfil/        # Perfil
│   │   └── docs/          # Documentación
│   └── api/               # API Routes
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes base
│   ├── layout/           # Layout components
│   ├── forms/            # Formularios
│   └── three/            # Componentes 3D
├── lib/                  # Utilidades y configuración
├── prisma/               # Schema y seeds
└── styles/               # Estilos globales
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+ 
- npm o yarn

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd motusdao-hub
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear archivo `.env.local` con las siguientes variables:
   ```env
   # Privy Authentication Configuration
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
   PRIVY_APP_SECRET=your_privy_app_secret_here
   
   # Database URL for Prisma (if needed)
   # DATABASE_URL="file:./dev.db"
   ```
   
   **⚠️ Importante**: Nunca commites el archivo `.env.local` ya que contiene claves secretas.

4. **Configurar base de datos**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

La aplicación estará disponible en `http://localhost:3000`

## 🎯 Sistema de Onboarding

### Flujo de Registro Multi-Paso

El sistema incluye un flujo de registro completo que se inicia al hacer clic en "Comenzar ahora":

1. **Selector de Rol**: Modal para elegir entre Usuario o Profesional de Salud Mental
2. **Conexión**: Conectar wallet (Privy) + validar email
3. **Perfil**: Información personal básica
4. **Perfil Específico**: 
   - **Usuario**: Perfil terapéutico (tipo de atención, motivo de consulta)
   - **PSM**: Datos profesionales (cédula, especialidades, experiencia)
5. **Revisión**: Verificar toda la información
6. **Blockchain**: Registro on-chain (placeholder)
7. **Éxito**: Redirección según el rol

### Características del Onboarding

- ✅ **Validaciones robustas** con Zod y React Hook Form
- ✅ **Persistencia parcial** en localStorage (Zustand)
- ✅ **Diseño responsive** con glassmorphism
- ✅ **Estados de carga** y manejo de errores
- ✅ **Integración con Privy** para autenticación
- ✅ **API routes** para registro off-chain
- ✅ **Base de datos** con modelos específicos por rol

### Probar el Onboarding

1. Ve a `http://localhost:3000`
2. Haz clic en "Comenzar ahora"
3. Selecciona tu rol (Usuario o PSM)
4. Completa el flujo de registro
5. Verifica que los datos se guarden correctamente

## 📱 Funcionalidades por Rol

### Usuario
- Inicio con hero animado y aplicaciones destacadas
- MotusAI para asistencia en salud mental
- Psicoterapia para conectar con profesionales
- Academia con cursos de bienestar mental
- Bitácora personal para reflexiones
- Perfil personalizable

### PSM (Profesional de Salud Mental)
- Todas las funcionalidades de Usuario
- Mis usuarios: gestión de pacientes
- Supervisión: revisión de casos de terapia
- Herramientas profesionales especializadas

## 🎯 Características Técnicas

### Autenticación
- Integración con Privy para smart accounts
- Conexión de wallets
- Gestión de sesiones

### Base de Datos
- Modelos para usuarios, perfiles, cursos, lecciones
- Sistema de bitácora con entradas de diario
- Mensajes de contacto
- Enrollments en cursos

### UI/UX
- Diseño glassmorphism con efectos de blur
- Gradientes iridiscentes
- Animaciones suaves con Framer Motion
- Componente 3D con Three.js (ADNBackdrop)
- Tema oscuro/claro persistente

### API
- Rutas RESTful para todas las funcionalidades
- Validación de datos
- Manejo de errores
- Paginación

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo con Turbopack
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linting con ESLint
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Sincronizar schema con DB
npm run db:seed      # Poblar DB con datos de ejemplo
```

## 🚧 Estado del Proyecto

### ✅ Completado
- [x] Estructura base de Next.js 15+ con TypeScript
- [x] Configuración de Tailwind con glassmorphism
- [x] Componentes UI reutilizables
- [x] Sistema de roles (Usuario/PSM)
- [x] Navegación dinámica por rol
- [x] Todas las páginas principales
- [x] Integración con Prisma y SQLite
- [x] API routes para formularios
- [x] Sistema de bitácora funcional
- [x] Componente 3D con Three.js
- [x] Documentación integrada
- [x] Footer con formulario de contacto
- [x] Datos de ejemplo (seeds)
- [x] **Sistema de onboarding multi-paso**
- [x] **Integración completa con Privy**
- [x] **Registro de usuarios y profesionales**
- [x] **Validaciones con Zod y React Hook Form**

### 🚧 En Desarrollo
- [ ] Sistema de pagos con Transak/MiniPay
- [ ] Integración con LLM para MotusAI
- [ ] Sistema de notificaciones
- [ ] Chat en tiempo real

### 🌊 Infraestructura On‑chain

- **Motus Name Service (MNS)**  
  - Contrato: `MotusNameService.sol`  
  - Red: Celo Mainnet (42220)  
  - Dirección: `0x4eB280b21de012FCAe14c9aB2D29b298c0A91d1c`

- **Motus Celo Faucet**  
  - Contrato: `MotusCeloFaucet.sol`  
  - Red: Celo Mainnet (42220)  
  - Dirección: `0x6d252282fE35EF90B5d80b911d121183D7A0CEbF`  
  - Drip inicial: `0.01 CELO` por address (máximo 1 vez)

- **Motus Clinical Profile NFT**  
  - Contrato: `MotusClinicalProfile.sol`  
  - Red: Celo Mainnet (42220)  
  - Dirección: `0x3343BDc2bfB3C37405c12AD916bb81e88410a1f5`

### 📋 Próximas Funcionalidades
- [ ] Sistema de citas para psicoterapia
- [ ] Integración con calendarios
- [ ] Sistema de pagos descentralizado
- [ ] Marketplace de servicios
- [ ] Análisis de progreso con IA
- [ ] Aplicación móvil

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Contacto

- **Email**: contacto@motusdao.com
- **Website**: [MotusDAO Hub](https://motusdao.com)
- **Documentación**: `/docs` en la aplicación

---

**MotusDAO Hub** - Revolucionando la salud mental con tecnología blockchain 🧠✨# Force redeploy - Sat Sep 13 23:13:27 CST 2025
