'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { 
  ArrowLeft,
  Clock,
  BookOpen,
  CheckCircle,
  ExternalLink,
  Bot,
  Brain,
  FileText,
  Target,
  ChevronDown,
  ChevronRight,
  Copy
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { IA_PARA_PSICOLOGOS } from '@/content/courses/ia-para-psicologos'
import { PublicCourseDetail } from '@/components/academy/PublicCourseDetail'

export default function IAParaPsicologosPage() {
  return (
    <PublicCourseDetail
      slug="ia-para-psicologos"
      fallback={<LegacyIAParaPsicologosPage />}
    />
  )
}

function LegacyIAParaPsicologosPage() {
  const totalMinutes = IA_PARA_PSICOLOGOS.agenda.reduce((sum, item) => sum + item.minutes, 0)
  const [expandedPrompts, setExpandedPrompts] = useState<{ [key: string]: boolean }>({})

  const togglePrompt = (promptId: string) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [promptId]: !prev[promptId]
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Link href="/academia">
              <CTAButton variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a la Academia
              </CTAButton>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Course Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mb-8"
              >
                <GlassCard className="p-8">
                  {/* Course Image */}
                  <div className="h-64 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg flex items-center justify-center mb-6 relative overflow-hidden">
                    <Image 
                      src="https://i.postimg.cc/tgGdtwSX/MotusAI.png" 
                      alt={IA_PARA_PSICOLOGOS.title}
                      width={800}
                      height={400}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  {/* Course Info */}
                  <div className="mb-6">
                    <div className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full mb-4">
                      Tecnología & Psicología
                    </div>
                    <GradientText as="h1" className="text-3xl md:text-4xl font-bold mb-2">
                      {IA_PARA_PSICOLOGOS.title}
                    </GradientText>
                    {IA_PARA_PSICOLOGOS.subtitle && (
                      <p className="text-lg text-muted-foreground mb-4">
                        {IA_PARA_PSICOLOGOS.subtitle}
                      </p>
                    )}
                    <p className="text-lg text-muted-foreground mb-6">
                      {IA_PARA_PSICOLOGOS.summary}
                    </p>
                  </div>

                  {/* Course Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Clock className="w-5 h-5 text-blue-500 mr-1" />
                        <span className="font-semibold">{IA_PARA_PSICOLOGOS.durationMinutes} min</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Duración</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <BookOpen className="w-5 h-5 text-blue-500 mr-1" />
                        <span className="font-semibold">{IA_PARA_PSICOLOGOS.agenda.length} módulos</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Contenido</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Target className="w-5 h-5 text-blue-500 mr-1" />
                        <span className="font-semibold">{IA_PARA_PSICOLOGOS.learningOutcomes.length} objetivos</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Aprendizaje</p>
                    </div>
                  </div>

                  {/* Learning Outcomes */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Lo que aprenderás</h3>
                    <div className="space-y-2">
                      {IA_PARA_PSICOLOGOS.learningOutcomes.map((outcome, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground">{outcome}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <CTAButton size="lg" glow className="flex-1" disabled>
                      <Bot className="w-5 h-5 mr-2" />
                      Próximamente
                    </CTAButton>
                    <CTAButton variant="secondary" size="lg">
                      <FileText className="w-5 h-5 mr-2" />
                      Ver Materiales
                    </CTAButton>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Course Sections */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-6"
              >
                {IA_PARA_PSICOLOGOS.sections.map((section, index) => (
                  <GlassCard key={index} className="p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-blue-500" />
                      {section.heading}
                    </h3>
                    
                    {section.body && (
                      <p className="text-muted-foreground mb-4">{section.body}</p>
                    )}
                    
                    {section.bullets && (
                      <ul className="space-y-2 mb-4">
                        {section.bullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex} className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-sm text-muted-foreground">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    
                    {section.code && (
                      <div className="bg-black/20 rounded-lg p-4 mb-4">
                        <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                          {section.code}
                        </pre>
                      </div>
                    )}
                    
                    {section.note && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <p className="text-sm text-yellow-400 font-medium">💡 {section.note}</p>
                      </div>
                    )}
                  </GlassCard>
                ))}
              </motion.div>

              {/* Activities */}
              {IA_PARA_PSICOLOGOS.activities && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="mt-8"
                >
                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <Target className="w-5 h-5 mr-2 text-green-500" />
                      Actividades Prácticas
                    </h3>
                    {IA_PARA_PSICOLOGOS.activities.map((activity, index) => (
                      <div key={index} className="mb-6">
                        <h4 className="font-semibold mb-2">{activity.heading}</h4>
                        {activity.body && (
                          <p className="text-muted-foreground mb-3">{activity.body}</p>
                        )}
                        {activity.bullets && (
                          <ul className="space-y-2">
                            {activity.bullets.map((bullet, bulletIndex) => (
                              <li key={bulletIndex} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-muted-foreground">{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </GlassCard>
                </motion.div>
              )}

              {/* Prompt Examples */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-8"
              >
                <GlassCard className="p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Bot className="w-5 h-5 mr-2 text-blue-500" />
                    Ejemplos de Prompts para Salud Mental
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Colección de prompts listos para usar en diferentes contextos clínicos y psicoeducativos. 
                    Haz clic en cada ejemplo para ver el prompt completo y copiarlo.
                  </p>
                  
                  <div className="space-y-4">
                    {/* Soporte emocional */}
                    <div className="border border-white/10 rounded-lg">
                      <button
                        onClick={() => togglePrompt('soporte-emocional')}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold">Soporte emocional y conversación</h4>
                          <p className="text-sm text-muted-foreground">Role Prompting, Few-shot</p>
                        </div>
                        {expandedPrompts['soporte-emocional'] ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      {expandedPrompts['soporte-emocional'] && (
                        <div className="p-4 border-t border-white/10">
                          <div className="bg-black/20 rounded-lg p-4 mb-3">
                            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
{`Actúa como un asistente empático y no clínico en salud mental. Usa un enfoque basado en evidencia para guiar una conversación sobre la preocupación del usuario. Comienza preguntando qué desea hablar, usa preguntas abiertas y refuerzos breves. Ofrece pasos siguientes concretos. No emitas diagnósticos.

Si detectas riesgo (p. ej., ideación suicida), responde con: "Me preocupa lo que compartes. Si estás en peligro, llama a emergencia local. También puedes contactar a la línea 988 (EE. UU.) u otro recurso local."

Ejemplo:
Usuario: "Me siento solo."
Respuesta esperada: Explorar emoción, validar, sugerir conexión social específica y un micro-paso para hoy.`}
                            </pre>
                          </div>
                          <button
                            onClick={() => copyToClipboard(`Actúa como un asistente empático y no clínico en salud mental. Usa un enfoque basado en evidencia para guiar una conversación sobre la preocupación del usuario. Comienza preguntando qué desea hablar, usa preguntas abiertas y refuerzos breves. Ofrece pasos siguientes concretos. No emitas diagnósticos.

Si detectas riesgo (p. ej., ideación suicida), responde con: "Me preocupa lo que compartes. Si estás en peligro, llama a emergencia local. También puedes contactar a la línea 988 (EE. UU.) u otro recurso local."

Ejemplo:
Usuario: "Me siento solo."
Respuesta esperada: Explorar emoción, validar, sugerir conexión social específica y un micro-paso para hoy.`)}
                            className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copiar prompt</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Seguimiento de ánimo */}
                    <div className="border border-white/10 rounded-lg">
                      <button
                        onClick={() => togglePrompt('seguimiento-animo')}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold">Seguimiento de ánimo y evaluación</h4>
                          <p className="text-sm text-muted-foreground">Mood Tracking, Zero-shot/COT</p>
                        </div>
                        {expandedPrompts['seguimiento-animo'] ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      {expandedPrompts['seguimiento-animo'] && (
                        <div className="p-4 border-t border-white/10">
                          <div className="bg-black/20 rounded-lg p-4 mb-3">
                            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
{`Actúa como coach TCC no clínico. Pide una actualización diaria centrada en momentos de ansiedad o cambios de ánimo. Resume patrones en 3 viñetas, ofrece 1 reencuadre TCC y 1 acción práctica para las próximas 24 horas. No diagnostiques.

Entrada: {{diario_breve}}
Salida: 
- Patrones:
- Reencuadre:
- Acción 24h:

COT para detectar patrones:
Del siguiente diario, identifica "pensamientos automáticos negativos" (TAN). 
1) Lista TAN. 2) Agrúpalos por tema. 3) Propón 1 reencuadre por grupo. 
Di los pasos de tu razonamiento de forma breve.
Texto: {{diario}}`}
                            </pre>
                          </div>
                          <button
                            onClick={() => copyToClipboard(`Actúa como coach TCC no clínico. Pide una actualización diaria centrada en momentos de ansiedad o cambios de ánimo. Resume patrones en 3 viñetas, ofrece 1 reencuadre TCC y 1 acción práctica para las próximas 24 horas. No diagnostiques.

Entrada: {{diario_breve}}
Salida: 
- Patrones:
- Reencuadre:
- Acción 24h:

COT para detectar patrones:
Del siguiente diario, identifica "pensamientos automáticos negativos" (TAN). 
1) Lista TAN. 2) Agrúpalos por tema. 3) Propón 1 reencuadre por grupo. 
Di los pasos de tu razonamiento de forma breve.
Texto: {{diario}}`)}
                            className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copiar prompt</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Intervenciones TCC/DBT */}
                    <div className="border border-white/10 rounded-lg">
                      <button
                        onClick={() => togglePrompt('intervenciones-tcc')}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold">Intervenciones TCC/DBT</h4>
                          <p className="text-sm text-muted-foreground">Few-shot</p>
                        </div>
                        {expandedPrompts['intervenciones-tcc'] ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      {expandedPrompts['intervenciones-tcc'] && (
                        <div className="p-4 border-t border-white/10">
                          <div className="bg-black/20 rounded-lg p-4 mb-3">
                            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
{`Preguntas socráticas (TCC):
Guía al usuario con preguntas socráticas para cuestionar el pensamiento negativo.
Pensamiento: "{{pensamiento_usuario}}"
Devuelve 3 preguntas que exploren evidencia a favor/en contra, alternativas y costo/beneficio.
No diagnostiques ni prometas resultados.

Habilidades DBT (regulación emocional):
Usuario reporta emoción intensa. Ofrece 3 habilidades DBT (p. ej., TIP, distracción, auto-calma) con instrucciones de 2 pasos cada una, adaptadas a hogar/oficina. Lenguaje sencillo.`}
                            </pre>
                          </div>
                          <button
                            onClick={() => copyToClipboard(`Preguntas socráticas (TCC):
Guía al usuario con preguntas socráticas para cuestionar el pensamiento negativo.
Pensamiento: "{{pensamiento_usuario}}"
Devuelve 3 preguntas que exploren evidencia a favor/en contra, alternativas y costo/beneficio.
No diagnostiques ni prometas resultados.

Habilidades DBT (regulación emocional):
Usuario reporta emoción intensa. Ofrece 3 habilidades DBT (p. ej., TIP, distracción, auto-calma) con instrucciones de 2 pasos cada una, adaptadas a hogar/oficina. Lenguaje sencillo.`)}
                            className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copiar prompt</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Manejo de crisis */}
                    <div className="border border-white/10 rounded-lg">
                      <button
                        onClick={() => togglePrompt('manejo-crisis')}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold">Manejo de crisis y seguridad</h4>
                          <p className="text-sm text-muted-foreground">Zero-shot</p>
                        </div>
                        {expandedPrompts['manejo-crisis'] ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      {expandedPrompts['manejo-crisis'] && (
                        <div className="p-4 border-t border-white/10">
                          <div className="bg-black/20 rounded-lg p-4 mb-3">
                            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
{`Soy una IA de información general en salud mental y no sustituyo atención profesional.
Si detectas riesgo inminente (ideación suicida, plan, medios), responde EN PRIMERA LÍNEA:
"If estás en peligro, llama a tu número de emergencia local de inmediato. En EE. UU.: 988.
Si no estás en EE. UU., contacta a tus servicios locales." Evita consejos clínicos.
Reitera límites de servicio cada 3 interacciones.`}
                            </pre>
                          </div>
                          <button
                            onClick={() => copyToClipboard(`Soy una IA de información general en salud mental y no sustituyo atención profesional.
Si detectas riesgo inminente (ideación suicida, plan, medios), responde EN PRIMERA LÍNEA:
"If estás en peligro, llama a tu número de emergencia local de inmediato. En EE. UU.: 988.
Si no estás en EE. UU., contacta a tus servicios locales." Evita consejos clínicos.
Reitera límites de servicio cada 3 interacciones.`)}
                            className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copiar prompt</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Resumen de sesiones */}
                    <div className="border border-white/10 rounded-lg">
                      <button
                        onClick={() => togglePrompt('resumen-sesiones')}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold">Resumen de sesiones clínicas</h4>
                          <p className="text-sm text-muted-foreground">Extracción estructurada</p>
                        </div>
                        {expandedPrompts['resumen-sesiones'] ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      {expandedPrompts['resumen-sesiones'] && (
                        <div className="p-4 border-t border-white/10">
                          <div className="bg-black/20 rounded-lg p-4 mb-3">
                            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
{`Resume la transcripción en 3 párrafos: 
1) Emociones predominantes, 2) Temas recurrentes, 3) Avances/pendientes.
Añade 3 preguntas abiertas para la próxima sesión. Evita diagnosticar.

Transcripción: {{texto}}

Del texto clínico, extrae en el siguiente formato:
Síntomas: <lista>
Factores de riesgo: <lista>
Factores protectores: <lista>
Recomendaciones basadas en evidencia (no diagnósticos): <lista>
Texto: {{transcripción/nota}}`}
                            </pre>
                          </div>
                          <button
                            onClick={() => copyToClipboard(`Resume la transcripción en 3 párrafos: 
1) Emociones predominantes, 2) Temas recurrentes, 3) Avances/pendientes.
Añade 3 preguntas abiertas para la próxima sesión. Evita diagnosticar.

Transcripción: {{texto}}

Del texto clínico, extrae en el siguiente formato:
Síntomas: <lista>
Factores de riesgo: <lista>
Factores protectores: <lista>
Recomendaciones basadas en evidencia (no diagnósticos): <lista>
Texto: {{transcripción/nota}}`)}
                            className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copiar prompt</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Resources */}
              {IA_PARA_PSICOLOGOS.resources && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="mt-8"
                >
                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-purple-500" />
                      Recursos Adicionales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {IA_PARA_PSICOLOGOS.resources.map((resource, index) => (
                        <a
                          key={index}
                          href={resource.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                        >
                          <span className="text-sm font-medium">{resource.label}</span>
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                        </a>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="space-y-6"
              >
                {/* Agenda */}
                <GlassCard className="p-6 sticky top-24">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-500" />
                    Agenda del Curso
                  </h3>
                  <div className="space-y-3">
                    {IA_PARA_PSICOLOGOS.agenda.map((item, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-blue-400">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium">{item.title}</h4>
                            <span className="text-xs text-muted-foreground bg-white/10 px-2 py-1 rounded">
                              {item.minutes} min
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Duración total</span>
                      <span className="text-sm font-bold text-blue-400">{totalMinutes} minutos</span>
                    </div>
                  </div>
                </GlassCard>

                {/* CTA Actions */}
                {IA_PARA_PSICOLOGOS.cta && (
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
                    <div className="space-y-3">
                      {IA_PARA_PSICOLOGOS.cta.map((cta, index) => (
                        <a
                          key={index}
                          href={cta.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <CTAButton variant="secondary" size="sm" className="w-full">
                            {cta.label}
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </CTAButton>
                        </a>
                      ))}
                    </div>
                  </GlassCard>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
