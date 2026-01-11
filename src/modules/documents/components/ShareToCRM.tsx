import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { toast } from 'sonner';
import { Share2, Users, FileText, Eye, Lock, Send, CheckCircle } from 'lucide-react';
import { Document } from '@/shared/types';

interface ShareToCRMProps {
  document: Document;
  onSuccess?: (share: any) => void;
}

interface CRMShare {
  id: string;
  document_id: string;
  crm_workspace_id: string;
  crm_workspace_name: string;
  shared_by: string;
  shared_at: string;
  access_level: 'view' | 'download' | 'edit';
  expires_at?: string;
  is_active: boolean;
}

const ShareToCRM: React.FC<ShareToCRMProps> = ({ document, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [accessLevel, setAccessLevel] = useState<'view' | 'download' | 'edit'>('view');
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [sharedDocuments, setSharedDocuments] = useState<CRMShare[]>([]);

  // Mock workspaces - in real implementation, fetch from CRM API
  const availableWorkspaces = [
    { id: 'ws-1', name: 'Nekrolog Lodz' },
    { id: 'ws-2', name: 'Test Workspace' },
    { id: 'ws-3', name: 'Demo Company' },
  ];

  const handleShare = async () => {
    if (selectedWorkspaces.length === 0) {
      toast.error('Proszę wybrać co najmniej jedną przestrzeń roboczą');
      return;
    }

    setLoading(true);
    try {
      // Call CRM Edge Function to share document
      const response = await fetch('https://vsbgcalxbexigazzaftm.supabase.co/functions/v1/crm-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'share_document',
          document_id: document.id,
          document_name: document.name,
          document_type: document.type,
          document_url: document.url,
          crm_workspace_ids: selectedWorkspaces,
          access_level: accessLevel,
          expires_in: expiresIn,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || result.error);
      }

      toast.success('Dokument został udostępniony w CRM');
      
      // Add to local list
      const newShares: CRMShare[] = selectedWorkspaces.map(workspaceId => ({
        id: result.data.id + workspaceId,
        document_id: document.id,
        crm_workspace_id: workspaceId,
        crm_workspace_name: availableWorkspaces.find(w => w.id === workspaceId)?.name || '',
        shared_by: 'Current User',
        shared_at: new Date().toISOString(),
        access_level,
        expires_at: expiresIn !== 'never' ? new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toISOString() : undefined,
        is_active: true,
      }));

      setSharedDocuments([...sharedDocuments, ...newShares]);
      
      if (onSuccess) {
        onSuccess(newShares);
      }
      
      // Reset form
      setSelectedWorkspaces([]);
      setAccessLevel('view');
      setExpiresIn('never');
      setIsOpen(false);
      
    } catch (error: any) {
      console.error('Error sharing document:', error);
      toast.error(error.message || 'Wystąpił błąd podczas udostępniania dokumentu');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      const response = await fetch('https://vsbgcalxbexigazzaftm.supabase.co/functions/v1/crm-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'revoke_share',
          share_id: shareId,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || result.error);
      }

      toast.success('Udostępnienie zostało cofnięte');
      
      // Update local list
      setSharedDocuments(sharedDocuments.map(share => 
        share.id === shareId ? { ...share, is_active: false } : share
      ));
      
    } catch (error: any) {
      console.error('Error revoking share:', error);
      toast.error(error.message || 'Wystąpił błąd podczas cofania udostępnienia');
    }
  };

  const getAccessLevelBadge = (level: string) => {
    switch (level) {
      case 'view':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Podgląd
        </Badge>;
      case 'download':
        return <Badge variant="default" className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Pobieranie
        </Badge>;
      case 'edit':
        return <Badge variant="default" className="flex items-center gap-1 bg-blue-100 text-blue-800">
          <FileText className="h-3 w-3" />
          Edycja
        </Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const getExpirationText = (expiresAt?: string) => {
    if (!expiresAt) return 'Bezterminowo';
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) return 'Wygasło';
    if (daysUntilExpiry === 1) return 'Wygasa jutro';
    if (daysUntilExpiry <= 7) return `Wygasa za ${daysUntilExpiry} dni`;
    return `Wygasa za ${daysUntilExpiry} dni`;
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Udostępnij w CRM
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Udostępnij dokument w CRM
        </CardTitle>
        <CardDescription>
          Wybierz przestrzenie roboczą CRM, w której chcesz udostępnić ten dokument
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Dokument</label>
          <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{document.name}</span>
            <Badge variant="outline">{document.type}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Wybierz przestrzenie roboczą CRM</label>
          <div className="space-y-2">
            {availableWorkspaces.map((workspace) => (
              <div key={workspace.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`workspace-${workspace.id}`}
                  checked={selectedWorkspaces.includes(workspace.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedWorkspaces([...selectedWorkspaces, workspace.id]);
                    } else {
                      setSelectedWorkspaces(selectedWorkspaces.filter(id => id !== workspace.id));
                    }
                  }}
                />
                <label
                  htmlFor={`workspace-${workspace.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {workspace.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Poziom dostępu</label>
            <Select value={accessLevel} onValueChange={(value: 'view' | 'download' | 'edit') => setAccessLevel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Podgląd</SelectItem>
                <SelectItem value="download">Pobieranie</SelectItem>
                <SelectItem value="edit">Edycja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Wygasa za</label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Bezterminowo</SelectItem>
                <SelectItem value="7">7 dni</SelectItem>
                <SelectItem value="30">30 dni</SelectItem>
                <SelectItem value="90">90 dni</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {sharedDocuments.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Historia udostępniania</h4>
            <div className="space-y-2">
              {sharedDocuments.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{share.crm_workspace_name}</span>
                      {getAccessLevelBadge(share.access_level)}
                      {share.is_active ? (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Aktywne
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Cofnięte
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Udostępniono: {new Date(share.shared_at).toLocaleDateString()}
                      <span className="ml-2">
                        {getExpirationText(share.expires_at)}
                      </span>
                    </div>
                  </div>
                  {share.is_active && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRevoke(share.id)}
                    >
                      Cofnij
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleShare}
            disabled={loading || selectedWorkspaces.length === 0}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Udostępnianie...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Udostępnij w CRM
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Anuluj
          </Button>
        </div>

        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            Dokument zostanie udostępniony wybranym przestrzeniom roboczym CRM. Użytkownicy z tych przestrzeni
            będą mogli przeglądać dokument zgodnie z ustawionym poziomem dostępu.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ShareToCRM;
