import { Button } from "@/components/ui/button";
import React from "react";

interface StepNavigationProps {
  /** Show the back button */
  canGoBack: boolean;
  /** Disable the next button */
  nextDisabled?: boolean;
  /** Callback for the back action */
  onBack: () => void;
  /** Callback for the next action */
  onNext: () => void;
  /** Optional skip handler. If provided, a skip button will be rendered. */
  onSkip?: () => void;
  /** Label for the skip button (defaults to "Pomiń") */
  skipLabel?: string;
}

/**
 * A shared navigation control used across the onboarding flow to ensure a
 * consistent look & feel for all steps.
 */
const StepNavigation: React.FC<StepNavigationProps> = ({
  canGoBack,
  nextDisabled,
  onBack,
  onNext,
  onSkip,
  skipLabel = "Pomiń",
}) => {
  return (
    <div>
      {/* Sticky bar for mobile */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-white dark:bg-neutral-900 border-t border-blue-100 dark:border-blue-900 flex sm:hidden px-2 py-3 gap-2 justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={!canGoBack}
          className="flex-1"
        >
          Wróć
        </Button>
        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="flex-1"
          >
            {skipLabel}
          </Button>
        )}
        <Button onClick={onNext} disabled={nextDisabled} className="flex-1">
          Dalej
        </Button>
      </div>
      {/* Inline bar for desktop */}
      <div className="hidden sm:flex gap-2 w-full mt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={!canGoBack}
          className="flex-1"
        >
          Wróć
        </Button>
        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="flex-1"
          >
            {skipLabel}
          </Button>
        )}
        <Button onClick={onNext} disabled={nextDisabled} className="flex-1">
          Dalej
        </Button>
      </div>
    </div>
  );
};

export default StepNavigation; 