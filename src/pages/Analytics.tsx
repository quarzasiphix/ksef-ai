import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { TrendingUp } from "lucide-react";

const Analytics = () => {
  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
      <div className="pt-1">
        <Breadcrumbs />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Analizy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Szybkie podsumowania i trendy — w jednym miejscu
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard">Wróć do przeglądu</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Pełne analizy (w przygotowaniu)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ta strona będzie docelowo zawierać rozszerzone wykresy i trendy.
            Na razie zachowujemy mini‑analizy w "Przegląd".
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
