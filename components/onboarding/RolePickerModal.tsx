'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Heart, 
  X, 
  ArrowRight,
  Shield,
  Users,
  Brain,
  GraduationCap
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { ONBOARDING_ROUTE } from '@/lib/onboarding-routes'

interface RolePickerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RolePickerModal({ isOpen, onClose }: RolePickerModalProps) {
  const [selectedRole, setSelectedRole] = useState<'usuario' | 'psm' | null>(null)
  const router = useRouter()
  const { setRole } = useOnboardingStore()

  const handleRoleSelect = (role: 'usuario' | 'psm') => {
    setSelectedRole(role)
  }

  const handleContinue = () => {
    if (selectedRole) {
      setRole(selectedRole)
      router.push(ONBOARDING_ROUTE)
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedRole(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl"
        >
          <GlassCard className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <GradientText className="text-3xl font-bold mb-2">
                  ¡Bienvenido a MotusDAO!
                </GradientText>
                <p className="text-muted-foreground text-lg">
                  Selecciona tu tipo de cuenta para comenzar
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Role Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Usuario Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="cursor-pointer"
                onClick={() => handleRoleSelect('usuario')}
              >
                <GlassCard 
                  className={`p-6 transition-all duration-300 ${
                    selectedRole === 'usuario' 
                      ? 'ring-2 ring-mauve-500 bg-mauve-500/10' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Soy Usuario</h3>
                      <p className="text-muted-foreground">Busco apoyo en salud mental</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span>Acceso a psicoterapia</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Brain className="w-4 h-4 text-blue-400" />
                      <span>MotusAI personalizado</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <GraduationCap className="w-4 h-4 text-green-400" />
                      <span>Cursos de bienestar</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Bitácora privada</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* PSM Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="cursor-pointer"
                onClick={() => handleRoleSelect('psm')}
              >
                <GlassCard 
                  className={`p-6 transition-all duration-300 ${
                    selectedRole === 'psm' 
                      ? 'ring-2 ring-mauve-500 bg-mauve-500/10' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Soy Profesional</h3>
                      <p className="text-muted-foreground">Profesional de la Salud Mental</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Gestión de pacientes</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span>Supervisión de casos</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <GraduationCap className="w-4 h-4 text-purple-400" />
                      <span>Certificaciones</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Heart className="w-4 h-4 text-pink-400" />
                      <span>Red profesional</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>

            {/* Continue Button */}
            <div className="flex justify-end">
              <CTAButton
                onClick={handleContinue}
                disabled={!selectedRole}
                className="flex items-center space-x-2"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </CTAButton>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
