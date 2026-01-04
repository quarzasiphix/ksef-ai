import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { Clock, FileCheck, CheckCircle2 } from 'lucide-react';

const tabs = [
  {
    id: 'timeline',
    label: 'Oś czasu',
    path: '/events/timeline',
    icon: Clock,
    description: 'Historia wszystkich zdarzeń',
  },
  {
    id: 'posting',
    label: 'Księgowanie',
    path: '/events/posting',
    icon: FileCheck,
    description: 'Zdarzenia księgowe według okresów',
  },
  {
    id: 'reconciliation',
    label: 'Weryfikacja',
    path: '/events/reconciliation',
    icon: CheckCircle2,
    description: 'Kolejka weryfikacji i dowodów',
  },
];

export const EventsShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = tabs.find(tab => location.pathname.startsWith(tab.path))?.id || 'timeline';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-border bg-background">
        <div className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Zdarzenia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zarządzanie zdarzeniami księgowymi i audytowymi
          </p>
        </div>

        <div className="flex items-center gap-1 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => navigate(tab.path)}
                className={cn(
                  "relative rounded-b-none border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default EventsShell;
