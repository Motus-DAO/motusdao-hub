'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  Heart,
  AlertCircle,
  ChevronDown
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore } from '@/lib/onboarding-store'

const usuarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  telefono: z.string()
    .min(1, 'El teléfono es obligatorio')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Formato de teléfono inválido'),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  ciudad: z.string().min(1, 'La ciudad es obligatoria'),
  pais: z.string().min(1, 'El país es obligatorio'),
  tipoAtencion: z.string().min(1, 'Debes seleccionar un tipo de atención'),
  problematica: z.string().min(10, 'Describe tu motivo de consulta (mínimo 10 caracteres)'),
  preferenciaAsignacion: z.enum(['automatica', 'explorar'], {
    required_error: 'Debes seleccionar una preferencia de asignación'
  })
})

type UsuarioFormData = z.infer<typeof usuarioSchema>

interface StepPerfilUsuarioProps {
  onNext: () => void
  onBack: () => void
}

const tiposAtencion = [
  { value: 'ansiedad', label: 'Ansiedad' },
  { value: 'depresion', label: 'Depresión' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'pareja', label: 'Pareja' },
  { value: 'familiar', label: 'Familiar' },
  { value: 'alimentarios', label: 'Trastornos alimentarios' },
  { value: 'adicciones', label: 'Adicciones' },
  { value: 'duelo', label: 'Duelo' },
  { value: 'autoestima', label: 'Autoestima' },
  { value: 'estres', label: 'Estrés' },
  { value: 'otros', label: 'Otros' }
]

const paises = [
  { value: 'mexico', label: 'México' },
  { value: 'colombia', label: 'Colombia' },
  { value: 'argentina', label: 'Argentina' },
  { value: 'chile', label: 'Chile' },
  { value: 'peru', label: 'Perú' },
  { value: 'venezuela', label: 'Venezuela' },
  { value: 'ecuador', label: 'Ecuador' },
  { value: 'bolivia', label: 'Bolivia' },
  { value: 'paraguay', label: 'Paraguay' },
  { value: 'uruguay', label: 'Uruguay' },
  { value: 'espana', label: 'España' },
  { value: 'otros', label: 'Otros' }
]

export function StepPerfilUsuario({ onNext, onBack }: StepPerfilUsuarioProps) {
  const { data, updateData } = useOnboardingStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted }
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nombre: data.nombre || '',
      apellido: data.apellido || '',
      telefono: data.telefono || '',
      fechaNacimiento: data.fechaNacimiento || '',
      ciudad: data.ciudad || '',
      pais: data.pais || '',
      tipoAtencion: data.tipoAtencion || '',
      problematica: data.problematica || '',
      preferenciaAsignacion: data.preferenciaAsignacion || undefined
    },
    mode: 'all'
  })

  const onSubmit = (formData: UsuarioFormData) => {
    updateData(formData)
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <GlassCard className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Información Personal</h2>
          <p className="text-muted-foreground">
            Cuéntanos sobre ti para personalizar tu experiencia
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="nombre" className="block text-sm font-medium">
                Nombre *
              </label>
              <input
                {...register('nombre')}
                type="text"
                id="nombre"
                placeholder="Tu nombre"
                className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
              />
              {errors.nombre && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.nombre.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="apellido" className="block text-sm font-medium">
                Apellidos *
              </label>
              <input
                {...register('apellido')}
                type="text"
                id="apellido"
                placeholder="Tus apellidos"
                className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
              />
              {errors.apellido && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.apellido.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="telefono" className="block text-sm font-medium">
                Teléfono *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('telefono')}
                  type="tel"
                  id="telefono"
                  placeholder="+52 55 1234 5678"
                  className="w-full pl-10 pr-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
                />
              </div>
              {errors.telefono && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.telefono.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="fechaNacimiento" className="block text-sm font-medium">
                Fecha de nacimiento *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('fechaNacimiento')}
                  type="date"
                  id="fechaNacimiento"
                  className="w-full pl-10 pr-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
                />
              </div>
              {errors.fechaNacimiento && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.fechaNacimiento.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="ciudad" className="block text-sm font-medium">
                Ciudad *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('ciudad')}
                  type="text"
                  id="ciudad"
                  placeholder="Tu ciudad"
                  className="w-full pl-10 pr-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
                />
              </div>
              {errors.ciudad && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.ciudad.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="pais" className="block text-sm font-medium">
                País *
              </label>
              <div className="relative">
                <select
                  {...register('pais')}
                  id="pais"
                  className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition appearance-none"
                >
                  <option value="">Selecciona tu país</option>
                  {paises.map(pais => (
                    <option key={pais.value} value={pais.value}>
                      {pais.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.pais && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.pais.message}</span>
                </p>
              )}
            </div>
          </div>

          {/* Therapeutic Profile */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold">Perfil Terapéutico</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="tipoAtencion" className="block text-sm font-medium">
                  Tipo de atención que buscas *
                </label>
                <div className="relative">
                  <select
                    {...register('tipoAtencion')}
                    id="tipoAtencion"
                    className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition appearance-none"
                  >
                    <option value="">Selecciona el tipo de atención</option>
                    {tiposAtencion.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.tipoAtencion && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.tipoAtencion.message}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="problematica" className="block text-sm font-medium">
                  Describe tu motivo de consulta *
                </label>
                <textarea
                  {...register('problematica')}
                  id="problematica"
                  rows={4}
                  placeholder="Cuéntanos brevemente qué te motiva a buscar apoyo psicológico..."
                  className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition resize-none"
                />
                {errors.problematica && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.problematica.message}</span>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Preferencia de asignación *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors">
                    <input
                      {...register('preferenciaAsignacion')}
                      type="radio"
                      value="automatica"
                      className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 focus:ring-mauve-500"
                    />
                    <div>
                      <p className="font-medium">Asignación automática</p>
                      <p className="text-sm text-muted-foreground">
                        Te asignaremos el profesional más adecuado según tu perfil
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors">
                    <input
                      {...register('preferenciaAsignacion')}
                      type="radio"
                      value="explorar"
                      className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 focus:ring-mauve-500"
                    />
                    <div>
                      <p className="font-medium">Explorar perfiles</p>
                      <p className="text-sm text-muted-foreground">
                        Podrás revisar y elegir entre diferentes profesionales
                      </p>
                    </div>
                  </label>
                </div>
                {errors.preferenciaAsignacion && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.preferenciaAsignacion.message}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Error summary (shows after first submit attempt) */}
          {isSubmitted && Object.keys(errors).length > 0 && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm font-medium mb-2">
                Completa los siguientes campos para continuar:
              </p>
              <ul className="list-disc list-inside space-y-1 text-red-300 text-xs">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error?.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Atrás
            </button>
            
            <CTAButton
              type="submit"
              className="flex items-center space-x-2"
            >
              <span>Continuar</span>
            </CTAButton>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  )
}
