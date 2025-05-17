
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// These would ideally be stored in the database
interface DocumentTypeSetting {
  id: string;
  name: string;
  enabled: boolean;
  showVat: boolean;
}

const DocumentSettings = () => {
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeSetting[]>([
    { id: "sales", name: "Faktura VAT", enabled: true, showVat: true },
    { id: "receipt", name: "Rachunek", enabled: true, showVat: false },
    { id: "proforma", name: "Faktura proforma", enabled: true, showVat: true },
    { id: "correction", name: "Faktura korygująca", enabled: true, showVat: true },
  ]);
  
  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("documentTypeSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setDocumentTypes(parsed);
      } catch (e) {
        console.error("Error parsing saved document settings:", e);
      }
    }
  }, []);
  
  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("documentTypeSettings", JSON.stringify(documentTypes));
  }, [documentTypes]);
  
  const toggleEnabled = (id: string) => {
    setDocumentTypes(prev => 
      prev.map(type => 
        type.id === id ? { ...type, enabled: !type.enabled } : type
      )
    );
  };
  
  const toggleVatVisibility = (id: string) => {
    setDocumentTypes(prev => 
      prev.map(type => 
        type.id === id ? { ...type, showVat: !type.showVat } : type
      )
    );
  };
  
  const handleSave = () => {
    // In a real app, this would save to the database
    localStorage.setItem("documentTypeSettings", JSON.stringify(documentTypes));
    toast.success("Ustawienia dokumentów zostały zapisane");
  };
  
  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-bold">Ustawienia dokumentów</h1>
        <p className="text-muted-foreground">
          Dostosuj typy dokumentów i ich wyświetlanie
        </p>
      </div>
      
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Typy dokumentów</CardTitle>
          <CardDescription>
            Włącz lub wyłącz typy dokumentów oraz określ, czy pokazywać dla nich informacje o VAT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {documentTypes.map((type) => (
              <div key={type.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label htmlFor={`${type.id}-enabled`} className="font-medium">
                    {type.name}
                  </Label>
                  <Switch
                    id={`${type.id}-enabled`}
                    checked={type.enabled}
                    onCheckedChange={() => toggleEnabled(type.id)}
                  />
                </div>
                
                {type.id !== "receipt" && (
                  <div className="flex items-center justify-between ml-4 text-sm flex-wrap gap-2">
                    <Label htmlFor={`${type.id}-vat`} className="text-muted-foreground">
                      Pokazuj informacje o VAT
                    </Label>
                    <Switch
                      id={`${type.id}-vat`}
                      checked={type.showVat}
                      onCheckedChange={() => toggleVatVisibility(type.id)}
                      disabled={!type.enabled}
                    />
                  </div>
                )}
                
                <hr className="my-2" />
              </div>
            ))}
            
            <Button onClick={handleSave} className="w-full sm:w-auto">
              Zapisz ustawienia
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentSettings;
