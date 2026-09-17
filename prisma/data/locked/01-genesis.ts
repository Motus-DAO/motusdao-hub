import type { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from '../academy-seed-shared'
import { GENESIS_COURSE } from '../academy-genesis'

/** Locked mirror of canonical Génesis seed (MF-01). Prefer editing `academy-genesis.ts`. */
export const COURSE_01_GENESIS_COURSE: SeedCourse = GENESIS_COURSE

export async function seedLocked_COURSE_01_GENESIS_COURSE(prisma: PrismaClient) {
  return upsertAcademyCourse(prisma, COURSE_01_GENESIS_COURSE)
}
