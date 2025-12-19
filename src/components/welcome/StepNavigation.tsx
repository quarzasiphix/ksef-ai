
import { Button } from "@/components/ui/button";
import React from "react";
import { ArrowLeft, ArrowRight, SkipForward } from "lucide-react";

interface StepNavigationProps {
  canGoBack: boolean;
  nextDisabled?: boolean;
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  skipLabel?: string;
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  canGoBack,
  nextDisabled,
  onBack,
  onNext,
  onSkip,
  nextLabel = "Dalej",
  skipLabel = "Zrobię to później",
}) => {
  return (
    <div className="w-full flex gap-2 justify-between items-center">
      <div>
        {canGoBack && (
          <Button variant="outline" onClick={onBack} size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Wróć
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground"
            size="lg"
          >
            {skipLabel}
          </Button>
        )}
        <Button onClick={onNext} disabled={nextDisabled} size="lg">
          {nextLabel}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default StepNavigation;
