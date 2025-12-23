import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { XCircle, AlertTriangle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuthorizationBlockingAlertProps {
  reason: string;
  authorizationId?: string;
  severity?: 'error' | 'warning';
  showCreateDecision?: boolean;
  className?: string;
}

export const AuthorizationBlockingAlert: React.FC<AuthorizationBlockingAlertProps> = ({
  reason,
  authorizationId,
  severity = 'error',
  showCreateDecision = true,
  className,
}) => {
  const navigate = useNavigate();

  const isError = severity === 'error';

  return (
    <Alert
      variant={isError ? 'destructive' : 'default'}
      className={className}
    >
      {isError ? (
        <XCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <AlertTitle>
        {isError ? '❌ Operacja zablokowana' : '⚠️ Uwaga: poza zakresem'}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{reason}</p>
        
        <div className="flex gap-2 flex-wrap">
          {authorizationId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/decisions/${authorizationId}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Zobacz uchwałę
            </Button>
          )}
          
          {showCreateDecision && !authorizationId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/decisions/new')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Utwórz uchwałę
            </Button>
          )}
        </div>
        
        {isError && (
          <p className="text-xs text-muted-foreground mt-2">
            💡 Wskazówka: Możesz zapisać jako szkic i wrócić po uzyskaniu zgody.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};
