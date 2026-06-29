import { PrismaClient } from '@prisma/client'
import { seedAcademyRuta } from './data/academy-ruta'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: 'usuario@motusdao.com' },
    update: {},
    create: {
      email: 'usuario@motusdao.com',
      eoaAddress: '0x1234567890123456789012345678901234567890',
      privyId: 'privy_user_1',
      role: 'usuario'
    }
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'psm@motusdao.com' },
    update: {},
    create: {
      email: 'psm@motusdao.com',
      eoaAddress: '0x0987654321098765432109876543210987654321',
      privyId: 'privy_psm_1',
      role: 'psm'
    }
  })

  // Create profiles
  await prisma.profile.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      nombre: 'Usuario',
      apellido: 'MotusDAO',
      telefono: '+52 55 1234 5678',
      fechaNacimiento: new Date('1990-01-01'),
      ciudad: 'Ciudad de México',
      pais: 'mexico',
      bio: 'Apasionado por el bienestar mental y la tecnología blockchain.',
      language: 'es'
    }
  })

  await prisma.profile.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      nombre: 'María',
      apellido: 'González',
      telefono: '+52 55 9876 5432',
      fechaNacimiento: new Date('1985-05-15'),
      ciudad: 'Guadalajara',
      pais: 'mexico',
      bio: 'Psicóloga clínica especializada en terapia cognitivo-conductual.',
      language: 'es'
    }
  })

  // Create patient profile for user1
  await prisma.patientProfile.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      tipoAtencion: 'ansiedad',
      problematica: 'Busco apoyo para manejar la ansiedad en situaciones sociales y laborales. Me siento abrumado por el estrés diario y necesito herramientas para relajarme.',
      preferenciaAsignacion: 'automatica'
    }
  })

  // Create PSM profile for user2
  await prisma.pSMProfile.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      cedulaProfesional: '12345678',
      formacionAcademica: 'Licenciatura en Psicología, Universidad Nacional Autónoma de México',
      experienciaAnios: 8,
      biografia: 'Especialista en terapia cognitivo-conductual con más de 8 años de experiencia ayudando a personas con ansiedad, depresión y trastornos del estado de ánimo.',
      especialidades: ['ansiedad', 'depresion', 'cognitivo', 'estres'],
      participaSupervision: true,
      participaCursos: true,
      participaInvestigacion: false,
      participaComunidad: true
    }
  })

  const { genesis: genesisCourse } = await seedAcademyRuta(prisma)

  // Create sample journal entries
  const journalEntries = [
    {
      userId: user1.id,
      content: 'Hoy me sentí muy motivado después de la sesión de meditación. Logré concentrarme mejor en el trabajo y me siento más tranquilo.',
      mood: 'happy',
      tags: ['meditación', 'trabajo', 'motivación']
    },
    {
      userId: user1.id,
      content: 'Tuve una conversación difícil con mi familia. Me siento un poco abrumado pero sé que es importante comunicar mis sentimientos.',
      mood: 'anxious',
      tags: ['familia', 'comunicación', 'emociones']
    },
    {
      userId: user1.id,
      content: 'Día tranquilo en casa. Disfruté leyendo un libro y cocinando. Me siento en paz conmigo mismo.',
      mood: 'calm',
      tags: ['lectura', 'cocina', 'paz']
    }
  ]

  for (const entry of journalEntries) {
    await prisma.journalEntry.upsert({
      where: {
        id: `entry_${entry.userId}_${entry.mood}`
      },
      update: {},
      create: {
        id: `entry_${entry.userId}_${entry.mood}`,
        ...entry
      }
    })
  }

  // Create sample contact messages
  const contactMessages = [
    {
      name: 'Juan Pérez',
      email: 'juan.perez@email.com',
      message: 'Me interesa conocer más sobre los servicios de MotusDAO. ¿Podrían contactarme?',
      userId: user1.id
    },
    {
      name: 'María López',
      email: 'maria.lopez@email.com',
      message: 'Excelente plataforma. Me gustaría saber sobre las opciones de terapia virtual.',
      userId: null
    }
  ]

  for (const message of contactMessages) {
    await prisma.contactMessage.upsert({
      where: {
        id: `contact_${message.email}`
      },
      update: {},
      create: {
        id: `contact_${message.email}`,
        ...message
      }
    })
  }

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: user1.id,
        courseId: genesisCourse.id
      }
    },
    update: {},
    create: {
      id: `enrollment_${user1.id}_${genesisCourse.id}`,
      userId: user1.id,
      courseId: genesisCourse.id,
      progress: 0,
      completed: false,
      updatedAt: new Date()
    }
  })

  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
