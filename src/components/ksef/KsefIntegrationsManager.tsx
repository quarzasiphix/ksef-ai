import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { KsefContextManager, KsefIntegration } from '@/shared/services/ksef/ksefContextManager';
import { getKsefConfig } from '@/shared/services/ksef/config';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  Plus,
  Eye,
  Trash2
} from 'lucide-react';

interface KsefIntegrationsManagerProps {
  companyId: string;
  supabase: any;
}

export function KsefIntegrationsManager({ companyId, supabase }: KsefIntegrationsManagerProps) {
  const [integrations, setIntegrations] = useState<KsefIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const config = getKsefConfig('test');
  const contextManager = new KsefContextManager(config, supabase);

  useEffect(() => {
    loadIntegrations();
  }, [companyId]);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await contextManager.listIntegrations({ companyId });
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (integrationId: string) => {
    setVerifying(integrationId);
    try {
      const result = await contextManager.verifyIntegration(companyId);
      
      if (result.success) {
        alert('Integration verified successfully!');
      } else {
        alert(`Verification failed: ${result.error}`);
      }
      
      await loadIntegrations();
    } catch (error) {
      alert('Verification failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setVerifying(null);
    }
  };

  const handleRevoke = async (integrationId: string) => {
    if (!confirm('Are you sure you want to revoke this integration?')) {
      return;
    }

    try {
      await contextManager.revokeIntegration(companyId, 'Revoked by user');
      alert('Integration revoked successfully');
      await loadIntegrations();
    } catch (error) {
      alert('Failed to revoke integration: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; color: string; label: string }> = {
      active: { icon: CheckCircle2, color: 'bg-green-500', label: 'Active' },
      pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
      error: { icon: XCircle, color: 'bg-red-500', label: 'Error' },
      revoked: { icon: AlertTriangle, color: 'bg-gray-500', label: 'Revoked' },
      expired: { icon: AlertTriangle, color: 'bg-orange-500', label: 'Expired' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading integrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">KSeF Integrations</h2>
          <p className="text-muted-foreground">
            Manage KSeF access for companies that granted you permission
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertDescription>
          <strong>How it works:</strong> Companies grant Tovernet permission in the KSeF portal. 
          Add their integration here and verify the connection to start managing their invoices.
        </AlertDescription>
      </Alert>

      {/* Integrations List */}
      {integrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Integrations Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first KSeF integration to start managing client invoices
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      NIP: {integration.taxpayerNip}
                      {getStatusBadge(integration.status)}
                    </CardTitle>
                    <CardDescription>
                      Provider: {integration.providerNip}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(integration.id)}
                      disabled={verifying === integration.id}
                    >
                      {verifying === integration.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span className="ml-2">Verify</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(integration.id)}
                      disabled={integration.status === 'revoked'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Granted Scopes */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Granted Permissions:</h4>
                    <div className="flex flex-wrap gap-2">
                      {integration.grantedScopes.length > 0 ? (
                        integration.grantedScopes.map((scope) => (
                          <Badge key={scope} variant="secondary">
                            {scope}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No scopes defined</span>
                      )}
                    </div>
                  </div>

                  {/* Last Verified */}
                  {integration.lastVerifiedAt && (
                    <div className="text-sm text-muted-foreground">
                      Last verified: {new Date(integration.lastVerifiedAt).toLocaleString()}
                    </div>
                  )}

                  {/* Verification Error */}
                  {integration.verificationError && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <strong>Verification Error:</strong> {integration.verificationError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Actions for Active Integration */}
                  {integration.status === 'active' && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Invoices
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </Button>
                    </div>
                  )}

                  {/* Pending Instructions */}
                  {integration.status === 'pending' && (
                    <Alert>
                      <AlertDescription>
                        <strong>Next Steps:</strong>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Ensure the company granted permission in KSeF portal</li>
                          <li>Click "Verify" to test the connection</li>
                          <li>Once verified, you can start managing their invoices</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Integration Form (Modal/Dialog would be better) */}
      {showAddForm && (
        <AddIntegrationForm
          companyId={companyId}
          contextManager={contextManager}
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            loadIntegrations();
          }}
        />
      )}
    </div>
  );
}

interface AddIntegrationFormProps {
  companyId: string;
  contextManager: KsefContextManager;
  onClose: () => void;
  onSuccess: () => void;
}

function AddIntegrationForm({ companyId, contextManager, onClose, onSuccess }: AddIntegrationFormProps) {
  const [taxpayerNip, setTaxpayerNip] = useState('');
  const [providerNip, setProviderNip] = useState('');
  const [scopes, setScopes] = useState<string[]>(['InvoiceRead']);
  const [submitting, setSubmitting] = useState(false);

  const availableScopes = [
    'InvoiceRead',
    'InvoiceWrite',
    'InvoiceExport',
    'CredentialsManage',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await contextManager.createIntegration({
        companyId,
        taxpayerNip,
        providerNip,
        grantedScopes: scopes,
      });

      alert('Integration created successfully! Click "Verify" to test the connection.');
      onSuccess();
    } catch (error) {
      alert('Failed to create integration: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add KSeF Integration</CardTitle>
        <CardDescription>
          Add a company that has granted you KSeF permission
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Client NIP (Taxpayer)
            </label>
            <input
              type="text"
              value={taxpayerNip}
              onChange={(e) => setTaxpayerNip(e.target.value)}
              placeholder="1234567890"
              maxLength={10}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The NIP of the company that granted you permission
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Provider NIP (Tovernet)
            </label>
            <input
              type="text"
              value={providerNip}
              onChange={(e) => setProviderNip(e.target.value)}
              placeholder="0000000000"
              maxLength={10}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your Tovernet NIP that was granted permission
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Granted Permissions
            </label>
            <div className="space-y-2">
              {availableScopes.map((scope) => (
                <label key={scope} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded"
                  />
                  <span className="text-sm">{scope}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select the permissions that were granted in KSeF portal
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Before adding:</strong> Ensure the company has granted permission 
              to your Tovernet NIP in the official KSeF portal.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Add Integration'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
