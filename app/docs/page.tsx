'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { 
  FileText, 
  Book, 
  Palette, 
  Briefcase, 
  Download,
  ExternalLink,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

const docCategories = [
  {
    id: 'brandbook',
    title: 'Brandbook',
    description: 'Guía completa de la identidad visual y valores de MotusDAO',
    icon: Book,
    color: 'from-blue-500 to-purple-600',
    sections: [
      'Introducción',
      'Misión y Visión',
      'Valores Corporativos',
      'Personalidad de Marca',
      'Aplicaciones'
    ]
  },
  {
    id: 'brandkit',
    title: 'Brandkit',
    description: 'MotusDAO Brand Kit v2 con sistema visual y aplicaciones',
    icon: Palette,
    color: 'from-pink-500 to-rose-600',
    sections: [
      'Brand Foundation',
      'Color System & Themes',
      'Typography',
      'Logo System & Usage',
      'UI Language & Components',
      'Social & Marketing Applications',
      'Galería del Brand Kit v2'
    ]
  },
  {
    id: 'whitepaper',
    title: 'Whitepaper',
    description: 'Documento técnico sobre la tecnología y protocolo',
    icon: FileText,
    color: 'from-green-500 to-emerald-600',
    sections: [
      'Resumen Ejecutivo',
      'Tecnología Blockchain',
      'Protocolo de Salud Mental',
      'Tokenomics',
      'Roadmap'
    ]
  },
  {
    id: 'business-model',
    title: 'Modelo de Negocio',
    description: 'Estrategia comercial y modelo de ingresos',
    icon: Briefcase,
    color: 'from-yellow-500 to-orange-600',
    sections: [
      'Propuesta de Valor',
      'Segmentos de Mercado',
      'Canales de Distribución',
      'Modelo de Ingresos',
      'Análisis Competitivo'
    ]
  }
]

export default function DocsPage() {
  const [activeCategory, setActiveCategory] = useState('brandbook')
  const [searchTerm, setSearchTerm] = useState('')
  const [isBrandkitCarouselOpen, setIsBrandkitCarouselOpen] = useState(false)
  const [brandkitSlideIndex, setBrandkitSlideIndex] = useState(0)

  const filteredCategories = docCategories.filter(category =>
    category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeDoc = docCategories.find(doc => doc.id === activeCategory)
  const brandkitSlides = [
    {
      title: 'Portada · MotusDAO Brand Kit v2',
      description: 'Portada principal del sistema de marca MotusDAO.',
      imageUrl: 'https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/brandkit/motusdao-brandkit-v2/07.png'
    },
    {
      title: '01 · Brand Foundation',
      description: 'Fundamentos de marca, rasgos centrales y lógica de temas.',
      imageUrl: 'https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/brandkit/motusdao-brandkit-v2/01.png'
    },
    {
      title: '02 · Color System & Themes',
      description: 'Paleta oficial, gradientes y reglas de uso para light, dark y matrix.',
      imageUrl: 'https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/brandkit/motusdao-brandkit-v2/02.png'
    },
    {
      title: '03 · Typography',
      description: 'Sistema tipográfico y jerarquías para interfaces y piezas editoriales.',
      imageUrl: 'https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/brandkit/motusdao-brandkit-v2/03.png'
    },
    {
      title: '04 · Logo System & Usage',
      description: 'Versiones de logo, clear space y reglas de uso correcto.',
      imageUrl: 'https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/brandkit/motusdao-brandkit-v2/04.png'
    },
    {
      title: '05 · UI Language & Components',
      description: 'Botones, tarjetas, inputs y patrones visuales del sistema.',
      imageUrl: 'https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/brandkit/motusdao-brandkit-v2/05.png'
    },
    {
      title: '06 · Social & Marketing Applications',
      description: 'Adaptaciones para social media, presentaciones y website hero.',
      imageUrl: 'https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/brandkit/motusdao-brandkit-v2/06.png'
    }
  ]
  const nextBrandkitSlide = () => {
    setBrandkitSlideIndex((prev) => (prev + 1) % brandkitSlides.length)
  }

  const prevBrandkitSlide = () => {
    setBrandkitSlideIndex((prev) => (prev - 1 + brandkitSlides.length) % brandkitSlides.length)
  }

  const openBrandkitCarousel = () => {
    setBrandkitSlideIndex(0)
    setIsBrandkitCarouselOpen(true)
  }
  const handleVerOnlineClick = () => {
    if (activeCategory !== 'brandkit') {
      setActiveCategory('brandkit')
    }
    openBrandkitCarousel()
  }

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-iris-500 rounded-xl flex items-center justify-center mr-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <GradientText as="h1" className="text-4xl md:text-5xl font-bold">
                  Documentación
                </GradientText>
                <p className="text-muted-foreground">Recursos y guías de MotusDAO</p>
              </div>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <GlassCard className="p-6">
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar documentación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent"
                />
              </div>
            </GlassCard>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <GlassCard className="p-6 sticky top-24">
                  <h3 className="text-lg font-semibold mb-4">Categorías</h3>
                  <div className="space-y-2">
                    {filteredCategories.map((category) => {
                      const Icon = category.icon
                      return (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                            activeCategory === category.id
                              ? 'bg-mauve-500/20 border border-mauve-500/30'
                              : 'hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 bg-gradient-to-r ${category.color} rounded-lg flex items-center justify-center`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{category.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {category.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            </div>

            {/* Document Content */}
            <div className="lg:col-span-3">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <GlassCard className="p-8">
                  {/* Document Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${activeDoc?.color} rounded-lg flex items-center justify-center`}>
                        {activeDoc && <activeDoc.icon className="w-6 h-6 text-white" />}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{activeDoc?.title}</h2>
                        <p className="text-muted-foreground">{activeDoc?.description}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <CTAButton variant="secondary" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Descargar PDF
                      </CTAButton>
                      <button
                        type="button"
                        onClick={handleVerOnlineClick}
                        className="inline-flex items-center justify-center font-medium focus-ring btn-secondary px-4 py-2 text-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Online
                      </button>
                    </div>
                  </div>

                  {/* Table of Contents */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">Índice</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {activeDoc?.sections.map((section, index) => (
                        <a
                          key={index}
                          href={`#section-${index + 1}`}
                          className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                          <span className="text-sm">{section}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Document Content */}
                  {activeCategory === 'brandkit' ? (
                    <div className="prose prose-invert max-w-none">
                      <div id="section-1" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">01 · Brand Foundation</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Define la personalidad visual de MotusDAO: calmada, confiable, inteligente,
                          futurista y accesible. Establece el uso de los tres modos de tema y cómo
                          se integran en el producto y comunicación.
                        </p>
                      </div>

                      <div id="section-2" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">02 · Color System & Themes</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Sistema cromático oficial con gradientes principales y secundarios para Light,
                          Dark y Matrix. Incluye reglas de contraste, jerarquía visual y consistencia
                          entre interfaz, piezas editoriales y marketing.
                        </p>
                      </div>

                      <div id="section-3" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">03 · Typography</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Jerarquía tipográfica basada en Jura e Inter para claridad de producto, con
                          acentos editoriales y variantes Matrix. Prioriza legibilidad, ritmo visual
                          y coherencia entre componentes.
                        </p>
                      </div>

                      <div id="section-4" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">04 · Logo System & Usage</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Define versiones del logo, clear space, tamaños mínimos y recomendaciones Do/Don&apos;t
                          para mantener reconocimiento y calidad visual en todos los canales.
                        </p>
                      </div>

                      <div id="section-5" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">05 · UI Language & Components</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Componentes base del Hub: botones primario/secundario/ghost, glass cards,
                          métricas, campos de entrada, chips y navegación. Incluye principios de motion
                          y reglas de estilo para mantener una UX consistente.
                        </p>
                      </div>

                      <div id="section-6" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">06 · Social & Marketing Applications</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Ejemplos de implementación para Instagram, stories, covers, presentaciones y
                          website hero. Se prioriza claridad de mensaje, CTA visible y uso controlado de
                          gradientes para preservar identidad.
                        </p>
                      </div>

                      <div id="section-7" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">Galería del Brand Kit v2</h3>
                        <button
                          type="button"
                          onClick={handleVerOnlineClick}
                          className="group relative w-full overflow-hidden rounded-2xl border border-white/15 text-left transition-all duration-300 hover:border-mauve-400/50 hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-mauve-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          aria-label="Abrir galería del Brand Kit v2"
                        >
                          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full">
                            <img
                              src={brandkitSlides[0].imageUrl}
                              alt={brandkitSlides[0].title}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
                            <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 md:p-8">
                              <span className="mb-3 inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                                {brandkitSlides.length} slides · Brand Kit v2
                              </span>
                              <p className="font-heading text-xl sm:text-2xl font-semibold text-white mb-2">
                                {brandkitSlides[0].title}
                              </p>
                              <p className="text-sm sm:text-base text-white/80 max-w-xl mb-4 leading-relaxed">
                                Explora fundamentos, color, tipografía, logo, UI y aplicaciones de marketing en un recorrido visual interactivo.
                              </p>
                              <span className="inline-flex w-fit items-center justify-center font-medium btn-secondary px-4 py-2 text-sm pointer-events-none">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Ver Online
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      <div id="section-1" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">Introducción</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          MotusDAO es una plataforma descentralizada que combina tecnología blockchain,
                          inteligencia artificial y atención profesional para revolucionar el acceso
                          a servicios de salud mental. Nuestra misión es democratizar el bienestar
                          mental a través de soluciones innovadoras y accesibles.
                        </p>
                      </div>

                      <div id="section-2" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">Características Principales</h3>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-mauve-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span>Asistente de IA especializado en salud mental</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-mauve-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span>Plataforma de psicoterapia virtual</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-mauve-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span>Academia de bienestar mental</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-mauve-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span>Sistema de pagos descentralizado</span>
                          </li>
                        </ul>
                      </div>

                      <div id="section-3" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">Tecnología</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          MotusDAO utiliza tecnología blockchain para garantizar la privacidad,
                          seguridad y transparencia de todas las transacciones y datos de salud mental.
                          Nuestra plataforma está construida sobre principios de descentralización
                          y privacidad por diseño.
                        </p>
                      </div>

                      <div id="section-4" className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">Impacto Social</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          A través de MotusDAO, buscamos reducir las barreras de acceso a servicios
                          de salud mental, especialmente en comunidades desatendidas. Nuestra
                          plataforma democratiza el acceso a atención profesional y herramientas
                          de bienestar mental de alta calidad.
                        </p>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {isBrandkitCarouselOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm px-4 py-10 md:px-8 md:py-12 overflow-y-auto">
          <div className="relative z-[101] w-full max-w-5xl mx-auto glass-card border border-white/15 rounded-2xl p-4 md:p-6">
            <button
              type="button"
              onClick={() => setIsBrandkitCarouselOpen(false)}
              className="absolute top-4 right-4 z-[140] btn-secondary p-2 rounded-lg"
              aria-label="Cerrar carrusel"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-[110] mb-4 pr-12">
              <div className="text-center">
                <p className="font-semibold">{brandkitSlides[brandkitSlideIndex].title}</p>
                <p className="text-sm text-muted-foreground">
                  {brandkitSlideIndex + 1} / {brandkitSlides.length}
                </p>
              </div>
            </div>

            <div className="relative z-[105] rounded-xl overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={prevBrandkitSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-[140] btn-secondary p-2 rounded-lg"
                aria-label="Slide anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <img
                src={brandkitSlides[brandkitSlideIndex].imageUrl}
                alt={brandkitSlides[brandkitSlideIndex].title}
                className="w-full h-auto max-h-[75vh] object-contain bg-black/30 pointer-events-none"
              />

              <button
                type="button"
                onClick={nextBrandkitSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-[140] btn-secondary p-2 rounded-lg"
                aria-label="Siguiente slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mt-4 mb-0">
              {brandkitSlides[brandkitSlideIndex].description}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
