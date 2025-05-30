
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <ProductForm
      isOpen={isOpen}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
};

export default NewProduct;
