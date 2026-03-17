import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { formatCeloAddress } from './celo'

export type UserRole = 'usuario' | 'psm'

export interface OnboardingData {
  // Paso 1: Conexión
  email: string
  eoaAddress: string
  smartWalletAddress?: string
  privyId?: string
  celoChainId?: number
  walletType?: 'embedded' | 'external' | 'smart-wallet'
  
  // Paso 2: Perfil básico
  nombre: string
  apellido: string
  telefono: string
  fechaNacimiento: string
  ciudad: string
  pais: string
  
  // Paso 3: Perfil específico por rol
  // Para Usuario
  tipoAtencion?: string
  problematica?: string
  preferenciaAsignacion?: 'automatica' | 'explorar'
  
  // Para PSM
  cedulaProfesional?: string
  formacionAcademica?: string
  experienciaAnios?: number
  biografia?: string
  especialidades?: string[]
  participaSupervision?: boolean
  participaCursos?: boolean
  participaInvestigacion?: boolean
  participaComunidad?: boolean

  // NFT de perfil / on-chain
  profileNftTxHash?: string
  profileNftTokenURI?: string
}

interface OnboardingState {
  // Estado del wizard
  currentStep: number
  role: UserRole | null
  data: Partial<OnboardingData>
  isCompleted: boolean
  
  // Acciones
  setRole: (role: UserRole) => void
  setCurrentStep: (step: number) => void
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
      
      // Acciones
      setRole: (role) => set({ role }),
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      updateData: (newData) => set((state) => ({
        data: { ...state.data, ...newData }
      })),
      
      reset: () => set({
        currentStep: 0,
        role: null,
        data: initialData,
        isCompleted: false
      }),
      
      markCompleted: () => set({ isCompleted: true }),
      
      // Validaciones
      isStepValid: (step) => {
        const { data, role } = get()
        
        // Debug log
        console.log('Store isStepValid Debug:', {
          step,
          data: {
            email: data.email,
            eoaAddress: data.eoaAddress,
            nombre: data.nombre,
            apellido: data.apellido
          },
          role
        })
        
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
                data.tipoAtencion && 
                data.problematica && 
                data.preferenciaAsignacion
              )
            } else if (role === 'psm') {
              return !!(
                data.nombre &&
                data.apellido &&
                data.telefono &&
                data.fechaNacimiento &&
                data.ciudad &&
                data.pais &&
                data.cedulaProfesional && 
                data.formacionAcademica && 
                data.experienciaAnios !== undefined && 
                data.experienciaAnios >= 0 &&
                data.especialidades && 
                data.especialidades.length > 0
              )
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
        isCompleted: state.isCompleted
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
