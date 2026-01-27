import React from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Progress } from '@/shared/ui/progress';
import {
  Building2,
  Users,
  Shield,
  FileText,
  Briefcase,
  FolderOpen,
  CheckCircle2,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface OnboardingStep {
  id: number;
  title: string;
  icon: React.ReactNode;
  description: string;
  completed?: boolean;
  active?: boolean;
}

interface OnboardingSidebarProps {
  className?: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  onStepClick?: (stepId: number) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  companyType: 'sp_zoo' | 'sa' | 'jdg';
}

const getStepsForCompanyType = (companyType: 'sp_zoo' | 'sa' | 'jdg'): Omit<OnboardingStep, 'completed' | 'active'>[] => {
  if (companyType === 'jdg') {
    return [
      {
        id: 1,
        title: 'Dane podstawowe',
        icon: <Building2 className="h-5 w-5" />,
        description: 'Nazwa, NIP, adres',
      },
      {
        id: 2,
        title: 'Dane bankowe',
        icon: <Shield className="h-5 w-5" />,
        description: 'Konto bankowe',
      },
      {
        id: 3,
        title: 'Klienci',
        icon: <Users className="h-5 w-5" />,
        description: 'Pierwsi klienci',
      },
      {
        id: 4,
        title: 'Usługi',
        icon: <Briefcase className="h-5 w-5" />,
        description: 'Co sprzedajesz',
      },
    ];
  }

  // For sp_zoo and sa
  return [
    {
      id: 1,
      title: 'Typ spółki',
      icon: <Building2 className="h-5 w-5" />,
      description: 'Wybór formy prawnej',
    },
    {
      id: 2,
      title: 'Wspólnicy',
      icon: <Users className="h-5 w-5" />,
      description: 'Struktura właścicielska',
    },
    {
      id: 3,
      title: 'Zarząd',
      icon: <Shield className="h-5 w-5" />,
      description: 'Skład zarządu',
    },
    {
      id: 4,
      title: 'Zgody organizacyjne',
      icon: <Shield className="h-5 w-5" />,
      description: 'Uchwały i decyzje',
    },
    {
      id: 5,
      title: 'Potrzeby dokumentowe',
      icon: <FileText className="h-5 w-5" />,
      description: 'Rodzaje dokumentów',
    },
    {
      id: 6,
      title: 'Usługi',
      icon: <Briefcase className="h-5 w-5" />,
      description: 'Działalność firmy',
    },
    {
      id: 7,
      title: 'Konfiguracja',
      icon: <FolderOpen className="h-5 w-5" />,
      description: 'Struktura folderów',
    },
  ];
};

export const OnboardingSidebar: React.FC<OnboardingSidebarProps> = ({ 
  className,
  currentStep,
  totalSteps,
  completedSteps,
  onStepClick,
  collapsed = false,
  onToggleCollapsed,
  companyType,
}) => {
  const steps = getStepsForCompanyType(companyType).map(step => ({
    ...step,
    completed: completedSteps.includes(step.id),
    active: step.id === currentStep,
  }));

  const progressPercentage = (completedSteps.length / totalSteps) * 100;

  const getStepColor = (step: OnboardingStep) => {
    if (step.completed) return 'text-green-500';
    if (step.active) return 'text-blue-500';
    return 'text-slate-400';
  };

  const getStepBgColor = (step: OnboardingStep) => {
    if (step.completed) return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
    if (step.active) return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
    return 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className={cn("flex flex-col h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-800", className)}>
      {/* Header */}
      <div className={cn("border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm", collapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-start", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                {companyType === 'jdg' ? 'Kreator JDG' : 'Kreator spółki'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Krok {currentStep} z {totalSteps}
              </p>
            </div>
          )}
          {onToggleCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapsed}
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={collapsed ? "Rozwiń menu" : "Zwiń menu"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {!collapsed && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Postęp</span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                {completedSteps.length}/{totalSteps}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      )}
      
      {/* Steps Navigation */}
      <ScrollArea className="flex-1">
        <nav className={cn(collapsed ? "p-2" : "p-3")}>
          <div className="space-y-2">
            {steps.map((step) => (
              <Button
                key={step.id}
                variant="ghost"
                className={cn(
                  "group relative transition-all duration-200",
                  collapsed
                    ? "w-full justify-center h-12 px-0"
                    : "w-full justify-start h-auto p-3",
                  "hover:bg-slate-100 dark:hover:bg-slate-800/50",
                  getStepBgColor(step),
                  "border"
                )}
                onClick={() => onStepClick?.(step.id)}
                title={collapsed ? step.title : undefined}
                disabled={!step.completed && step.id > currentStep}
              >
                <div className={cn(
                  "flex items-center gap-3 w-full",
                  collapsed ? "justify-center" : "justify-start"
                )}>
                  <div className={cn(
                    "relative transition-transform group-hover:scale-110",
                    getStepColor(step),
                    step.active && "scale-110"
                  )}>
                    {step.icon}
                    {step.completed && (
                      <div className="absolute -bottom-1 -right-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      </div>
                    )}
                  </div>
                  
                  {!collapsed && (
                    <div className="flex flex-col items-start text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium leading-tight",
                          step.active ? "text-blue-900 dark:text-blue-100" : "text-slate-700 dark:text-slate-300"
                        )}>
                          {step.title}
                        </span>
                        {step.active && (
                          <ArrowRight className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {step.description}
                      </span>
                    </div>
                  )}
                </div>
                
                {step.active && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                )}
              </Button>
            ))}
          </div>
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {completedSteps.length === totalSteps ? (
              <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>Kreator ukończony</span>
              </div>
            ) : (
              <span>Pozostało {totalSteps - completedSteps.length} kroków</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
