import ZusPaymentDialog from "@/components/accounting/ZusPaymentDialog";
import { getZusPayments, updateZusPayment, addZusPayment } from "@/integrations/supabase/repositories/zusRepository";
import type { ZusPayment, ZusType } from "@/types/zus";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const ZUS_TYPES: ZusType[] = ["społeczne", "zdrowotne", "FP", "FGŚP", "inne"];

const ExpensePage = () => {
  // ... keep existing code for fetching expenses
  const { user } = useAuth();
  const [zusPayments, setZusPayments] = useState<ZusPayment[]>([]);
  const [zusDialogOpen, setZusDialogOpen] = useState(false);
  const [zusDialogInitial, setZusDialogInitial] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    getZusPayments(user.id).then(setZusPayments);
  }, [user]);

  // Find upcoming (unpaid, current/future) ZUS payments
  const now = new Date();
  const upcomingZus = zusPayments.filter(zp => {
    if (zp.isPaid) return false;
    const [y, m] = zp.month.split("-").map(Number);
    const zusDate = new Date(y, m - 1, 1);
    return zusDate >= new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Handler: open dialog for adding ZUS of a specific type
  const handleAddZusType = (zusType: ZusType) => {
    setZusDialogInitial({ zusType });
    setZusDialogOpen(true);
  };

  // Handler: save ZUS payment
  const handleSaveZus = async (data: Omit<ZusPayment, "id" | "createdAt" | "updatedAt" | "userId">) => {
    try {
      let zus: ZusPayment | undefined;
      const existing = zusPayments.find(zp => zp.month === data.month && zp.zusType === data.zusType);
      if (existing) {
        zus = await updateZusPayment(existing.id, data);
      } else {
        zus = await addZusPayment({ ...data, userId: user.id });
      }
      setZusPayments(prev => {
        const filtered = prev.filter(zp => !(zp.month === zus!.month && zp.zusType === zus!.zusType));
        return [...filtered, zus!];
      });
    } catch (err) {
      // handle error
    }
  };

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Wydatki</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Dodaj ZUS <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ZUS_TYPES.map(zusType => (
              <DropdownMenuItem key={zusType} onClick={() => handleAddZusType(zusType)}>
                {zusType.charAt(0).toUpperCase() + zusType.slice(1)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {upcomingZus.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Nadchodzące płatności ZUS</h3>
          <div className="space-y-2">
            {upcomingZus.map(zus => (
              <div key={zus.id} className="flex items-center gap-4 p-3 rounded bg-muted/50 opacity-60">
                <Badge variant="outline" className="bg-gray-200 text-gray-700 mr-2">Nadchodzące</Badge>
                <span className="font-medium w-24">{zus.zusType.charAt(0).toUpperCase() + zus.zusType.slice(1)}</span>
                <span className="w-20">{zus.month}</span>
                <span>{zus.amount ? `${zus.amount} PLN` : "Kwota nieustalona"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ... keep existing code for rendering normal expenses ... */}
      <ZusPaymentDialog
        open={zusDialogOpen}
        onClose={() => setZusDialogOpen(false)}
        onSave={handleSaveZus}
        initialValue={zusDialogInitial}
      />
    </div>
  );
};

export default ExpensePage; 