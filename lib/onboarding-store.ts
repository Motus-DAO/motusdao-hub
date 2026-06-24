import { create } from 'zustand'
import { isPsmIntakeComplete, getPsmMissingFieldKeys } from '@/lib/intake/psm-intake-v1'
import { persist } from 'zustand/middleware'
import { formatCeloAddress } from './celo'

export type UserRole = 'usuario' | 'psm'
export type IntakeSource = 'manual' | 'ai_assisted' | 'hybrid'
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'crisis'
export type Modality = 'video' | 'chat' | 'in_person' | 'hybrid'

export interface OnboardingData {
  // Paso 1: Conexión
  email: string
  eoaAddress: string
  smartWalletAddress?: string
  privyId?: string
  celoChainId?: number
  walletType?: 'embedded' | 'external' | 'smart-wallet'
  intakeSource?: IntakeSource
  
  // Paso 2: Perfil básico
  nombre: string
  apellido: string
  telefono: string
  fechaNacimiento: string
  ciudad: string
  pais: string
  avatarUrl?: string
  avatarStoragePath?: string
  
  // Paso 3: Perfil específico por rol
  // Para Usuario
  tipoAtencion?: string
  problematica?: string
  preferenciaAsignacion?: 'automatica' | 'explorar'
  clinicalConcern?: string[]
  urgencyLevel?: UrgencyLevel
  preferredModality?: Modality
  preferredTherapyStyle?: string[]
  languages?: string[]
  timezone?: string
  availability?: Record<string, unknown>
  availabilityNotes?: string
  weeklyTherapyHours?: number
  budgetMin?: number
  budgetMax?: number
  paymentPreference?: string
  therapistGenderPreference?: string
  priorTherapyExperience?: boolean
  medicationOrDiagnosisContext?: string
  riskFlags?: string[]
  consentToAIProcessing?: boolean
  consentToShareWithPSM?: boolean
  consentToClinicalMatching?: boolean
  consentToTerms?: boolean
  consentToPrivacy?: boolean
  
  // Para PSM
  cedulaProfesional?: string
  cedulaDocumentPath?: string
  tituloDocumentPath?: string
  formacionAcademica?: string
  experienciaAnios?: number
  biografia?: string
  professionalNarrative?: string
  especialidades?: string[]
  therapyStyles?: string[]
  licensedCountries?: string[]
  licensedRegions?: string[]
  credentialedCountries?: string[]
  countriesWhereCanReceivePatients?: string[]
  serviceTypes?: string[]
  clinicalComplexityLevels?: string[]
  excludedCases?: string[]
  emergencyProtocolStatus?: 'own_protocol' | 'institutional_protocol' | 'not_yet' | 'want_motus_guidance'
  legalDeclarations?: Partial<
    Record<
      | 'infoIsTrue'
      | 'professionalScope'
      | 'motusCanReview'
      | 'notEmergency'
      | 'termsPrivacy'
      | 'documentsReview'
      | 'crossBorderReview',
      boolean
    >
  >
  modalities?: Modality[]
  acceptsSlidingScale?: boolean
  worksWithUrgencyLevels?: UrgencyLevel[]
  exclusionCriteria?: string[]
  isAcceptingUsers?: boolean
  isAcceptingPatients?: boolean
  maxActiveUsers?: number
  maxActivePatients?: number
  participaSupervision?: boolean
  participaCursos?: boolean
  participaInvestigacion?: boolean
  participaComunidad?: boolean

  // MNS / on-chain identity
  motusName?: string
  mnsTxHash?: string
  profileNftTxHash?: string
  profileNftTokenURI?: string
}

interface OnboardingState {
  // Estado del wizard
  currentStep: number
  role: UserRole | null
  data: Partial<OnboardingData>
  isCompleted: boolean
  profileIntakeMode: 'manual' | 'ai'
  psmWizardStep: number
  
  // Acciones
  setRole: (role: UserRole) => void
  setCurrentStep: (step: number) => void
  setProfileIntakeMode: (mode: 'manual' | 'ai') => void
  setPsmWizardStep: (step: number) => void
  updateData: (data: Partial<OnboardingData>) => void
  reset: () => void
  markCompleted: () => void
  
  // Validaciones por paso
  isStepValid: (step: number) => boolean
  canProceed: () => boolean
}

const initialData: Partial<OnboardingData> = {
  email: '',
  eoaAddress: '',
  smartWalletAddress: '',
  nombre: '',
  apellido: '',
  telefono: '',
  fechaNacimiento: '',
  ciudad: '',
  pais: '',
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      currentStep: 0,
      role: null,
      data: initialData,
      isCompleted: false,
      profileIntakeMode: 'manual',
      psmWizardStep: 0,
      
      // Acciones
      setRole: (role) => set({ role }),
      
      setCurrentStep: (step) => set({ currentStep: step }),

      setProfileIntakeMode: (mode) => set({ profileIntakeMode: mode }),

      setPsmWizardStep: (step) => set({ psmWizardStep: step }),
      
      updateData: (newData) => set((state) => ({
        data: { ...state.data, ...newData }
      })),
      
      reset: () => set({
        currentStep: 0,
        role: null,
        data: initialData,
        isCompleted: false,
        profileIntakeMode: 'manual',
        psmWizardStep: 0,
      }),
      
      markCompleted: () => set({ isCompleted: true }),
      
      // Validaciones
      isStepValid: (step) => {
        const { data, role } = get()

        switch (step) {
          case 0: // Registro WaaP (email + EOA)
            return !!(data.eoaAddress && data.email)
          
          case 1: // Blockchain (claim CELO + dominio) - valid when reached
            return true
          
          case 2: // Selección de rol
            return !!role // Role must be selected
          
          case 3: // Perfil específico (terapéutico o profesional)
            if (role === 'usuario') {
              return !!(
                data.nombre &&
                data.apellido &&
                data.telefono &&
                data.fechaNacimiento &&
                data.ciudad &&
                data.pais &&
                data.problematica && 
                data.preferenciaAsignacion &&
                data.consentToShareWithPSM &&
                data.consentToClinicalMatching
              )
            } else if (role === 'psm') {
              return isPsmIntakeComplete(data)
            }
            return false
          
          case 4: // Revisión
            return true // Siempre válido si llegamos aquí
          
          case 5: // Éxito final
            return true // Siempre válido si llegamos aquí
          
          default:
            return false
        }
      },
      
      canProceed: () => {
        const { currentStep, isStepValid } = get()
        return isStepValid(currentStep)
      }
    }),
    {
      name: 'motusdao-onboarding-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        role: state.role,
        data: state.data,
        isCompleted: state.isCompleted,
        profileIntakeMode: state.profileIntakeMode,
        psmWizardStep: state.psmWizardStep,
      })
    }
  )
)

// Helper function to validate Celo wallet address
export const isValidCeloAddress = (address: string): boolean => {
  if (!address) return false
  // Basic Ethereum address validation (Celo uses same format)
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Helper function to get formatted wallet address for display
export const getFormattedWalletAddress = (address: string): string => {
  if (!address) return ''
  return formatCeloAddress(address, 6)
}

// Utilidades para obtener pasos por rol
export const getStepsForRole = (role: UserRole) => {
  const baseSteps = [
    { id: 0, title: 'Cuenta WaaP', description: 'Registra tu email y wallet' },
    { id: 1, title: 'Celo & dominio', description: 'Reclama CELO y compra tu dominio' },
    { id: 2, title: 'Rol', description: 'Selecciona tu tipo de cuenta' },
    { id: 3, title: 'Perfil', description: 'Información personal' },
    { id: 4, title: 'Revisión', description: 'Revisa tu información' },
    { id: 5, title: 'Listo', description: '¡Registro completado!' }
  ]
  
  if (role === 'usuario') {
    return [
      baseSteps[0], // Cuenta WaaP
      baseSteps[1], // Celo & dominio
      baseSteps[2], // Rol
      { id: 3, title: 'Terapéutico', description: 'Perfil terapéutico' },
      baseSteps[4], // Revisión
      baseSteps[5]  // Listo
    ]
  } else {
    return [
      baseSteps[0], // Cuenta WaaP
      baseSteps[1], // Celo & dominio
      baseSteps[2], // Rol
      { id: 3, title: 'Profesional', description: 'Datos profesionales' },
      baseSteps[4], // Revisión
      baseSteps[5]  // Listo
    ]
  }
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Correo electrónico',
  eoaAddress: 'Wallet conectada',
  nombre: 'Nombre',
  apellido: 'Apellidos',
  telefono: 'Teléfono',
  fechaNacimiento: 'Fecha de nacimiento',
  ciudad: 'Ciudad',
  pais: 'País',
  clinicalConcern: 'Áreas relacionadas',
  tipoAtencion: 'Área principal',
  problematica: 'Motivo de consulta',
  preferenciaAsignacion: 'Preferencia de asignación',
  cedulaProfesional: 'Cédula profesional',
  formacionAcademica: 'Formación académica',
  experienciaAnios: 'Años de experiencia',
  therapyStyles: 'Enfoque terapéutico',
  especialidades: 'Especialización',
  professionalNarrative: 'Descripción de tu práctica',
  weeklyTherapyHours: 'Horas semanales para terapia',
  maxActiveUsers: 'Usuarios activos',
  cedulaDocumentPath: 'Documento de cédula o título',
  tituloDocumentPath: 'Documento de cédula o título',
}

export function getStepBlockerKeys(
  step: number,
  role: UserRole | null,
  data: Partial<OnboardingData>
): string[] {
  const keys: string[] = []

  const requireField = (key: keyof OnboardingData) => {
    const value = data[key]
    if (value == null || value === '') keys.push(key as string)
    else if (Array.isArray(value) && value.length === 0) keys.push(key as string)
    else if (typeof value === 'boolean' && value === false) keys.push(key as string)
  }

  switch (step) {
    case 0:
      requireField('email')
      requireField('eoaAddress')
      break
    case 2:
      if (!role) keys.push('role')
      break
    case 3:
      requireField('nombre')
      requireField('apellido')
      requireField('telefono')
      requireField('fechaNacimiento')
      requireField('ciudad')
      requireField('pais')
      if (role === 'usuario') {
        requireField('problematica')
        requireField('preferenciaAsignacion')
        requireField('consentToShareWithPSM')
        requireField('consentToClinicalMatching')
      } else if (role === 'psm') {
        if (!isPsmIntakeComplete(data)) {
          keys.push(...getPsmMissingFieldKeys(data))
        }
      }
      break
    default:
      break
  }

  return [...new Set(keys)]
}

export function getStepBlockers(
  step: number,
  role: UserRole | null,
  data: Partial<OnboardingData>
): string[] {
  return getStepBlockerKeys(step, role, data).map(
    (key) => FIELD_LABELS[key] || key
  )
}
