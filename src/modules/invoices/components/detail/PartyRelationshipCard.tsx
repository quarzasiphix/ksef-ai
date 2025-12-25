import React from 'react';
import { Building2, User, ExternalLink } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface PartyRelationshipCardProps {
  title: string;
  name: string;
  taxId?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  email?: string;
  phone?: string;
  profileId?: string;
  onViewProfile?: () => void;
  isCompany?: boolean;
}

export const PartyRelationshipCard: React.FC<PartyRelationshipCardProps> = ({
  title,
  name,
  taxId,
  address,
  postalCode,
  city,
  email,
  phone,
  profileId,
  onViewProfile,
  isCompany = true,
}) => {
  const Icon = isCompany ? Building2 : User;

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </div>

      {/* Card - soft container, no heavy borders */}
      <div className="bg-white/[0.02] rounded-lg p-4 space-y-3 border border-white/5">
        {/* Header with icon and name */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">
              {name}
            </h3>
            {taxId && (
              <p className="text-sm text-muted-foreground mt-0.5">
                NIP: {taxId}
              </p>
            )}
          </div>
        </div>

        {/* Details - no borders between fields, just spacing */}
        <div className="space-y-2 text-sm">
          {(address || city) && (
            <div className="text-muted-foreground">
              {address && <div>{address}</div>}
              {(postalCode || city) && (
                <div>{postalCode} {city}</div>
              )}
            </div>
          )}

          {email && (
            <div className="text-muted-foreground">
              {email}
            </div>
          )}

          {phone && (
            <div className="text-muted-foreground">
              {phone}
            </div>
          )}
        </div>

        {/* View profile link */}
        {profileId && onViewProfile && (
          <button
            onClick={onViewProfile}
            className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Zobacz profil
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PartyRelationshipCard;
