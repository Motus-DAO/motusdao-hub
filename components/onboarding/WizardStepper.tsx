'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Circle, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole } from '@/lib/onboarding-store'

interface Step {
  id: number
  title: string
  description: string
}

interface WizardStepperProps {
  steps: Step[]
  currentStep: number
  role: UserRole
  onStepClick?: (stepIndex: number) => void
  isStepValid?: (stepIndex: number) => boolean
}

export function WizardStepper({ steps, currentStep, role, onStepClick, isStepValid }: WizardStepperProps) {
  // Use state to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="w-full">
      {/* Desktop Stepper */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isUpcoming = index > currentStep
            // Only check step validity on client to prevent hydration mismatch
            const canNavigate = isMounted 
              ? (isCompleted || isCurrent || (isStepValid && isStepValid(index)))
              : (isCompleted || isCurrent) // Default to false for upcoming steps on server
            const isClickable = onStepClick && canNavigate

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                      backgroundColor: isCompleted 
                        ? '#8B5CF6' 
                        : isCurrent 
                        ? '#8B5CF6' 
                        : '#374151'
                    }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                      isCompleted && "bg-mauve-500",
                      isCurrent && "bg-mauve-500 ring-4 ring-mauve-500/20",
                      isUpcoming && "bg-gray-600",
                      isClickable && "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-mauve-400/30"
                    )}
                    onClick={() => isClickable && onStepClick(index)}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : isUpcoming && !canNavigate ? (
                      <Lock className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-white" />
                    )}
                  </motion.div>
                  
                  {/* Step Info */}
                  <div 
                    className={cn(
                      "mt-2 text-center max-w-32 transition-all duration-200",
                      isClickable && "cursor-pointer hover:scale-105"
                    )}
                    onClick={() => isClickable && onStepClick(index)}
                  >
                    <p className={cn(
                      "text-sm font-medium transition-colors",
                      isCompleted || isCurrent ? "text-white" : "text-gray-400",
                      isClickable && "hover:text-mauve-300"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </p>
                    {isClickable && (
                      <p className="text-xs text-mauve-400 mt-1 font-medium">
                        Click para editar
                      </p>
                    )}
                    {isUpcoming && !canNavigate && (
                      <p className="text-xs text-gray-600 mt-1">
                        Bloqueado
                      </p>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ 
                        scaleX: isCompleted ? 1 : 0,
                        originX: 0
                      }}
                      className="h-full bg-mauve-500"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile Stepper */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{
                backgroundColor: '#8B5CF6'
              }}
              className="w-8 h-8 rounded-full bg-mauve-500 flex items-center justify-center"
            >
              <span className="text-white text-sm font-bold">
                {currentStep + 1}
              </span>
            </motion.div>
            <div>
              <p className="text-sm font-medium text-white">
                {steps[currentStep]?.title}
              </p>
              <p className="text-xs text-gray-400">
                Paso {currentStep + 1} de {steps.length}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-gray-400">
              {role === 'usuario' ? 'Usuario' : 'Profesional'}
            </p>
          </div>
        </div>

        {/* Mobile Step Navigation */}
        <div className="flex justify-center space-x-2 mb-4">
          {steps.map((_, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            // Only check step validity on client to prevent hydration mismatch
            const canNavigate = isMounted 
              ? (index <= currentStep || (isStepValid && isStepValid(index)))
              : (index <= currentStep) // Default to false for upcoming steps on server
            const isClickable = onStepClick && canNavigate

            return (
              <button
                key={index}
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-200",
                  isCompleted && "bg-mauve-500",
                  isCurrent && "bg-mauve-500 scale-125",
                  !isCompleted && !isCurrent && "bg-gray-600",
                  isClickable && "cursor-pointer hover:scale-110 hover:bg-mauve-400",
                  !isClickable && "cursor-not-allowed opacity-50"
                )}
              />
            )
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ 
              width: `${((currentStep + 1) / steps.length) * 100}%`
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-2 bg-gradient-to-r from-mauve-500 to-iris-500 rounded-full"
          />
        </div>
      </div>
    </div>
  )
}
