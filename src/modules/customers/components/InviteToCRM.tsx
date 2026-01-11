import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Mail, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Customer } from '@/shared/types';

interface InviteToCRMProps {
  customer: Customer;
  onSuccess?: (invitation: any) => void;
}

interface CRMInvitation {
  id: string;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  crm_workspace_id: string;
  crm_workspace_name: string;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
  accepted_at?: string;
}

const InviteToCRM: React.FC<InviteToCRMProps> = ({ customer, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<CRMInvitation[]>([]);
  const [email, setEmail] = useState(customer.email || '');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [message, setMessage] = useState('');

  // Mock workspaces - in real implementation, fetch from CRM API
  const availableWorkspaces = [
    { id: 'ws-1', name: 'Nekrolog Lodz' },
    { id: 'ws-2', name: 'Test Workspace' },
    { id: 'ws-3', name: 'Demo Company' },
  ];

  const handleInvite = async () => {
    if (!email || !selectedWorkspace) {
      toast.error('Proszę uzupełnić wszystkie wymagane pola');
      return;
    }

    setLoading(true);
    try {
      // Call CRM Edge Function to create invitation
      const response = await fetch('https://vsbgcalxbexigazzaftm.supabase.co/functions/v1/crm-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create_invitation',
          customer_id: customer.id,
          customer_name: customer.name,
          customer_email: email,
          crm_workspace_id: selectedWorkspace,
          message: message,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || result.error);
      }

      toast.success('Zaproszenie zostało wysłane');
      
      // Add to local list
      const newInvitation: CRMInvitation = {
        id: result.data.id,
        customer_id: customer.id,
        customer_email: email,
        customer_name: customer.name,
        crm_workspace_id: selectedWorkspace,
        crm_workspace_name: availableWorkspaces.find(w => w.id === selectedWorkspace)?.name || '',
        invitation_token: result.data.token,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      setInvitations([...invitations, newInvitation]);
      
      if (onSuccess) {
        onSuccess(newInvitation);
      }
      
      // Reset form
      setEmail(customer.email || '');
      setSelectedWorkspace('');
      setMessage('');
      setIsOpen(false);
      
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Wystąpił błąd podczas wysyłania zaproszenia');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Mail className="h-3 w-3" />
          Oczekuje
        </Badge>;
      case 'accepted':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Zaakceptowano
        </Badge>;
      case 'expired':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Wygasło
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Zaproś do CRM
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Zaproś klienta do CRM
        </CardTitle>
        <CardDescription>
          Wyślij zaproszenie do klienta, aby mógł korzystać z panelu CRM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Klient</Label>
            <Input
              id="customer-name"
              value={customer.name}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-email">Email klienta</Label>
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@klienta.pl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspace">Wybierz przestrzeń roboczą CRM</Label>
          <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz przestrzeń roboczą" />
            </SelectTrigger>
            <SelectContent>
              {availableWorkspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Wiadomość (opcjonalnie)</Label>
          <textarea
            id="message"
            className="w-full p-2 border rounded-md resize-none"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Dodaj osobistą wiadomość do zaproszenia..."
          />
        </div>

        {invitations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Historia zaproszeń</h4>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invitation.crm_workspace_name}</span>
                      {getStatusBadge(invitation.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Wysłano: {new Date(invitation.created_at).toLocaleDateString()}
                      {invitation.accepted_at && (
                        <span className="ml-2">
                          Zaakceptowano: {new Date(invitation.accepted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {invitation.status === 'pending' && (
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Podgląd
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleInvite}
            disabled={loading || !email || !selectedWorkspace}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Wysyłanie...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Wyślij zaproszenie
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Anuluj
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Klient otrzyma email z zaproszeniem do założenia konta w CRM. Po zaakceptowaniu zaproszenia
            będzie mógł przeglądać faktury i dokumenty udostępnione przez Twoją firmę.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default InviteToCRM;
