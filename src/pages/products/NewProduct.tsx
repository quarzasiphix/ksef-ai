
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductWithInventoryForm from '@/components/products/ProductWithInventoryForm';
import { Product } from '@/types/index';
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
    <ProductWithInventoryForm
      isOpen={isOpen}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
};

export default NewProduct;
