import React from 'react';
import { Badge } from '@/shared/ui/badge';

interface RyczaltRateChipProps {
  rate: number;
  categoryName?: string;
  variant?: 'default' | 'compact';
  showName?: boolean;
}

export function RyczaltRateChip({ 
  rate, 
  categoryName, 
  variant = 'default',
  showName = false 
}: RyczaltRateChipProps) {
  const getRateColor = (rate: number) => {
    if (rate <= 3) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (rate <= 5.5) return 'bg-green-100 text-green-700 border-green-300';
    if (rate <= 8.5) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (rate <= 12) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const displayText = showName && categoryName 
    ? `${rate}% ${categoryName}` 
    : `${rate}%`;

  return (
    <Badge 
      variant="outline" 
      className={`${getRateColor(rate)} font-mono font-semibold ${
        variant === 'compact' ? 'text-xs px-1.5 py-0' : 'text-xs'
      }`}
    >
      {displayText}
    </Badge>
  );
}
