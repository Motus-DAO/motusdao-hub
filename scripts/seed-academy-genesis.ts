import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { seedAcademyRuta } from '../prisma/data/academy-ruta'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

async function main() {
  await seedAcademyRuta(prisma)
  console.log('Done. Edit content at /admin/cursos')
}

main()
  .catch((error) => {
    console.error('❌ Academy ruta seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
