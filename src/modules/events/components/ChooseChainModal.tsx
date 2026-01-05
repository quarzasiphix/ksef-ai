/**
 * Choose Chain Modal
 * 
 * Modal for manually selecting a chain to attach an orphaned event
 */

import React, { useState, useEffect } from 'react';
import { Search, Link2, Calendar, FileText } from 'lucide-react';
import { searchChainsForAttach, attachEventToChain } from '../data/orphanedEventsRepository';
import type { ChainSearchResult, AttachEventResult } from '../types/orphanedEvents';

interface ChooseChainModalProps {
  eventId: string;
  businessProfileId: string;
  isOpen: boolean;
  onClose: () => void;
  onAttached?: (result: AttachEventResult) => void;
}

export function ChooseChainModal({
  eventId,
  businessProfileId,
  isOpen,
  onClose,
  onAttached,
}: ChooseChainModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [chains, setChains] = useState<ChainSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadChains();
    }
  }, [isOpen, searchQuery]);

  const loadChains = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await searchChainsForAttach({
        business_profile_id: businessProfileId,
        search_query: searchQuery || undefined,
        event_id: eventId,
        limit: 10,
      });

      setChains(results);
    } catch (err) {
      console.error('Error searching chains:', err);
      setError('Nie udało się wyszukać łańcuchów');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttach = async (chainId: string) => {
    setIsAttaching(true);
    setError(null);

    try {
      const result = await attachEventToChain({
        event_id: eventId,
        chain_id: chainId,
      });

      if (result.success) {
        onAttached?.(result);
        onClose();
      } else {
        setError(result.error || 'Nie udało się przypisać zdarzenia');
      }
    } catch (err) {
      console.error('Error attaching event:', err);
      setError('Wystąpił błąd podczas przypisywania zdarzenia');
    } finally {
      setIsAttaching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Wybierz łańcuch</h2>
          <p className="text-sm text-gray-600 mt-1">
            Wybierz łańcuch, do którego chcesz przypisać to zdarzenie
          </p>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj po numerze, tytule lub typie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : chains.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Nie znaleziono łańcuchów</p>
              <p className="text-sm mt-1">Spróbuj zmienić kryteria wyszukiwania</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chains.map((chain) => (
                <button
                  key={chain.chain_id}
                  onClick={() => handleAttach(chain.chain_id)}
                  disabled={isAttaching}
                  className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{chain.title}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {chain.chain_number}
                        </span>
                        {chain.relevance_score >= 0.8 && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                            Polecane
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {chain.chain_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {chain.event_count} zdarzeń
                        </span>
                        {chain.last_activity_at && (
                          <span className="text-xs">
                            Ostatnia aktywność: {new Date(chain.last_activity_at).toLocaleDateString('pl-PL')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {chain.state}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isAttaching}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}
