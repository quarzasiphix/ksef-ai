import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { AlertTriangle, CheckCircle, Clock, ChevronDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/shared/ui/dropdown-menu";
import type { ZusPayment, ZusType } from "@/shared/types/zus";
import type { FiledTaxForm } from "@/integrations/supabase/repositories/filedTaxFormsRepository";
import TaxReportDialog from "./TaxReportDialog";

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
  filedForms?: FiledTaxForm[];
  onUploadTaxForm?: (report: TaxReport, monthIndex: number, file: File) => void | Promise<void>;
  onMarkFiled?: (report: TaxReport, monthIndex: number) => void | Promise<void>;
  monthIncome?: number;
  monthExpenses?: number;
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

export const TaxReportsCard: React.FC<TaxReportsCardProps> = ({ monthIndex, reports, year = new Date().getFullYear(), zusPayments = [], zusTypes = [], zusMonthKey = "", onAddEditZus, onGenerateTaxForm, filedForms = [], onUploadTaxForm, onMarkFiled, monthIncome = 0, monthExpenses = 0 }) => {
  const today = new Date();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<TaxReport | null>(null);

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

  const openDialogFor = (rep: TaxReport) => {
    setSelectedReport(rep);
    setDialogOpen(true);
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-lg">Obowiązki podatkowe – {monthNamesFull[monthIndex]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.length === 0 && zusTypes.length === 0 && (
          <div className="py-6 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Brak obowiązków podatkowych</p>
                <p className="text-sm text-muted-foreground mt-1">Ten miesiąc nie wymaga żadnych działań</p>
              </div>
            </div>
            <div className="pl-8 text-xs text-muted-foreground border-l-2 border-muted ml-2">
              <p>CIT-8: termin w marcu</p>
            </div>
          </div>
        )}
        {reports.map((rep) => {
          const dueDate = new Date(year, monthIndex, rep.dueDay);
          const { status, icon } = getStatus(dueDate);
          const dueLabel = format(dueDate, "dd.MM.yyyy", { locale: pl });
          const statusText = status === "overdue" ? "Zaległy" : status === "due-soon" ? "Termin wkrótce" : "Do złożenia";

          const borderColor = status === "overdue" ? "border-red-500" : status === "due-soon" ? "border-amber-500" : "border-green-500";

          const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
          const filed = filedForms.find(f => f.month === monthKey && f.form_type === rep.name);

          return (
            <div
              key={rep.id}
              onClick={() => openDialogFor(rep)}
              className={`flex items-center justify-between p-3 rounded-md bg-muted border ${borderColor} border-l-4 cursor-pointer hover:bg-accent`}>
              <div className="flex items-center gap-2">
                {icon}
                <div className="text-sm">
                  <p className="font-medium text-foreground">{rep.name}</p>
                  <p className="text-xs text-muted-foreground">Termin: {dueLabel}</p>
                  {filed && (
                    <a href={filed.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Pobierz plik</a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{statusText}</span>
                {filed && <span className="text-green-600 text-xs">{filed.status === "filed" ? "Złożone" : "Wygenerowane"}</span>}
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
        {selectedReport && (
          <TaxReportDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            report={selectedReport}
            monthLabel={`${String(monthIndex + 1).padStart(2,"0")}/${year}`}
            filed={filedForms.find(f => f.month === `${year}-${String(monthIndex + 1).padStart(2,"0")}` && f.form_type === selectedReport.name)}
            monthIncome={monthIncome}
            monthExpenses={monthExpenses}
            onGenerate={() => onGenerateTaxForm && onGenerateTaxForm(selectedReport, monthIndex)}
            onUpload={file => onUploadTaxForm && onUploadTaxForm(selectedReport, monthIndex, file)}
            onMarkFiled={() => onMarkFiled && onMarkFiled(selectedReport, monthIndex)}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TaxReportsCard; 