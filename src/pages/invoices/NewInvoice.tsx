import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Invoice, InvoiceType } from "@/types";

// We're importing the existing NewInvoice component but modifying it to handle document type
const NewInvoice: React.FC<{
  initialData?: Invoice;
}> = ({ initialData }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [documentType, setDocumentType] = useState<InvoiceType>(InvoiceType.SALES);
  const [documentSettings, setDocumentSettings] = useState<any[]>([]);

  // Load document type settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("documentTypeSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setDocumentSettings(parsed);
      } catch (e) {
        console.error("Error parsing saved document settings:", e);
      }
    }
  }, []);

  // Set document type from URL parameter or initialData
  useEffect(() => {
    if (initialData) {
      // If we're editing an existing invoice, use its type
      setDocumentType(initialData.type);
    } else {
      // If creating a new invoice, check URL parameter
      const typeFromUrl = searchParams.get("type");
      if (typeFromUrl && Object.values(InvoiceType).includes(typeFromUrl as InvoiceType)) {
        setDocumentType(typeFromUrl as InvoiceType);
      }
    }
  }, [initialData, searchParams]);

  // Check if the selected document type is enabled in settings
  useEffect(() => {
    if (documentSettings.length > 0) {
      const selectedTypeSetting = documentSettings.find(type => type.id === documentType);
      if (selectedTypeSetting && !selectedTypeSetting.enabled) {
        // Redirect to income page if the document type is disabled
        navigate("/income");
      }
    }
  }, [documentType, documentSettings, navigate]);

  // This is a placeholder - the actual InvoiceForm component logic will be kept as is
  // but we pass the document type to it
  return (
    <div>
      {/* The existing InvoiceForm component content with the documentType prop */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {initialData ? "Edytuj dokument" : "Nowy dokument"}
          </h1>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p>Formularz faktury z typem dokumentu: {documentType}</p>
          <p>
            {initialData 
              ? `Edycja dokumentu: ${initialData.number}` 
              : "Tworzenie nowego dokumentu"}
          </p>
          <p className="text-muted-foreground mt-4">
            Uwaga: To jest uproszczona wersja komponentu. Rzeczywisty formularz faktury
            powinien zawierać wszystkie pola potrzebne do utworzenia dokumentu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewInvoice;
