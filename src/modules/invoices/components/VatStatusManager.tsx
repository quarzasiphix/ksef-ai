import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface BusinessProfile {
  id: string;
  name: string;
  entity_type: string;
  is_vat_exempt: boolean;
  vat_status: string;
  vat_exemption_reason?: string;
}

interface VatStatusManagerProps {
  businessProfileId: string;
  onSave?: () => void;
}

const VAT_STATUS_OPTIONS = [
  { value: 'none', label: 'Brak VAT (zwolniony)', description: 'Firma zwolniona z VAT' },
  { value: 'zero', label: 'VAT 0%', description: 'Stawka 0% VAT' },
  { value: 'standard', label: 'VAT 23%', description: 'Standardowa stawka 23%' },
];

export function VatStatusManager({ businessProfileId, onSave }: VatStatusManagerProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch business profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['business-profile', businessProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessProfileId)
        .single();
      
      if (error) throw error;
      return data as BusinessProfile;
    },
    enabled: !!businessProfileId,
  });

  // Update VAT status mutation
  const updateVatStatus = useMutation({
    mutationFn: async (updates: Partial<BusinessProfile>) => {
      const { data, error } = await supabase
        .from('business_profiles')
        .update(updates)
        .eq('id', businessProfileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-profile', businessProfileId] });
      toast.success('Status VAT zaktualizowany');
      setIsEditing(false);
      onSave?.();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  if (isLoading) {
    return <div className="animate-pulse">Ładowanie...</div>;
  }

  if (!profile) {
    return <div className="text-red-500">Nie znaleziono profilu firmy</div>;
  }

  const currentVatOption = VAT_STATUS_OPTIONS.find(option => option.value === profile.vat_status);

  const handleVatStatusChange = (newVatStatus: string) => {
    const isVatExempt = newVatStatus === 'none' || newVatStatus === 'zero';
    
    updateVatStatus.mutate({
      vat_status: newVatStatus,
      is_vat_exempt: isVatExempt,
      vat_exemption_reason: isVatExempt ? 'Zwolnienie z VAT' : null,
    });
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Status VAT</h3>
          <p className="text-sm text-gray-600">{profile.name}</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isEditing ? 'Anuluj' : 'Edytuj'}
        </button>
      </div>

      {/* Current Status Display */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            profile.is_vat_exempt 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {currentVatOption?.label || 'Nieznany'}
          </div>
          {profile.vat_exemption_reason && (
            <span className="text-sm text-gray-600">({profile.vat_exemption_reason})</span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {currentVatOption?.description}
        </p>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="border-t pt-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nowy status VAT:
              </label>
              <div className="space-y-2">
                {VAT_STATUS_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="vat_status"
                      value={option.value}
                      checked={option.value === profile.vat_status}
                      onChange={() => handleVatStatusChange(option.value)}
                      className="mr-3"
                      disabled={updateVatStatus.isPending}
                    />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                disabled={updateVatStatus.isPending}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick VAT Registration Notice */}
      {profile.is_vat_exempt && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-start gap-2">
            <div className="text-yellow-600 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800">Gotowy do rejestracji VAT?</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Gdy Twoja firma będzie gotowa do rejestracji VAT, możesz szybko zmienić status na "VAT 23%" aby automatycznie zacząć naliczać podatek.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
