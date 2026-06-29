import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { toInputJson } from '@/lib/prisma-json'
import { recordClinicalAccess } from '@/lib/clinical-audit'
import {
  PSM_INTAKE_VERSION,
  PSM_MIN_NARRATIVE_LENGTH,
  resolveProfessionalNarrative,
} from '@/lib/intake/psm-intake-v1'
import { resolveOnboardingIdentity } from '@/lib/onboarding-identity'
import { buildPsmSlug, ensureUniqueSlug } from '@/lib/psm/slug'
import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'
import { isStorageMediaRef } from '@/lib/academy/media'

const stringArray = z.array(z.string()).default([])

const psmOnboardingSchema = z.object({
  email: z.string().email(),
  eoaAddress: z.string().min(1),
  smartWalletAddress: z.string().optional(),
  privyId: z.string().optional(),
  intakeSource: z.enum(['manual', 'ai_assisted', 'hybrid']).default('manual'),
  intakeVersion: z.string().default(PSM_INTAKE_VERSION),
  motusName: z.string().optional(),
  mnsTxHash: z.string().optional(),
  profileNftTxHash: z.string().optional(),
  profileNftTokenURI: z.string().optional(),

  nombre: z.string().min(1),
  apellido: z.string().min(1),
  telefono: z.string().min(1),
  fechaNacimiento: z.string().min(1),
  ciudad: z.string().min(1),
  pais: z.string().min(1),
  avatarUrl: z.string().optional(),
  avatarStoragePath: z.string().optional(),

  cedulaProfesional: z.string().min(1),
  cedulaDocumentPath: z.string().optional(),
  tituloDocumentPath: z.string().optional(),
  formacionAcademica: z.string().min(1),
  experienciaAnios: z.number().min(0),
  professionalNarrative: z.string().min(PSM_MIN_NARRATIVE_LENGTH),
  biografia: z.string().optional(),
  tagline: z.string().min(10).max(120),
  topSpecialties: z.array(z.string()).length(3),
  introVideoUrl: z.string().optional(),
  introVideoStoragePath: z.string().optional(),
  firstSessionExpectations: z.string().optional(),
  doesNotWorkWithNote: z.string().optional(),

  especialidades: z.array(z.string()).min(1),
  therapyStyles: z.array(z.string()).min(1),
  languages: z.array(z.string()).default(['es']),
  licensedCountries: z.array(z.string()).min(1),
  licensedRegions: stringArray,
  timezone: z.string().min(1),
  availability: z.record(z.unknown()).default({}),
  availabilityNotes: z.string().optional(),
  modalities: z.array(z.enum(['video', 'chat', 'in_person', 'hybrid'])).default(['video']),
  worksWithUrgencyLevels: z.array(z.enum(['low', 'medium', 'high', 'crisis'])).default(['low', 'medium']),
  exclusionCriteria: z.array(z.string()).min(1),
  isAcceptingPatients: z.boolean().default(false),
  maxActivePatients: z.number().int().positive().default(10),
  acceptsSlidingScale: z.boolean().default(false),
  participaSupervision: z.boolean().default(false),
  participaCursos: z.boolean().default(false),
  participaInvestigacion: z.boolean().default(false),
  participaComunidad: z.boolean().default(false),

  consentToTerms: z.boolean().default(true),
  consentToPrivacy: z.boolean().default(true),
  consentToAIProcessing: z.boolean().default(false),
  consentToShareWithPSM: z.boolean().default(false),
  consentToClinicalMatching: z.boolean().default(false),
  consentPolicyVersion: z.string().default('v1'),
  consentLocale: z.string().default('es'),
}).superRefine((data, ctx) => {
  if (!data.cedulaDocumentPath && !data.tituloDocumentPath) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debes subir al menos un documento: cédula profesional o título',
      path: ['cedulaDocumentPath'],
    })
  }
  if (
    data.introVideoUrl &&
    !isStorageMediaRef(data.introVideoUrl) &&
    !z.string().url().safeParse(data.introVideoUrl).success
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El enlace del video debe ser una URL válida (https://...)',
      path: ['introVideoUrl'],
    })
  }
  const invalidTop = data.topSpecialties.filter((s) => !data.especialidades.includes(s))
  if (invalidTop.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Las especialidades principales deben estar en tu lista de especialidades',
      path: ['topSpecialties'],
    })
  }
})

type PsmOnboardingData = z.infer<typeof psmOnboardingSchema>

function buildPsmProfileFields(
  data: PsmOnboardingData,
  existingPsm?: {
    verificationStatus: 'pending' | 'approved' | 'rejected' | 'suspended'
    isAcceptingPatients: boolean
    cedulaDocumentPath: string | null
    tituloDocumentPath: string | null
    slug: string | null
    introVideoApproved: boolean
    introVideoStoragePath: string | null
    introVideoUrl: string | null
  } | null,
  slug?: string
) {
  const docsChanged = Boolean(
    existingPsm &&
      (
        (data.cedulaDocumentPath && data.cedulaDocumentPath !== existingPsm.cedulaDocumentPath) ||
        (data.tituloDocumentPath && data.tituloDocumentPath !== existingPsm.tituloDocumentPath)
      )
  )
  const verificationStatus =
    !existingPsm || docsChanged || existingPsm.verificationStatus === 'rejected'
      ? 'pending'
      : existingPsm.verificationStatus
  const isAcceptingPatients =
    verificationStatus === 'approved'
      ? existingPsm?.isAcceptingPatients ?? data.isAcceptingPatients
      : false

  return {
    slug: slug ?? existingPsm?.slug ?? undefined,
    tagline: data.tagline,
    topSpecialties: toInputJson(data.topSpecialties),
    introVideoUrl: data.introVideoUrl,
    introVideoStoragePath: data.introVideoStoragePath,
    introVideoApproved:
      existingPsm?.introVideoStoragePath === data.introVideoStoragePath &&
      existingPsm?.introVideoUrl === data.introVideoUrl
        ? (existingPsm?.introVideoApproved ?? false)
        : false,
    firstSessionExpectations: data.firstSessionExpectations,
    doesNotWorkWithNote: data.doesNotWorkWithNote,
    cedulaProfesional: data.cedulaProfesional,
    cedulaDocumentPath: data.cedulaDocumentPath,
    tituloDocumentPath: data.tituloDocumentPath,
    formacionAcademica: data.formacionAcademica,
    experienciaAnios: data.experienciaAnios,
    biografia: resolveProfessionalNarrative(data),
    professionalNarrative: resolveProfessionalNarrative(data),
    especialidades: toInputJson(data.especialidades),
    verificationStatus,
    isAcceptingPatients,
    maxActivePatients: data.maxActivePatients,
    therapyStyles: toInputJson(data.therapyStyles ?? []),
    languages: toInputJson(data.languages?.length ? data.languages : ['es']),
    licensedCountries: toInputJson(data.licensedCountries ?? []),
    licensedRegions: toInputJson(data.licensedRegions ?? []),
    timezone: data.timezone,
    availability: toInputJson(data.availability ?? {}),
    modalities: toInputJson(['video']),
    sessionPrice: PLATFORM_SESSION_PRICE_USD,
    currency: 'USD',
    acceptsSlidingScale: false,
    worksWithUrgencyLevels: toInputJson(data.worksWithUrgencyLevels ?? ['low', 'medium']),
    exclusionCriteria: toInputJson(data.exclusionCriteria ?? []),
    participaSupervision: data.participaSupervision,
    participaCursos: data.participaCursos,
    participaInvestigacion: data.participaInvestigacion,
    participaComunidad: data.participaComunidad
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = psmOnboardingSchema.parse(body)

    const identity = await resolveOnboardingIdentity({
      email: data.email,
      eoaAddress: data.eoaAddress,
    })

    if (identity.status === 'conflict') {
      return NextResponse.json(
        { error: identity.message, code: identity.code },
        { status: 409 }
      )
    }

    const normalizedEoa = identity.normalizedEoa
    const existingUser =
      identity.status === 'update'
        ? await prisma.user.findUnique({
            where: { id: identity.user.id },
            include: { profile: true, psm: true },
          })
        : null

    const result = await prisma.$transaction(async (tx) => {
      const existingPsm = existingUser?.psm
      const docsChanged = Boolean(
        existingPsm &&
          (
            (data.cedulaDocumentPath && data.cedulaDocumentPath !== existingPsm.cedulaDocumentPath) ||
            (data.tituloDocumentPath && data.tituloDocumentPath !== existingPsm.tituloDocumentPath)
          )
      )
      const nextOnboardingStatus =
        existingPsm?.verificationStatus === 'approved' && !docsChanged
          ? 'active'
          : 'pending_verification'

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              ...(identity.status === 'update' ? identity.identitySync : {}),
              role: 'psm',
              smartWalletAddress: data.smartWalletAddress || existingUser.smartWalletAddress,
              registrationCompleted: true,
              onboardingStatus: nextOnboardingStatus,
              intakeSource: data.intakeSource,
              motusName: data.motusName || existingUser.motusName,
              mnsTxHash: data.mnsTxHash || existingUser.mnsTxHash,
              mnsRegisteredAt: data.mnsTxHash && !existingUser.mnsRegisteredAt
                ? new Date()
                : existingUser.mnsRegisteredAt,
              profileNftTxHash: data.profileNftTxHash || existingUser.profileNftTxHash,
              profileNftTokenURI: data.profileNftTokenURI || existingUser.profileNftTokenURI,
              privyId: data.privyId || existingUser.privyId
            }
          })
        : await tx.user.create({
            data: {
              role: 'psm',
              email: data.email,
              eoaAddress: normalizedEoa,
              smartWalletAddress: data.smartWalletAddress || null,
              registrationCompleted: true,
              onboardingStatus: nextOnboardingStatus,
              intakeSource: data.intakeSource,
              motusName: data.motusName,
              mnsTxHash: data.mnsTxHash,
              mnsRegisteredAt: data.mnsTxHash ? new Date() : null,
              profileNftTxHash: data.profileNftTxHash,
              profileNftTokenURI: data.profileNftTokenURI,
              privyId: data.privyId
            }
          })

      await tx.profile.upsert({
        where: { userId: user.id },
        update: {
          nombre: data.nombre,
          apellido: data.apellido,
          telefono: data.telefono,
          fechaNacimiento: new Date(data.fechaNacimiento),
          ciudad: data.ciudad,
          pais: data.pais,
          avatarUrl: data.avatarUrl,
          avatarStoragePath: data.avatarStoragePath,
        },
        create: {
          userId: user.id,
          nombre: data.nombre,
          apellido: data.apellido,
          telefono: data.telefono,
          fechaNacimiento: new Date(data.fechaNacimiento),
          ciudad: data.ciudad,
          pais: data.pais,
          avatarUrl: data.avatarUrl,
          avatarStoragePath: data.avatarStoragePath,
        }
      })

      const slug =
        existingUser?.psm?.slug ??
        (await ensureUniqueSlug(
          buildPsmSlug({
            nombre: data.nombre,
            apellido: data.apellido,
            topSpecialty: data.topSpecialties[0],
            userId: user.id,
          }),
          async (candidate) => {
            const row = await tx.pSMProfile.findFirst({ where: { slug: candidate } })
            return Boolean(row)
          }
        ))

      const psmProfileFieldsWithSlug = buildPsmProfileFields(data, existingUser?.psm, slug)

      await tx.pSMProfile.upsert({
        where: { userId: user.id },
        update: psmProfileFieldsWithSlug,
        create: { userId: user.id, ...psmProfileFieldsWithSlug },
      })

      await tx.consentRecord.create({
        data: {
          userId: user.id,
          consentToTerms: data.consentToTerms,
          consentToPrivacy: data.consentToPrivacy,
          consentToAIProcessing: data.consentToAIProcessing,
          consentToShareWithPSM: data.consentToShareWithPSM,
          consentToClinicalMatching: data.consentToClinicalMatching,
          source: data.intakeSource
        }
      })

      return user
    })

    await recordClinicalAccess({
      request,
      actorUserId: result.id,
      targetUserId: result.id,
      action: 'create',
      resource: 'psm_profile',
      reason: 'onboarding_psm',
      metadata: { intakeSource: data.intakeSource },
    })

    return NextResponse.json({
      success: true,
      message: 'Profesional registrado exitosamente. Queda pendiente de verificación antes de recibir matches.',
      user: {
        id: result.id,
        role: result.role,
        email: result.email,
        eoaAddress: result.eoaAddress,
        smartWalletAddress: result.smartWalletAddress,
        registrationCompleted: result.registrationCompleted,
        onboardingStatus: result.onboardingStatus,
        intakeSource: result.intakeSource
      },
      verification: {
        status: 'pending',
        matchEligible: false
      }
    }, { status: existingUser ? 200 : 201 })
  } catch (error) {
    console.error('Error creating PSM:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Datos de entrada inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    )
  }
}
