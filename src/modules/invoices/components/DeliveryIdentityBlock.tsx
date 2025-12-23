import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CheckCircle2, AlertTriangle, Mail, Shield, Building2, UserPlus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface DeliveryIdentityBlockProps {
  isVerified: boolean;
  isNativeDelivery: boolean;
  counterpartyName: string;
  counterpartyTaxId: string;
  onInviteToNetwork?: () => void;
}

export function DeliveryIdentityBlock({
  isVerified,
  isNativeDelivery,
  counterpartyName,
  counterpartyTaxId,
  onInviteToNetwork
}: DeliveryIdentityBlockProps) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Dostarczenie i weryfikacja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isNativeDelivery && isVerified ? (
          <>
            {/* Native & Verified */}
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Dostarczono w KsięgaI (native)</p>
                <p className="text-xs text-muted-foreground">
                  Dokument dostarczony bezpośrednio przez system
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Kontrahent zweryfikowany</p>
                <p className="text-xs text-muted-foreground">
                  NIP: {counterpartyTaxId} • Profil aktywny
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email: tylko powiadomienie</p>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-3">
              <p className="text-xs text-green-900 dark:text-green-100">
                <strong>Bezpieczne dostarczenie:</strong> Dokument został dostarczony przez zweryfikowanego
                kontrahenta w systemie KsięgaI. Tożsamość wystawcy potwierdzona.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Fallback / Not Verified */}
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Kontrahent poza siecią</p>
                <p className="text-xs text-muted-foreground">
                  Wysłano PDF e-mailem (fallback)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {counterpartyName}
                </p>
                <p className="text-xs text-muted-foreground">
                  NIP: {counterpartyTaxId}
                </p>
              </div>
            </div>
            {onInviteToNetwork && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={onInviteToNetwork}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Zaproś do KsięgaI
              </Button>
            )}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
              <p className="text-xs text-amber-900 dark:text-amber-100">
                <strong>Uwaga:</strong> Kontrahent nie korzysta z KsięgaI. Dokument dostarczony
                tradycyjną metodą (email/PDF). Rozważ zaproszenie do sieci dla bezpieczniejszej wymiany dokumentów.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
