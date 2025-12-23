import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Shield } from 'lucide-react';
import { SignatureVerificationDialog } from './SignatureVerificationDialog';

interface SignatureVerificationButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const SignatureVerificationButton: React.FC<SignatureVerificationButtonProps> = ({
  variant = 'outline',
  size = 'default',
  className,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Shield className="h-4 w-4 mr-2" />
        Weryfikuj podpis
      </Button>
      <SignatureVerificationDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
