import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ArrowLeft, FileText, Share2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { generateInvoiceNumber } from '@/shared/lib/invoice-utils';
import { getInvoiceNumberingSettings, upsertInvoiceNumberingSettings } from '@/modules/invoices/data/invoiceNumberingSettingsRepository';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/shared/context/AuthContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

const DocumentSettings = () => {
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  const userId = user?.id || null;
  const businessProfileId = selectedProfileId || null;
  
  // State for form fields and UI
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pattern, setPattern] = React.useState<'incremental'|'yearly'|'monthly'>('monthly');
  const [prefix, setPrefix] = React.useState('FV');
  const [invoiceCount, setInvoiceCount] = React.useState(0);
  const [countLoading, setCountLoading] = React.useState(false);

  // Fetch invoice count based on the selected pattern
  const fetchInvoiceCount = React.useCallback(async (userId: string, businessProfileId: string, pattern: string) => {
    if (!userId || !businessProfileId) {
      setCountLoading(false);
      return 0;
    }
    
    setCountLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('business_profile_id', businessProfileId);
      
      const now = new Date();
      
      if (pattern === 'yearly') {
        const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
        const endOfYear = new Date(now.getFullYear() + 1, 0, 1).toISOString();
        query = query
          .gte('issue_date', startOfYear)
          .lt('issue_date', endOfYear);
      } else if (pattern === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
        query = query
          .gte('issue_date', startOfMonth)
          .lt('issue_date', startOfNextMonth);
      }
      
      const { count, error } = await query;
      
      if (error) {
        console.error('Error fetching invoice count:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error in fetchInvoiceCount:', error);
      return 0;
    } finally {
      setCountLoading(false);
    }
  }, []);

  // Update invoice count when pattern changes
  React.useEffect(() => {
    if (!userId || !businessProfileId) {
      setInvoiceCount(0);
      setCountLoading(false);
      return;
    }

    fetchInvoiceCount(userId, businessProfileId, pattern).then(count => {
      setInvoiceCount(count);
    });
  }, [userId, businessProfileId, pattern, fetchInvoiceCount]);

  // Load settings from Supabase on component mount
  React.useEffect(() => {
    if (!userId || !businessProfileId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    
    async function loadSettings() {
      setLoading(true);
      try {
        // Try to load from Supabase
        const settings = await getInvoiceNumberingSettings(userId, businessProfileId);
        if (settings && !cancelled) {
          setPattern(settings.pattern as 'incremental'|'yearly'|'monthly' || 'monthly');
          setPrefix(settings.prefix || 'FV');
          // TODO: Fetch actual invoice count based on pattern
          // This is a placeholder - in a real app, you would query your invoices
          // and count based on the selected pattern
          setInvoiceCount(15); 
        } else if (!cancelled) {
          // Fallback to localStorage if no settings in Supabase
          const saved = localStorage.getItem('invoiceNumberingSettings');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setPattern(parsed.pattern || 'monthly');
              setPrefix(parsed.prefix || 'FV');
            } catch (e) {
              console.error('Error parsing saved settings:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error loading invoice numbering settings:', error);
        // Use the imported toast function directly
        toast.error('Nie udało się załadować ustawień numeracji');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    loadSettings();
    return () => { cancelled = true; };
  }, [userId, businessProfileId]);

  // Get current date for preview
  const now = new Date();
  
  // Generate preview number using the same function as in NewInvoice
  const previewNumber = generateInvoiceNumber(
    now,
    Math.max(1, invoiceCount + 1), // Ensure at least 1
    prefix,
    pattern
  );
  
  // Get count description based on pattern
  const getCountDescription = () => {
    if (pattern === 'incremental') return 'ogółem';
    if (pattern === 'yearly') return 'w tym roku';
    return 'w tym miesiącu';
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !businessProfileId) {
      toast.error('Brak wymaganych danych użytkownika');
      return;
    }
    
    setSaving(true);
    try {
      // Save to Supabase
      await upsertInvoiceNumberingSettings({
        user_id: userId,
        business_profile_id: businessProfileId,
        prefix,
        pattern
      });
      
      // Update localStorage for offline fallback
      localStorage.setItem('invoiceNumberingSettings', JSON.stringify({ pattern, prefix }));
      
      // Notify other components about the update
      window.dispatchEvent(new Event('invoiceNumberingSettingsUpdated'));
      
      toast.success('Ustawienia numeracji zostały zapisane');
    } catch (error) {
      console.error('Error saving invoice numbering settings:', error);
      toast.error('Nie udało się zapisać ustawień');
    } finally {
      setSaving(false);
    }
  };

  if (!businessProfileId) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ustawienia dokumentów</h1>
            <p className="text-muted-foreground">Wybierz firmę, aby edytować numerację dokumentów.</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Nie wybrano aktywnej firmy. Przełącz się na profil biznesowy i spróbuj ponownie.
            </p>
            <Button onClick={() => navigate('/settings/business-profiles')}>
              Zarządzaj profilami
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/settings')}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ustawienia dokumentów</h1>
          <p className="text-muted-foreground">Konfiguruj szablony faktur i numerację</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Numeracja dokumentów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-8"
            onSubmit={handleSubmit}
            autoComplete="off"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block font-medium mb-1">Prefiks faktury
                  <span className="ml-1 text-gray-400" title="Litery/cyfry, max 8 znaków">ⓘ</span>
                </label>
                <input
                  className="border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-3 py-2 w-full font-mono text-lg"
                  value={prefix}
                  onChange={e => setPrefix(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0,8))}
                  maxLength={8}
                  placeholder="Nazwa skrócona"
                />
              </div>
              <div className="space-y-4">
                <label className="block font-medium mb-1">Wzór numeracji</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="pattern" 
                      value="incremental" 
                      checked={pattern==='incremental'} 
                      onChange={() => setPattern('incremental')} 
                    />
                    <span className="font-mono">
                      {generateInvoiceNumber(now, 1, prefix, 'incremental')}
                    </span>
                    <span className="text-xs text-gray-500">(kolejny numer)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="pattern" 
                      value="yearly" 
                      checked={pattern==='yearly'} 
                      onChange={() => setPattern('yearly')} 
                    />
                    <span className="font-mono">
                      {generateInvoiceNumber(now, 1, prefix, 'yearly')}
                    </span>
                    <span className="text-xs text-gray-500">(rok + numer)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="pattern" 
                      value="monthly" 
                      checked={pattern==='monthly'} 
                      onChange={() => setPattern('monthly')} 
                    />
                    <span className="font-mono">
                      {generateInvoiceNumber(now, 1, prefix, 'monthly')}
                    </span>
                    <span className="text-xs text-gray-500">(rok + miesiąc + numer)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mt-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row items-center gap-8 flex-1">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Podgląd następnego numeru</div>
                  <div className="font-mono text-xl text-blue-700 bg-white px-3 py-1 rounded border border-blue-100 shadow-sm">{previewNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    Liczba wystawionych faktur ({getCountDescription()})
                  </div>
                  <div className="font-mono text-xl bg-white px-3 py-1 rounded border border-gray-100 shadow-sm min-w-[50px] text-center">
                    {countLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : invoiceCount}
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded font-semibold shadow transition ml-auto mt-4 md:mt-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 min-w-[150px] justify-center"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Zapisuję...
                  </>
                ) : 'Zapisz ustawienia'}
              </button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Zmiana wzoru numeracji wpłynie na kolejne wystawiane faktury. Numeracja zawsze rośnie i nie powtarza się.
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Shared Links management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Udostępnione linki
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Przeglądaj i usuwaj aktywne linki publiczne do Twoich dokumentów.</p>
          <Button onClick={() => navigate('/shares')}>Zarządzaj linkami</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentSettings;
