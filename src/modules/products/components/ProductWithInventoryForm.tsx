import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import { Product } from '@/shared/types/index';
import { useAuth } from '@/shared/context/AuthContext';
import { saveProduct } from '@/modules/products/data/productRepository';
import { toast } from 'sonner';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  initialData?: Product | null;
}

const ProductWithInventoryForm: React.FC<ProductFormProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [vatRate, setVatRate] = useState('23');
  const [unit, setUnit] = useState('szt.');
  const [productType, setProductType] = useState<'income' | 'expense'>('income');
  const [trackStock, setTrackStock] = useState(false);
  const [stock, setStock] = useState('0');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setUnitPrice(initialData.unitPrice.toString());
      setVatRate(initialData.vatRate.toString());
      setUnit(initialData.unit);
      setProductType(initialData.product_type);
      setTrackStock(initialData.track_stock);
      setStock(initialData.stock ? initialData.stock.toString() : '0');
    } else {
      // Reset form for new product
      setName('');
      setUnitPrice('');
      setVatRate('23');
      setUnit('szt.');
      setProductType('income');
      setTrackStock(false);
      setStock('0');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Musisz być zalogowany.');
      return;
    }
    if (!name || !unitPrice || !vatRate || !unit) {
      toast.error('Wypełnij wszystkie wymagane pola.');
      return;
    }

    setIsLoading(true);

    const productData: Product = {
      id: initialData?.id || '',
      name,
      unitPrice: parseFloat(unitPrice),
      vatRate: parseInt(vatRate, 10),
      unit,
      product_type: productType,
      track_stock: trackStock,
      stock: trackStock ? parseInt(stock, 10) || 0 : 0,
      user_id: user.id,
    };

    try {
      const savedProduct = await saveProduct(productData);
      toast.success(initialData ? 'Produkt zaktualizowany' : 'Produkt utworzony');
      onSuccess(savedProduct);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Błąd podczas zapisywania produktu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edytuj produkt' : 'Nowy produkt'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nazwa</Label>
            <Textarea id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3 min-h-[80px] resize-none" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unitPrice" className="text-right">Cena jedn.</Label>
            <Input id="unitPrice" type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vatRate" className="text-right">VAT (%)</Label>
            <Input id="vatRate" type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unit" className="text-right">Jednostka</Label>
            <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="productType" className="text-right">Typ</Label>
            <Select value={productType} onValueChange={(v: 'income' | 'expense') => setProductType(v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Wybierz typ produktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Przychodowy</SelectItem>
                <SelectItem value="expense">Kosztowy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Switch id="track-stock" checked={trackStock} onCheckedChange={setTrackStock} />
            <Label htmlFor="track-stock">Śledź stan magazynowy</Label>
          </div>
          {trackStock && (
            <div className="grid grid-cols-4 items-center gap-4 pt-2">
              <Label htmlFor="stock" className="text-right">Stan</Label>
              <Input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="col-span-3" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductWithInventoryForm;
