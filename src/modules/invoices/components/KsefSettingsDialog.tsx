import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface KsefSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessProfileId: string;
}

export function KsefSettingsDialog({ open, onOpenChange, businessProfileId }: KsefSettingsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [settings, setSettings] = useState({
    enabled: false,
    environment: 'test' as 'test' | 'production',
    token: '',
    expiresAt: '',
  });

  // Load existing settings when dialog opens
  useEffect(() => {
    if (open && businessProfileId) {
      loadExistingSettings();
    }
  }, [open, businessProfileId]);

  const loadExistingSettings = async () => {
    try {
      // Check for existing KSeF integration
      const { data: integration } = await supabase
        .from('ksef_integrations')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .single();

      // Also check business profile settings
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('ksef_enabled, ksef_environment, ksef_token_encrypted, ksef_token_expires_at')
        .eq('id', businessProfileId)
        .single();

      const isEnabled = integration?.status === 'active' || profile?.ksef_enabled || false;
      
      setSettings({
        enabled: isEnabled,
        environment: profile?.ksef_environment || 'test',
        token: '', // Don't load token for security
        expiresAt: profile?.ksef_token_expires_at || '',
      });
    } catch (error) {
      console.error('Error loading KSeF settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (settings.enabled && settings.token) {
        // Create or update KSeF integration record
        const { data: existingIntegration } = await supabase
          .from('ksef_integrations')
          .select('*')
          .eq('business_profile_id', businessProfileId)
          .single();

        // Get NIP from business profile
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('tax_id')
          .eq('id', businessProfileId)
          .single();

        const integrationData = {
          business_profile_id: businessProfileId,
          taxpayer_nip: profile?.tax_id || '',
          provider_nip: profile?.tax_id || '', // For now, use same NIP as provider
          granted_scopes: ['invoice.send', 'invoice.receive'],
          status: 'active',
          granted_at: new Date().toISOString(),
          granted_by: null, // Will be set by system
        };

        let error;
        if (existingIntegration) {
          // Update existing integration
          ({ error } = await supabase
            .from('ksef_integrations')
            .update({
              status: 'active',
              taxpayer_nip: profile?.tax_id || '',
              provider_nip: profile?.tax_id || '',
              granted_scopes: ['invoice.send', 'invoice.receive'],
              granted_at: new Date().toISOString(),
            })
            .eq('business_profile_id', businessProfileId));
        } else {
          // Create new integration
          ({ error } = await supabase
            .from('ksef_integrations')
            .insert(integrationData));
        }

        if (error) throw error;

        // Store the actual token in ksef_credentials table
        const encryptedToken = btoa(settings.token);
        const { error: credentialError } = await supabase
          .from('ksef_credentials')
          .upsert({
            provider_nip: profile?.tax_id || '',
            auth_type: 'token',
            secret_ref: encryptedToken,
            expires_at: settings.expiresAt || '2026-12-31',
            is_active: true,
          }, {
            onConflict: 'provider_nip'
          });

        if (credentialError) throw credentialError;

        // Also update business profile for backwards compatibility
        const { error: profileError } = await supabase
          .from('business_profiles')
          .update({
            ksef_enabled: settings.enabled,
            ksef_environment: settings.environment,
            ksef_token_encrypted: encryptedToken,
            ksef_token_expires_at: settings.expiresAt || null,
          })
          .eq('id', businessProfileId);

        if (profileError) throw profileError;
      } else {
        // Disable KSeF integration
        const { error } = await supabase
          .from('ksef_integrations')
          .update({ status: 'disabled' })
          .eq('business_profile_id', businessProfileId);

        if (error && error.code !== 'PGRST116') { // Ignore if no integration exists
          throw error;
        }

        // Also update business profile
        const { error: profileError } = await supabase
          .from('business_profiles')
          .update({
            ksef_enabled: settings.enabled,
            ksef_environment: settings.environment,
            ksef_token_encrypted: null,
            ksef_token_expires_at: null,
          })
          .eq('id', businessProfileId);

        if (profileError) throw profileError;
      }

      toast({
        title: 'Zapisano ustawienia KSeF',
        description: settings.enabled 
          ? 'Integracja KSeF została włączona' 
          : 'Integracja KSeF została wyłączona',
      });

      onOpenChange(false);
      
      // Trigger a reload of the parent component
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zapisać ustawień',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ksef-test-connection', {
        body: { businessProfileId },
      });

      if (error) throw error;

      setTestResult({
        success: data.success,
        message: data.success 
          ? 'Połączenie z KSeF działa poprawnie' 
          : data.error || 'Test połączenia nie powiódł się',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd podczas testowania połączenia',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ustawienia KSeF</DialogTitle>
          <DialogDescription>
            Skonfiguruj integrację z Krajowym Systemem e-Faktur
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="ksef-enabled">Włącz integrację KSeF</Label>
            <Switch
              id="ksef-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ksef-environment">Środowisko</Label>
            <Select
              value={settings.environment}
              onValueChange={(value: 'test' | 'production') => 
                setSettings({ ...settings, environment: value })
              }
            >
              <SelectTrigger id="ksef-environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Testowe</SelectItem>
                <SelectItem value="production">Produkcyjne</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Użyj środowiska testowego do sprawdzenia integracji
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ksef-token">Token KSeF</Label>
            <Input
              id="ksef-token"
              type="password"
              placeholder="Wklej token z portalu KSeF"
              value={settings.token}
              onChange={(e) => setSettings({ ...settings, token: e.target.value })}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Token można wygenerować w portalu KSeF po zalogowaniu</span>
              <a
                href={settings.environment === 'production' ? 'https://api.ksef.mf.gov.pl/docs/v2' : 'https://api-test.ksef.mf.gov.pl/docs/v2'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                Otwórz portal KSeF
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ksef-expires">Data wygaśnięcia (opcjonalnie)</Label>
            <Input
              id="ksef-expires"
              type="date"
              value={settings.expiresAt}
              onChange={(e) => setSettings({ ...settings, expiresAt: e.target.value })}
            />
          </div>

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </div>
            </Alert>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!settings.token || testing}
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Testuj połączenie
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
