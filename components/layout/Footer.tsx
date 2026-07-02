'use client'

import { ContactForm } from '@/components/forms/ContactForm'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { 
  Heart, 
  Mail, 
  MapPin, 
  Phone,
  Twitter,
  Github,
  Linkedin,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border relative z-10">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-1">
            <ContactForm />
          </div>

          {/* Company Info */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6 h-full">
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-mauve rounded-lg flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <GradientText as="h3" className="text-2xl font-bold">
                    MotusDAO
                  </GradientText>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Plataforma integral de salud mental que combina tecnología blockchain, 
                  inteligencia artificial y atención profesional para tu bienestar.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-mauve-500" />
                  <span className="text-sm">contact@motusdao.org</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-mauve-500" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-mauve-500" />
                  <span className="text-sm">Ciudad de México, México</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex space-x-4">
                  <a
                    href="#"
                    className="w-10 h-10 glass-card rounded-lg flex items-center justify-center hover:bg-mauve-500/20 transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 glass-card rounded-lg flex items-center justify-center hover:bg-mauve-500/20 transition-colors"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 glass-card rounded-lg flex items-center justify-center hover:bg-mauve-500/20 transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6 h-full">
              <h3 className="text-lg font-semibold mb-6">Enlaces Rápidos</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Link 
                    href="/" 
                    className="flex items-center justify-between p-3 hover:bg-foreground/5 rounded-lg transition-colors group"
                  >
                    <span>Inicio</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <Link 
                    href="/motusai" 
                    className="flex items-center justify-between p-3 hover:bg-foreground/5 rounded-lg transition-colors group"
                  >
                    <span>MotusAI</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <Link 
                    href="/psicoterapia" 
                    className="flex items-center justify-between p-3 hover:bg-foreground/5 rounded-lg transition-colors group"
                  >
                    <span>Psicoterapia</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <Link 
                    href="/academia" 
                    className="flex items-center justify-between p-3 hover:bg-foreground/5 rounded-lg transition-colors group"
                  >
                    <span>Academia</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <Link 
                    href="/docs" 
                    className="flex items-center justify-between p-3 hover:bg-foreground/5 rounded-lg transition-colors group"
                  >
                    <span>Documentación</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-muted-foreground mb-4 md:mb-0">
              © 2026 MotusDAO. Todos los derechos reservados.
            </div>
            <div className="flex space-x-6 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacidad
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Términos
              </Link>
              <Link href="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
