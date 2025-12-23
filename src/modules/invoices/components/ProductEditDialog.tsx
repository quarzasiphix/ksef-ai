import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Product, InvoiceType, VatType, TransactionType } from "@/shared/types";
import { Edit, Plus } from "lucide-react";
import { saveProduct } from "@/modules/products/data/productRepository";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useAuth } from "@/shared/context/AuthContext";

interface ProductEditDialogProps {
  mode: 'edit' | 'create';
  initialProduct?: Partial<Product>;
  documentType: InvoiceType;
  transactionType?: TransactionType;
  onProductSaved: (product: Omit<Product, 'id'> & { id?: string }) => void;
  onProductSavedAndSync?: (product: Omit<Product, 'id'> & { id?: string }) => void;
  trigger?: React.ReactNode;
  refetchProducts?: () => Promise<void>;
  userId?: string;
}

export const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  mode,
  initialProduct = {},
  documentType,
  transactionType,
  onProductSaved,
  onProductSavedAndSync,
  trigger,
  refetchProducts,
  userId
}) => {
  const { user } = useAuth();
  const finalUserId = userId || user?.id;
  const isReceipt = documentType === InvoiceType.RECEIPT;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialProduct?.name || "");
  const [unitPrice, setUnitPrice] = useState(initialProduct?.unitPrice?.toString() || "");
  const initialVatRate = initialProduct?.vatRate !== undefined 
    ? (initialProduct.vatRate === -1 ? "zw" : initialProduct.vatRate.toString())
    : (isReceipt ? "0" : "23");
  const [vatRate, setVatRate] = useState(initialVatRate);
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
    
    if (!vatRate) {
      toast.error("Stawka VAT jest wymagana");
      return;
    }
    
    if (!unit) {
      toast.error("Jednostka miary jest wymagana");
      return;
    }

    if (!finalUserId) {
      toast.error("Błąd uwierzytelniania. Spróbuj zalogować się ponownie.");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const product_type = transactionType === TransactionType.EXPENSE ? 'expense' : 'income';

      const productData: Product = {
        id: initialProduct?.id || "",
        name,
        unitPrice: Number(unitPrice),
        vatRate: vatRate === "zw" ? Number(VatType.ZW) : Number(vatRate),
        unit,
        user_id: finalUserId,
        product_type,
        track_stock: initialProduct?.track_stock || false,
        stock: initialProduct?.stock || 0
      };
      
      if (mode === 'edit') {
        const savedProduct = await saveProduct(productData);
        toast.success("Produkt został zaktualizowany");
        onProductSaved(savedProduct);
        if (onProductSavedAndSync) onProductSavedAndSync(savedProduct);
        if (refetchProducts) await refetchProducts();
      } else {
        onProductSaved({
          name,
          unitPrice: Number(unitPrice),
          vatRate: vatRate === "zw" ? Number(VatType.ZW) : Number(vatRate),
          unit,
          user_id: finalUserId,
          product_type,
          track_stock: false,
          stock: 0,
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
            <Textarea 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Nazwa produktu lub usługi"
              className="min-h-[80px] resize-none"
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
                    <SelectItem value="zw">Zwolniony</SelectItem>
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
