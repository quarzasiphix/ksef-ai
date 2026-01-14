import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Link, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface LinkRequest {
  id: string;
  crm_user_id: string;
  crm_email: string;
  token: string;
  expires_at: string;
  status: 'pending' | 'confirmed' | 'expired';
}

export default function CrmLinkAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [linkRequest, setLinkRequest] = useState<LinkRequest | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');
  const crmUserId = searchParams.get('crm_user_id');
  const crmEmail = searchParams.get('email');

  useEffect(() => {
    if (!token || !crmUserId || !crmEmail) {
      setError('Invalid authorization link');
      setLoading(false);
      return;
    }

    fetchLinkRequest();
    fetchCurrentUser();
  }, [token, crmUserId, crmEmail]);

  const fetchLinkRequest = async () => {
    try {
      // Call CRM edge function to validate the link request
      const response = await fetch('https://vsbgcalxbexigazzaftm.supabase.co/functions/v1/validate-crm-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          crm_user_id: crmUserId
        })
      });

      if (!response.ok) {
        throw new Error('Invalid link request');
      }

      const data = await response.json();
      setLinkRequest(data.request);
    } catch (error) {
      console.error('Error fetching link request:', error);
      setError('Failed to validate link request');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const confirmLink = async () => {
    if (!currentUser || !linkRequest) return;

    setConfirming(true);
    try {
      // Call CRM edge function to confirm the link
      const response = await fetch('https://vsbgcalxbexigazzaftm.supabase.co/functions/v1/confirm-crm-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          token,
          crm_user_id: crmUserId,
          ksiegai_user_id: currentUser.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to confirm link');
      }

      const data = await response.json();
      
      // Update local state
      setLinkRequest({
        ...linkRequest,
        status: 'confirmed',
        ksiegai_user_id: currentUser.id
      });

      // Close window after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);

    } catch (error) {
      console.error('Error confirming link:', error);
      setError('Failed to confirm account linking');
    } finally {
      setConfirming(false);
    }
  };

  const cancelLink = () => {
    window.close();
  };

  const isExpired = () => {
    if (!linkRequest) return true;
    return new Date(linkRequest.expires_at) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating link request...</p>
        </div>
      </div>
    );
  }

  if (error || !linkRequest) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Link Request Invalid</CardTitle>
            <CardDescription>
              The authorization link is invalid or has expired. Please request a new link from your CRM system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={cancelLink} className="w-full">
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-500" />
            <Link className="h-8 w-8 text-green-500 ml-2" />
          </div>
          <CardTitle>Link CRM Account</CardTitle>
          <CardDescription>
            Connect your Ksiegai account with your CRM system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Link Request Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">CRM Email</p>
                <p className="text-xs text-muted-foreground">{linkRequest.crm_email}</p>
              </div>
              <Badge variant="outline">
                {linkRequest.status}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Request Token</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {linkRequest.token.substring(0, 8)}...
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Expires</p>
                <p className="text-xs font-mono">
                  {new Date(linkRequest.expires_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Current User Info */}
          {currentUser && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Your Ksiegai Account</h4>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{currentUser.email}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {currentUser.id.substring(0, 8)}...
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
          )}

          {/* Status Messages */}
          {linkRequest.status === 'confirmed' && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Account linking confirmed! This window will close automatically.
              </AlertDescription>
            </Alert>
          )}

          {isExpired() && linkRequest.status !== 'confirmed' && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                This link request has expired. Please request a new link from your CRM system.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {linkRequest.status === 'pending' && !isExpired() && currentUser && (
            <div className="space-y-2">
              <Button 
                onClick={confirmLink} 
                disabled={confirming}
                className="w-full"
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Confirm Account Link
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={cancelLink}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          {!currentUser && (
            <div className="space-y-2">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please log in to your Ksiegai account to confirm the linking.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/auth/login')} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Login to Ksiegai
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
