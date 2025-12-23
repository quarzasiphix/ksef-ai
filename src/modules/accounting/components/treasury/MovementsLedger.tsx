// Movements Ledger - Shows audit trail of all account movements
// Source of truth for balance calculations

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  FileText,
  ArrowLeftRight,
  AlertTriangle,
  MoreVertical,
  Undo2,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { useCorrections } from '@/shared/hooks/useTreasury';
import type { AccountMovement, MovementSourceType } from '@/modules/accounting/treasury';

interface MovementsLedgerProps {
  movements: AccountMovement[];
  loading?: boolean;
  showAccountColumn?: boolean;
  onRefresh?: () => void;
}

const SOURCE_TYPE_LABELS: Record<MovementSourceType, { label: string; icon: React.ReactNode }> = {
  DOCUMENT_PAYMENT: { label: 'Płatność', icon: <FileText className="h-3 w-3" /> },
  TRANSFER: { label: 'Transfer', icon: <ArrowLeftRight className="h-3 w-3" /> },
  ADJUSTMENT: { label: 'Korekta', icon: <AlertTriangle className="h-3 w-3" /> },
  REVERSAL: { label: 'Storno', icon: <RotateCcw className="h-3 w-3" /> },
  OPENING_BALANCE: { label: 'Saldo początkowe', icon: <History className="h-3 w-3" /> },
};

export function MovementsLedger({
  movements,
  loading = false,
  showAccountColumn = false,
  onRefresh,
}: MovementsLedgerProps) {
  const { reverseMovement, submitting } = useCorrections();
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<AccountMovement | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const handleOpenReversal = (movement: AccountMovement) => {
    setSelectedMovement(movement);
    setReversalReason('');
    setReversalDialogOpen(true);
  };

  const handleReverseMovement = async () => {
    if (!selectedMovement || reversalReason.trim().length < 10) return;

    try {
      await reverseMovement(selectedMovement.id, reversalReason);
      toast.success('Ruch został wystornowany');
      setReversalDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error reversing movement:', error);
      toast.error(error instanceof Error ? error.message : 'Błąd podczas stornowania');
    }
  };

  const canReverse = (movement: AccountMovement): boolean => {
    return !movement.is_reversed && movement.source_type !== 'REVERSAL' && movement.source_type !== 'OPENING_BALANCE';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (movements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Brak ruchów na koncie</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Historia ruchów
          </CardTitle>
          <CardDescription>
            Pełna historia operacji na koncie (źródło prawdy dla salda)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  {showAccountColumn && <TableHead>Konto</TableHead>}
                  <TableHead>Typ</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead className="text-right">Kwota</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(movement => (
                  <TableRow
                    key={movement.id}
                    className={movement.is_reversed ? 'opacity-50 line-through' : ''}
                  >
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(movement.created_at), 'd MMM yyyy HH:mm', { locale: pl })}
                    </TableCell>
                    {showAccountColumn && (
                      <TableCell>{movement.payment_account_name || '-'}</TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {SOURCE_TYPE_LABELS[movement.source_type]?.icon}
                        {SOURCE_TYPE_LABELS[movement.source_type]?.label || movement.source_type}
                      </Badge>
                      {movement.is_reversed && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                          WYSTORNOWANO
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate">{movement.description}</p>
                      {movement.reversal_reason && (
                        <p className="text-xs text-muted-foreground truncate">
                          Powód: {movement.reversal_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className={`font-medium flex items-center justify-end gap-1 ${
                        movement.direction === 'IN' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.direction === 'IN' ? (
                          <ArrowDownCircle className="h-3 w-3" />
                        ) : (
                          <ArrowUpCircle className="h-3 w-3" />
                        )}
                        {movement.direction === 'IN' ? '+' : '-'}
                        {movement.amount.toFixed(2)} {movement.currency}
                      </span>
                    </TableCell>
                    <TableCell>
                      {canReverse(movement) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenReversal(movement)}>
                              <Undo2 className="h-4 w-4 mr-2" />
                              Wystornuj
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reversal Dialog */}
      <Dialog open={reversalDialogOpen} onOpenChange={setReversalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5" />
              Stornowanie ruchu
            </DialogTitle>
            <DialogDescription>
              Ta operacja utworzy odwrotny ruch, który anuluje wybrany ruch.
              Historia zostanie zachowana dla celów audytowych.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMovement && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data:</span>
                      <span>{format(new Date(selectedMovement.created_at), 'd MMM yyyy HH:mm', { locale: pl })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kwota:</span>
                      <span className={selectedMovement.direction === 'IN' ? 'text-green-600' : 'text-red-600'}>
                        {selectedMovement.direction === 'IN' ? '+' : '-'}
                        {selectedMovement.amount.toFixed(2)} {selectedMovement.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opis:</span>
                      <span className="text-right max-w-[200px] truncate">{selectedMovement.description}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div>
              <Label htmlFor="reversal-reason">Powód stornowania (min. 10 znaków)</Label>
              <Textarea
                id="reversal-reason"
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="Opisz powód stornowania tego ruchu..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {reversalReason.length}/10 znaków (minimum)
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <p className="text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Stornowanie utworzy nowy ruch w przeciwnym kierunku.
                  Oryginalny ruch zostanie oznaczony jako wystornowany, ale nie zostanie usunięty.
                </span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReversalDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleReverseMovement}
              disabled={reversalReason.trim().length < 10 || submitting}
            >
              {submitting ? 'Stornowanie...' : 'Wystornuj ruch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MovementsLedger;
