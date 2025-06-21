import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, ChevronDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ZusPayment, ZusType } from "@/types/zus";

export interface TaxReport {
  id: string;
  name: string;
  dueDay: number; // day of month
}

interface TaxReportsCardProps {
  monthIndex: number; // 0-11
  reports: TaxReport[];
  year?: number;
  zusPayments?: ZusPayment[];
  zusTypes?: ZusType[];
  zusMonthKey?: string;
  onAddEditZus?: (month: string, zusType: ZusType) => void;
  onGenerateTaxForm?: (report: TaxReport, monthIndex: number) => void | Promise<void>;
}

const monthNamesFull = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

export const TaxReportsCard: React.FC<TaxReportsCardProps> = ({ monthIndex, reports, year = new Date().getFullYear(), zusPayments = [], zusTypes = [], zusMonthKey = "", onAddEditZus, onGenerateTaxForm }) => {
  const today = new Date();

  const getStatus = (dueDate: Date) => {
    const diff = dueDate.getTime() - today.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    if (diff < 0) return { status: "overdue", icon: <AlertTriangle className="h-4 w-4 text-red-600" /> };
    if (diff <= oneWeek) return { status: "due-soon", icon: <Clock className="h-4 w-4 text-amber-600" /> };
    return { status: "not-due", icon: <CheckCircle className="h-4 w-4 text-green-600" /> };
  };

  // Helper: get ZUS payment for month/type
  const getZusForMonthType = (month: string, zusType: ZusType) =>
    zusPayments.find(zp => zp.month === month && zp.zusType === zusType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Obowiązki podatkowe – {monthNamesFull[monthIndex]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.map((rep) => {
          const dueDate = new Date(year, monthIndex, rep.dueDay);
          const { status, icon } = getStatus(dueDate);
          const dueLabel = format(dueDate, "dd.MM.yyyy", { locale: pl });
          const statusText = status === "overdue" ? "Zaległy" : status === "due-soon" ? "Termin wkrótce" : "Do złożenia";

          const borderColor = status === "overdue" ? "border-red-500" : status === "due-soon" ? "border-amber-500" : "border-green-500";

          return (
            <div
              key={rep.id}
              className={`flex items-center justify-between p-3 rounded-md bg-muted border ${borderColor} border-l-4`}
            >
              <div className="flex items-center gap-2">
                {icon}
                <div className="text-sm">
                  <p className="font-medium text-foreground">{rep.name}</p>
                  <p className="text-xs text-muted-foreground">Termin: {dueLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{statusText}</span>
                <Button size="sm" onClick={async () => {
                  if (onGenerateTaxForm) {
                    await onGenerateTaxForm(rep, monthIndex);
                  } else {
                    toast.success(`Wygenerowano plik ${rep.name} (${monthNamesFull[monthIndex]} ${year})`);
                  }
                }}>
                  Generuj
                </Button>
              </div>
            </div>
          );
        })}
        {/* ZUS status dropdown and add button */}
        {zusTypes.length > 0 && (
          <div className="flex items-center gap-4 mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  Status ZUS <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {zusTypes.map(zusType => {
                  const zus = getZusForMonthType(zusMonthKey, zusType);
                  return (
                    <div key={zusType} className="flex items-center gap-2 px-3 py-1">
                      <span className="w-28 font-medium">{zusType.charAt(0).toUpperCase() + zusType.slice(1)}:</span>
                      {zus ? (
                        <span className={zus.isPaid ? "text-green-700" : "text-amber-700"}>
                          {zus.isPaid ? `Opłacone: ${zus.amount} PLN` : `Do zapłaty: ${zus.amount} PLN`}
                          {zus.isPaid && zus.paidAt ? ` (${zus.paidAt})` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Brak danych</span>
                      )}
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Dodaj ZUS
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {zusTypes.map(zusType => (
                  <DropdownMenuItem key={zusType} onClick={() => onAddEditZus && onAddEditZus(zusMonthKey, zusType)}>
                    {zusType.charAt(0).toUpperCase() + zusType.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxReportsCard; 