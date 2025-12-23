import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Download, FileText, AlertCircle, CheckCircle, Clock } from "lucide-react";
import type { TaxReport } from "./TaxReportsCard";
import type { FiledTaxForm } from "@/integrations/supabase/repositories/filedTaxFormsRepository";

interface TaxReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: TaxReport;
  monthLabel: string; // e.g. "06/2025"
  filed?: FiledTaxForm;
  monthIncome: number;
  monthExpenses: number;
  onGenerate: () => void | Promise<void>;
  onUpload?: (file: File) => void | Promise<void>;
  onMarkFiled?: () => void | Promise<void>;
  onDownload?: (fileId: string) => void | Promise<void>;
  isGenerating?: boolean;
}

const explanations: Record<string, { description: string; frequency: string; requirements: string[] }> = {
  "JPK_V7M": {
    description: "Jednolity Plik Kontrolny VAT (miesięczny). Przekazywany do Ministerstwa Finansów, zawiera ewidencję sprzedaży i zakupów VAT.",
    frequency: "Miesięcznie",
    requirements: ["Firma zarejestrowana jako VAT", "Sprzedaż lub zakupy z VAT", "Przychody powyżej określonych limitów"]
  },
  "JPK_V7K": {
    description: "Jednolity Plik Kontrolny VAT (kwartalny). Wersja kwartalna dla mniejszych podmiotów.",
    frequency: "Kwartalnie",
    requirements: ["Firma zarejestrowana jako VAT", "Mniejsze przychody", "Opcjonalnie dla małych podmiotów"]
  },
  "PIT zaliczka": {
    description: "Miesięczna zaliczka na podatek dochodowy od osób fizycznych.",
    frequency: "Miesięcznie/Kwartalnie",
    requirements: ["Działalność gospodarcza", "Przychody powyżej limitów", "Zaliczki na PIT"]
  },
  "Deklaracja ZUS (DRA)": {
    description: "Deklaracja rozliczeniowa ZUS zawierająca składki społeczne i zdrowotne.",
    frequency: "Miesięcznie",
    requirements: ["Zatrudnienie pracowników", "Składki ZUS", "Deklaracja DRA"]
  },
  "PIT-4": {
    description: "Informacja o dochodach wypłaconych zryczałtowanym podatnikom.",
    frequency: "Miesięcznie",
    requirements: ["Wypłaty zryczałtowane", "Pracownicy", "Umowy zlecenia"]
  }
};

const getFrequencyInfo = (reportName: string) => {
  const info = explanations[reportName];
  if (!info) return "Sprawdź z urzędem skarbowym";
  
  if (reportName === "PIT zaliczka") {
    return "Częstotliwość zależy od przychodów: powyżej 2M PLN - miesięcznie, poniżej - kwartalnie";
  }
  
  return info.frequency;
};

export default function TaxReportDialog({ 
  open, 
  onOpenChange, 
  report, 
  monthLabel, 
  filed, 
  monthIncome, 
  monthExpenses, 
  onGenerate, 
  onUpload, 
  onMarkFiled, 
  onDownload,
  isGenerating = false 
}: TaxReportDialogProps) {
  const [isMarking, setIsMarking] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleMarkFiled = async () => {
    if (!onMarkFiled) return;
    try {
      setIsMarking(true);
      await onMarkFiled();
      onOpenChange(false);
    } finally {
      setIsMarking(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!onUpload) return;
    try {
      setIsUploading(true);
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  };

  const explanation = explanations[report.name] || {
    description: "Deklaracja podatkowa.",
    frequency: "Sprawdź z urzędem skarbowym",
    requirements: []
  };

  const getStatusIcon = () => {
    if (filed?.status === "filed") return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (filed?.status === "generated") return <FileText className="h-5 w-5 text-blue-600" />;
    return <Clock className="h-5 w-5 text-amber-600" />;
  };

  const getStatusText = () => {
    if (filed?.status === "filed") return "Złożone";
    if (filed?.status === "generated") return "Wygenerowane";
    return "Do wygenerowania";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {report.name} – {monthLabel}
            <Badge variant={filed?.status === "filed" ? "default" : "secondary"}>
              {getStatusText()}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {explanation.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Financial Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-700">
                    {monthIncome.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                  </div>
                  <div className="text-sm text-green-600">Przychody</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-700">
                    {monthExpenses.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                  </div>
                  <div className="text-sm text-red-600">Wydatki</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements and Frequency */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-2">Wymagania i częstotliwość:</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Częstotliwość:</span> {getFrequencyInfo(report.name)}</p>
                {explanation.requirements.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Wymagania:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {explanation.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File Status */}
          {filed ? (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon()}
                  <span className="font-medium">Plik wygenerowany</span>
                </div>
                                 <div className="space-y-2 text-sm">
                   <p><span className="font-medium">Typ deklaracji:</span> {filed.form_type}</p>
                   <p><span className="font-medium">Data wygenerowania:</span> {filed.generated_at ? new Date(filed.generated_at).toLocaleDateString('pl-PL') : "Nie określono"}</p>
                  {filed.status === "filed" && (
                    <p><span className="font-medium">Data złożenia:</span> {filed.filed_at ? new Date(filed.filed_at).toLocaleDateString('pl-PL') : "Nie określono"}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {onDownload && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onDownload(filed.id)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Pobierz XML
                      </Button>
                    )}
                    {filed.file_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(filed.file_url, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Otwórz w przeglądarce
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Brak wygenerowanego pliku</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Kliknij "Generuj XML" aby utworzyć deklarację na podstawie faktur z tego miesiąca.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button 
            onClick={onGenerate} 
            size="sm" 
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? "Generowanie..." : (filed ? "Ponownie generuj XML" : "Generuj XML")}
          </Button>
          
          {!filed && onUpload && (
            <label className="inline-flex items-center text-sm cursor-pointer">
              <input 
                type="file" 
                accept="application/xml,.xml" 
                className="hidden" 
                onChange={e => { 
                  const f = e.target.files?.[0]; 
                  if (f) handleUpload(f); 
                  e.target.value = ""; 
                }} 
                disabled={isUploading}
              />
              <span className={`px-3 py-2 border rounded-md ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-accent'}`}>
                {isUploading ? "Przesyłanie..." : "Wyślij złożony plik"}
              </span>
            </label>
          )}
          
          {filed && filed.status !== "filed" && onMarkFiled && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMarkFiled} 
              disabled={isMarking}
            >
              {isMarking ? "Zapisywanie..." : "Oznacz jako złożone"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 