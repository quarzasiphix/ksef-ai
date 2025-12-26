import React from 'react';
import { Inbox, CheckCircle2, AlertTriangle, FileText, Link2 } from 'lucide-react';

/**
 * Empty state for inbox with explanation of what appears here
 */
export const InboxEmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
        <Inbox className="h-8 w-8 text-slate-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Skrzynka pusta
      </h3>
      
      <div className="max-w-md text-center space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tutaj pojawiają się zdarzenia, które nie mogą być jeszcze zaksięgowane, ponieważ:
        </p>
        
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <FileText className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Brakuje klasyfikacji
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Kategoria, stawka VAT, kontrahent
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Brakuje decyzji
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Brak uprawnień do zatwierdzenia
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <Link2 className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Brakuje powiązania
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Umowa, dopasowanie płatności
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <p>
              Gdy uzupełnisz dane, zdarzenie automatycznie trafi do księgi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
