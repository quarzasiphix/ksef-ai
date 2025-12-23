
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductWithInventoryForm from '@/modules/products/components/ProductWithInventoryForm';
import { Product } from '@/shared/types/index';
import { toast } from 'sonner';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/shared/utils/eventLogging';

const NewProduct = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const { selectedProfileId, profiles } = useBusinessProfile();
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  
  const handleClose = () => {
    navigate('/products');
  };
  
  const handleSuccess = async (product: Product) => {
    // Log event for Spółki
    if (shouldLogEvents(selectedProfile?.entityType)) {
      await logCreationEvent({
        businessProfileId: selectedProfileId!,
        eventType: 'document_uploaded',
        entityType: 'product',
        entityId: product.id,
        entityReference: product.name,
        actionSummary: `Dodano produkt: ${product.name}`,
        changes: {
          name: product.name,
        },
      });
    }
    
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
