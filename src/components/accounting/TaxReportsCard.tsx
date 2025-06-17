import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";

export interface TaxReport {
  id: string;
  name: string;
  dueDay: number; // day of month
}

interface TaxReportsCardProps {
  monthIndex: number; // 0-11
  reports: TaxReport[];
  year?: number;
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

export const TaxReportsCard: React.FC<TaxReportsCardProps> = ({ monthIndex, reports, year = new Date().getFullYear() }) => {
  const today = new Date();

  const getStatus = (dueDate: Date) => {
    const diff = dueDate.getTime() - today.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    if (diff < 0) return { status: "overdue", icon: <AlertTriangle className="h-4 w-4 text-red-600" /> };
    if (diff <= oneWeek) return { status: "due-soon", icon: <Clock className="h-4 w-4 text-amber-600" /> };
    return { status: "not-due", icon: <CheckCircle className="h-4 w-4 text-green-600" /> };
  };

  const handleGenerate = (report: TaxReport) => {
    toast.success(`Wygenerowano plik ${report.name} (${monthNamesFull[monthIndex]} ${year})`);
  };

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
                <Button size="sm" onClick={() => handleGenerate(rep)}>
                  Generuj
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TaxReportsCard; 