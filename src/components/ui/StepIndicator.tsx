import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  id: string
  label: string
}

export interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-center py-4", className)}>
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isUpcoming = stepNumber > currentStep

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted && "border-[#00505C] bg-[#00505C]",
                    isCurrent && "border-[#00505C] bg-white",
                    isUpcoming && "border-gray-300 bg-white"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        isCurrent && "text-[#00505C]",
                        isUpcoming && "text-gray-400"
                      )}
                    >
                      {stepNumber}
                    </span>
                  )}
                </div>
                  {step.label && (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        isCurrent && "text-[#00505C]",
                        isCompleted && "text-[#00505C]",
                        isUpcoming && "text-gray-400"
                      )}
                    >
                      {step.label}
                    </span>
                  )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-12 transition-colors",
                    isCompleted ? "bg-[#00505C]" : "bg-gray-300"
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

