
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
import { useIsMobile } from "@/hooks/use-mobile";

// These would ideally be stored in the database
interface DocumentTypeSetting {
  id: string;
  name: string;
  enabled: boolean;
  showVat: boolean;
}

const STORAGE_KEY = "documentTypeSettings";

const DocumentSettings = () => {
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeSetting[]>([
    { id: "sales", name: "Faktura VAT", enabled: true, showVat: true },
    { id: "receipt", name: "Rachunek", enabled: true, showVat: false },
    { id: "proforma", name: "Faktura proforma", enabled: true, showVat: true },
    { id: "correction", name: "Faktura korygująca", enabled: true, showVat: true },
  ]);
  
  const [isDirty, setIsDirty] = useState(false);
  const isMobile = useIsMobile();
  
  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setDocumentTypes(parsed);
      } catch (e) {
        console.error("Error parsing saved document settings:", e);
      }
    }
  }, []);
  
  const toggleEnabled = (id: string) => {
    setDocumentTypes(prev => 
      prev.map(type => 
        type.id === id ? { ...type, enabled: !type.enabled } : type
      )
    );
    setIsDirty(true);
  };
  
  const toggleVatVisibility = (id: string) => {
    setDocumentTypes(prev => 
      prev.map(type => 
        type.id === id ? { ...type, showVat: !type.showVat } : type
      )
    );
    setIsDirty(true);
  };
  
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documentTypes));
    setIsDirty(false);
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
          <div className={`space-y-6 ${isMobile ? '' : 'max-w-2xl'}`}>
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
            
            <Button 
              onClick={handleSave} 
              className="w-full sm:w-auto"
              disabled={!isDirty}
            >
              {isDirty ? "Zapisz zmiany" : "Zapisane"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <UserMenuFooter />
    </div>
  );
};

import { useAuth } from "@/App";
import { useNavigate } from "react-router-dom";
const UserMenuFooter = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="mt-12 border-t pt-4 flex flex-col items-start">
      <span className="text-xs text-muted-foreground mb-2">Zalogowano jako:</span>
      <span className="text-sm font-medium mb-2">{user.email}</span>
      <button
        className="text-xs text-red-500 hover:underline"
        onClick={() => {
          localStorage.removeItem("sb_session");
          setUser(null);
          navigate("/auth/login");
        }}
      >
        Wyloguj się
      </button>
    </div>
  );
};

export default DocumentSettings;
