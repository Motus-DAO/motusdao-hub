'use client'

import { useState } from 'react'
import { ADNBackdrop } from '@/components/three/ADNBackdrop'
import FloatingLines from '@/components/three/FloatingLines'
import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { RolePickerModal } from '@/components/onboarding/RolePickerModal'
import { EmailLoginModal } from '@/components/onboarding/EmailLoginModal'
import { useUIStore } from '@/lib/store'
import { useWaaP } from '@/lib/contexts/WaaPProvider'
import { 
  Bot, 
  Heart, 
  GraduationCap, 
  CreditCard, 
  FileText,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const featuredApps = [
  {
    title: 'MotusAI',
    description: 'Asistente de IA especializado en salud mental',
    icon: Bot,
    href: '/motusai',
    color: 'from-blue-500 to-purple-600'
  },
  {
    title: 'Psicoterapia',
    description: 'Conecta con profesionales de la salud mental',
    icon: Heart,
    href: '/psicoterapia',
    color: 'from-pink-500 to-rose-600'
  },
  {
    title: 'Academia',
    description: 'Cursos y recursos para el bienestar mental',
    icon: GraduationCap,
    href: '/academia',
    color: 'from-green-500 to-emerald-600'
  },
  {
    title: 'Pagos',
    description: 'Sistema de pagos descentralizado, sin comisiones y en tiempo real',
    icon: CreditCard,
    href: '/pagos',
    color: 'from-yellow-500 to-orange-600'
  }
]

export default function Home() {
  const { } = useUIStore()
  const { authenticated } = useWaaP()
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [showRolePicker, setShowRolePicker] = useState(false)

  // Debug logs
  console.log('Home Debug:', {
    authenticated,
    showEmailLogin,
    showRolePicker
  })

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'transparent' }}>
      {/* 3D Background - Only show when authenticated */}
      {authenticated && (
        <ADNBackdrop intensity={0.3} speed={0.5} />
      )}
      
      {/* FloatingLines Background - Only show when NOT authenticated */}
      {!authenticated && (
        <div style={{ width: '100%', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0, opacity: 0.15 }}>
          <FloatingLines 
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={5}
            lineDistance={5}
            bendRadius={5}
            bendStrength={11}
            interactive={true}
            parallax={true}
          />
        </div>
      )}
      
      {/* Hero Section - Only show when NOT authenticated */}
      {!authenticated && (
        <Section className="relative z-10" style={{ pointerEvents: 'none' }}>
          <div className="container mx-auto px-6 max-w-full relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto relative z-10"
              style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <GlassCard className="max-w-3xl mx-auto p-8 md:p-12" style={{ pointerEvents: 'auto' }}>
                <div className="flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-mauve-500 mr-3" />
                  <GradientText as="h1" className="text-5xl md:text-7xl font-bold">
                    MotusDAO Hub
                  </GradientText>
                </div>
                
                <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Plataforma integral de salud mental que combina tecnología blockchain, 
                  inteligencia artificial y atención profesional para tu bienestar.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <CTAButton 
                    size="lg" 
                    glow 
                    className="group"
                    onClick={() => {
                      setShowEmailLogin(true)
                    }}
                  >
                    Comenzar Ahora
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </CTAButton>
                  
                  <Link href="/docs">
                    <CTAButton variant="secondary" size="lg">
                      <FileText className="w-5 h-5 mr-2" />
                      Documentación
                    </CTAButton>
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </Section>
      )}

      {/* Featured Apps Section - Only show when authenticated */}
      {authenticated && (
        <>
          <Section className="relative z-10">
            <div className="container mx-auto px-6 max-w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-center mb-12"
              >
                <GradientText as="h2" className="text-3xl md:text-4xl font-bold mb-4">
                  Aplicaciones Destacadas
                </GradientText>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Descubre las herramientas que transformarán tu experiencia en salud mental
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredApps.map((app, index) => {
                  const Icon = app.icon
                  return (
                    <motion.div
                      key={app.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                    >
                      <Link href={app.href}>
                        <GlassCard hover className="h-full p-6 group cursor-pointer">
                          <div className="text-center">
                            <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-r ${app.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative overflow-hidden`}>
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
                              <Icon className="w-8 h-8 text-white relative z-10" />
                            </div>
                            
                            <h3 className="text-xl font-semibold mb-2 group-hover:text-mauve-400 transition-colors">
                              {app.title}
                            </h3>
                            
                            <p className="text-muted-foreground text-sm">
                              {app.description}
                            </p>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </Section>

          {/* CTA Section */}
          <Section className="relative z-10">
            <div className="container mx-auto px-6 max-w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-center"
              >
                <GlassCard className="max-w-2xl mx-auto p-8">
                  <GradientText as="h2" className="text-2xl md:text-3xl font-bold mb-4">
                    ¿Listo para comenzar tu viaje?
                  </GradientText>
                  <p className="text-muted-foreground mb-6">
                    Únete a la revolución de la salud mental descentralizada. 
                    Tu bienestar es nuestra prioridad.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/motusai">
                      <CTAButton size="lg" glow className="w-full sm:w-auto">
                        Habla con un asistente IA especializado
                      </CTAButton>
                    </Link>
                    <Link href="/psicoterapia">
                      <CTAButton variant="secondary" size="lg" className="w-full sm:w-auto">
                        Agendar cita con un terapeuta
                      </CTAButton>
                    </Link>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </Section>
        </>
      )}

      {/* Email Login Modal */}
      <EmailLoginModal 
        isOpen={showEmailLogin} 
        onClose={() => setShowEmailLogin(false)}
        onLoggedIn={() => {
          setShowEmailLogin(false)
          setShowRolePicker(true)
        }}
      />

      {/* Role Picker Modal */}
      <RolePickerModal 
        isOpen={showRolePicker} 
        onClose={() => setShowRolePicker(false)} 
      />
    </div>
  )
}
