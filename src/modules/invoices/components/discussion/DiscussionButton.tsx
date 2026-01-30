import React from 'react';
import { Button } from '@/shared/ui/button';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';

interface DiscussionButtonProps {
  onClick: () => void;
  unreadCount?: number;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const DiscussionButton: React.FC<DiscussionButtonProps> = ({
  onClick,
  unreadCount = 0,
  variant = 'outline',
  size = 'default',
  className = '',
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={`relative ${className}`}
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      Dyskusja z kontrahentem
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="ml-2 px-1.5 py-0.5 text-xs"
        >
          {unreadCount}
        </Badge>
      )}
    </Button>
  );
};
