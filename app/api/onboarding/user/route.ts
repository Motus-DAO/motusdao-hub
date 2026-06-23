import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { toInputJson } from '@/lib/prisma-json'
import { deriveConcernFields } from '@/lib/intake-concerns'
import { createCrisisEventIfNeeded } from '@/lib/crisis'
import { recordClinicalAccess } from '@/lib/clinical-audit'

const stringArray = z.array(z.string()).default([])
const optionalStringArray = z.array(z.string()).optional()

const userOnboardingSchema = z.object({
  email: z.string().email(),
  eoaAddress: z.string().min(1),
  smartWalletAddress: z.string().optional(),
  privyId: z.string().optional(),
  intakeSource: z.enum(['manual', 'ai_assisted']).default('manual'),
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

  tipoAtencion: z.string().optional(),
  problematica: z.string().min(10),
  preferenciaAsignacion: z.enum(['automatica', 'explorar']),
  clinicalConcern: optionalStringArray,
  urgencyLevel: z.enum(['low', 'medium', 'high', 'crisis']).default('medium'),
  preferredModality: z.enum(['video', 'chat', 'in_person', 'hybrid']).default('video'),
  preferredTherapyStyle: stringArray,
  languages: z.array(z.string()).default(['es']),
  timezone: z.string().optional(),
  availability: z.record(z.unknown()).default({}),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
  paymentPreference: z.string().optional(),
  therapistGenderPreference: z.string().optional(),
  priorTherapyExperience: z.boolean().optional(),
  medicationOrDiagnosisContext: z.string().optional(),
  riskFlags: stringArray,

  consentToTerms: z.boolean().default(true),
  consentToPrivacy: z.boolean().default(true),
  consentToAIProcessing: z.boolean().default(false),
  consentToShareWithPSM: z.boolean().default(true),
  consentToClinicalMatching: z.boolean().default(true),
  consentPolicyVersion: z.string().default('v1'),
  consentLocale: z.string().default('es')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = userOnboardingSchema.parse(body)
    const concernFields = deriveConcernFields({
      tipoAtencion: data.tipoAtencion,
      clinicalConcern: data.clinicalConcern,
      problematica: data.problematica,
    })

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { eoaAddress: data.eoaAddress }
        ]
      },
      include: {
        profile: true,
        patient: true
      }
    })

    if (
      existingUser &&
      (existingUser.email !== data.email || existingUser.eoaAddress !== data.eoaAddress)
    ) {
      return NextResponse.json(
        {
          error: 'Ya existe una cuenta con este correo o wallet, pero no pertenecen al mismo registro.',
          code: 'IDENTITY_CONFLICT'
        },
        { status: 409 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              role: 'usuario',
              smartWalletAddress: data.smartWalletAddress || existingUser.smartWalletAddress,
              registrationCompleted: true,
              onboardingStatus: 'active',
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
              role: 'usuario',
              email: data.email,
              eoaAddress: data.eoaAddress,
              smartWalletAddress: data.smartWalletAddress || null,
              registrationCompleted: true,
              onboardingStatus: 'active',
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

      await tx.patientProfile.upsert({
        where: { userId: user.id },
        update: {
          tipoAtencion: concernFields.tipoAtencion,
          problematica: data.problematica,
          preferenciaAsignacion: data.preferenciaAsignacion,
          clinicalConcern: toInputJson(concernFields.clinicalConcern),
          urgencyLevel: data.urgencyLevel,
          preferredModality: data.preferredModality,
          preferredTherapyStyle: toInputJson(data.preferredTherapyStyle ?? []),
          languages: toInputJson(data.languages?.length ? data.languages : ['es']),
          timezone: data.timezone,
          availability: toInputJson(data.availability ?? {}),
          budgetMin: data.budgetMin,
          budgetMax: data.budgetMax,
          paymentPreference: data.paymentPreference,
          therapistGenderPreference: data.therapistGenderPreference,
          priorTherapyExperience: data.priorTherapyExperience,
          medicationOrDiagnosisContext: data.medicationOrDiagnosisContext,
          riskFlags: toInputJson(data.riskFlags ?? [])
        },
        create: {
          userId: user.id,
          tipoAtencion: concernFields.tipoAtencion,
          problematica: data.problematica,
          preferenciaAsignacion: data.preferenciaAsignacion,
          clinicalConcern: toInputJson(concernFields.clinicalConcern),
          urgencyLevel: data.urgencyLevel,
          preferredModality: data.preferredModality,
          preferredTherapyStyle: toInputJson(data.preferredTherapyStyle ?? []),
          languages: toInputJson(data.languages?.length ? data.languages : ['es']),
          timezone: data.timezone,
          availability: toInputJson(data.availability ?? {}),
          budgetMin: data.budgetMin,
          budgetMax: data.budgetMax,
          paymentPreference: data.paymentPreference,
          therapistGenderPreference: data.therapistGenderPreference,
          priorTherapyExperience: data.priorTherapyExperience,
          medicationOrDiagnosisContext: data.medicationOrDiagnosisContext,
          riskFlags: toInputJson(data.riskFlags ?? [])
        }
      })

      await tx.consentRecord.create({
        data: {
          userId: user.id,
          consentToTerms: data.consentToTerms,
          consentToPrivacy: data.consentToPrivacy,
          consentToAIProcessing: data.consentToAIProcessing,
          consentToShareWithPSM: data.consentToShareWithPSM,
          consentToClinicalMatching: data.consentToClinicalMatching,
          source: data.intakeSource,
          policyVersion: data.consentPolicyVersion,
          locale: data.consentLocale,
          scope: toInputJson({
            aiProcessing: data.consentToAIProcessing,
            shareWithPSM: data.consentToShareWithPSM,
            clinicalMatching: data.consentToClinicalMatching,
          })
        }
      })

      return user
    })

    await createCrisisEventIfNeeded({
      userId: result.id,
      source: data.intakeSource,
      urgencyLevel: data.urgencyLevel,
      riskFlags: data.riskFlags,
      summary: data.problematica,
      metadata: {
        clinicalConcern: concernFields.clinicalConcern,
        preferredModality: data.preferredModality,
      },
    })

    await recordClinicalAccess({
      request,
      actorUserId: result.id,
      targetUserId: result.id,
      action: 'create',
      resource: 'patient_profile',
      reason: 'onboarding_user',
      metadata: {
        intakeSource: data.intakeSource,
        clinicalConcern: concernFields.clinicalConcern,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario registrado exitosamente',
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
      matching: {
        eligible: data.urgencyLevel !== 'crisis',
        preference: data.preferenciaAsignacion
      }
    }, { status: existingUser ? 200 : 201 })
  } catch (error) {
    console.error('Error creating user:', error)

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
