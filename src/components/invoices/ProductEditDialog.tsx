
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Product, InvoiceType } from "@/types";
import { Edit, Plus } from "lucide-react";
import { saveProduct } from "@/integrations/supabase/repositories/productRepository";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductEditDialogProps {
  mode: 'edit' | 'create';
  initialProduct?: Product;
  documentType: InvoiceType;
  onProductSaved: (product: Product) => void;
  onProductSavedAndSync?: (product: Product) => void; // NEW: called immediately after save for instant UI update
  trigger?: React.ReactNode;
  refetchProducts?: () => Promise<void>;
}

export const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  mode,
  initialProduct,
  documentType,
  onProductSaved,
  onProductSavedAndSync, // FIX: destructure from props
  trigger,
  refetchProducts
}) => {
  const isReceipt = documentType === InvoiceType.RECEIPT;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialProduct?.name || "");
  const [unitPrice, setUnitPrice] = useState(initialProduct?.unitPrice?.toString() || "");
  const [vatRate, setVatRate] = useState(initialProduct?.vatRate?.toString() || isReceipt ? "0" : "23");
  const [unit, setUnit] = useState(initialProduct?.unit || "szt.");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSave = async () => {
    if (!name) {
      toast.error("Nazwa produktu jest wymagana");
      return;
    }
    
    if (!unitPrice || isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
      toast.error("Cena jednostkowa musi być liczbą większą od 0");
      return;
    }
    
    if (!vatRate || isNaN(Number(vatRate)) || Number(vatRate) < 0) {
      toast.error("Stawka VAT musi być liczbą większą lub równą 0");
      return;
    }
    
    if (!unit) {
      toast.error("Jednostka miary jest wymagana");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const productData: Product = {
        id: initialProduct?.id || "",
        name,
        unitPrice: Number(unitPrice),
        vatRate: Number(vatRate),
        unit
      };
      
      if (mode === 'edit') {
        // Save changes to existing product
        const savedProduct = await saveProduct(productData);
        toast.success("Produkt został zaktualizowany");
        onProductSaved(savedProduct);
        if (onProductSavedAndSync) onProductSavedAndSync(savedProduct); // NEW: instant UI update
        if (refetchProducts) await refetchProducts();
      } else {
        // Just return the new product without saving to database
        onProductSaved({
          id: crypto.randomUUID(), // Temporary ID
          name,
          unitPrice: Number(unitPrice),
          vatRate: Number(vatRate),
          unit
        });
        toast.success("Produkt został dodany do dokumentu");
      }
      
      setOpen(false);
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Wystąpił błąd podczas zapisywania produktu");
    } finally {
      setIsLoading(false);
    }
  };
  
  const defaultTrigger = mode === 'edit' 
    ? <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
    : <Button variant="outline" size="sm" className="flex items-center gap-1"><Plus className="h-4 w-4" /> Nowy produkt</Button>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" aria-describedby="product-edit-description">
        <DialogHeader>
          <span id="product-edit-description" style={{display: 'none'}}>Edytuj lub dodaj produkt do faktury.</span>
          <DialogTitle>
            {mode === 'edit' ? "Edytuj produkt" : "Dodaj nowy produkt"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa produktu</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Nazwa produktu lub usługi"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Cena netto</Label>
              <Input 
                id="unitPrice" 
                type="number" 
                min="0" 
                step="0.01" 
                value={unitPrice} 
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Jednostka</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz jednostkę" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="szt.">szt.</SelectItem>
                  <SelectItem value="godz.">godz.</SelectItem>
                  <SelectItem value="usł.">usł.</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="m²">m²</SelectItem>
                  <SelectItem value="m³">m³</SelectItem>
                  <SelectItem value="km">km</SelectItem>
                  <SelectItem value="l">l</SelectItem>
                  <SelectItem value="opak.">opak.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {!isReceipt && (
              <div className="space-y-2">
                <Label htmlFor="vatRate">Stawka VAT (%)</Label>
                <Select value={vatRate} onValueChange={setVatRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz stawkę VAT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="23">23%</SelectItem>
                    <SelectItem value="8">8%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="zw">zw</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
