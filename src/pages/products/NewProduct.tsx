
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import ProductForm from '@/components/products/ProductForm';
import { Product } from '@/types';
import { toast } from 'sonner';

const NewProduct = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  
  const handleClose = () => {
    navigate('/products');
  };
  
  const handleSuccess = (product: Product) => {
    toast.success('Produkt został utworzony');
    navigate('/products');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nowy produkt</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dane produktu</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            isOpen={isOpen}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default NewProduct;
