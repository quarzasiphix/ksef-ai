import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle } from "lucide-react";

export interface TaxTask {
  name: string;
  dueDay: number; // day of month
}

interface TaxTasksCardProps {
  monthIndex: number; // 0-11
  tasks: TaxTask[];
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

export const TaxTasksCard: React.FC<TaxTasksCardProps> = ({ monthIndex, tasks }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Obowiązki podatkowe – {monthNamesFull[monthIndex]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak obowiązków podatkowych dla tego miesiąca.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.name}
                className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
              >
                <span className="font-medium">{task.name}</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  do {task.dueDay}. dnia
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxTasksCard; 