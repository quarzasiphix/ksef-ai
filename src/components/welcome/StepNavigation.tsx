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
    <div className="flex gap-2 w-full mt-4">
      {/* Back */}
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack}
        className="flex-1"
      >
        Wróć
      </Button>

      {/* Skip (optional) */}
      {onSkip && (
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex-1"
        >
          {skipLabel}
        </Button>
      )}

      {/* Next */}
      <Button onClick={onNext} disabled={nextDisabled} className="flex-1">
        Dalej
      </Button>
    </div>
  );
};

export default StepNavigation; 