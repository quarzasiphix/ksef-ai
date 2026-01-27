import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';
import { Menu, ArrowLeft } from 'lucide-react';
import { OnboardingSidebar } from './OnboardingSidebar';
import { cn } from '@/shared/lib/utils';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  onStepClick?: (stepId: number) => void;
  onCancel?: () => void;
  companyType: 'sp_zoo' | 'sa' | 'jdg';
  title?: string;
  subtitle?: string;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ 
  children,
  currentStep,
  totalSteps,
  completedSteps,
  onStepClick,
  onCancel,
  companyType,
  title,
  subtitle
}) => {
  const COLLAPSED_KEY = 'onboarding_sidebar_collapsed';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDesktopCollapsed = () => {
    const next = !desktopCollapsed;
    setDesktopCollapsed(next);

    try {
      window.localStorage.setItem(COLLAPSED_KEY, String(next));
    } catch {
      // ignore
    }
  };

  const handleMobileNavigateTo = (stepId: number) => {
    onStepClick?.(stepId);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="px-4 pt-4 pb-2 text-left">
              <SheetTitle>
                {companyType === 'jdg' ? 'Kreator JDG' : 'Kreator spółki'}
              </SheetTitle>
              <SheetDescription>
                Krok {currentStep} z {totalSteps}
              </SheetDescription>
            </SheetHeader>
            <OnboardingSidebar
              currentStep={currentStep}
              totalSteps={totalSteps}
              completedSteps={completedSteps}
              onStepClick={handleMobileNavigateTo}
              companyType={companyType}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      {!desktopCollapsed ? (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-background transition-[width] duration-200 ease-in-out lg:h-full overflow-hidden">
          <OnboardingSidebar
            currentStep={currentStep}
            totalSteps={totalSteps}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
            onToggleCollapsed={handleToggleDesktopCollapsed}
            companyType={companyType}
          />
        </aside>
      ) : (
        <aside className="hidden lg:flex lg:flex-col lg:w-16 lg:border-r lg:bg-background transition-[width] duration-200 ease-in-out lg:h-full overflow-hidden">
          <OnboardingSidebar
            currentStep={currentStep}
            totalSteps={totalSteps}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
            collapsed={true}
            onToggleCollapsed={handleToggleDesktopCollapsed}
            companyType={companyType}
          />
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-background/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Anuluj
                </Button>
              )}
              
              {/* Title */}
              <div>
                {title && (
                  <h1 className="text-xl font-semibold text-foreground">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Indicator (Mobile) */}
            <div className="lg:hidden">
              <div className="text-sm text-muted-foreground">
                {currentStep} / {totalSteps}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
