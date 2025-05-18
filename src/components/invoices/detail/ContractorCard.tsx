import React from 'react';

// Define a generic structure for contractor data
// Adjust this interface based on the actual structure of your seller/buyer objects
export interface ContractorData {
  name: string;
  nip?: string; // Or KSeF ID
  street?: string;
  buildingNumber?: string;
  apartmentNumber?: string;
  postalCode?: string;
  city?: string;
  email?: string;
  phone?: string;
  bankAccount?: string; // Added bank account field
  // Add any other relevant fields
}

interface ContractorCardProps {
  title: string;
  contractor?: ContractorData; // Make contractor optional to handle cases where it might be missing
  className?: string;
}

const ContractorCard: React.FC<ContractorCardProps> = ({ title, contractor, className }) => {
  if (!contractor) {
    return (
      <div className={`p-4 border rounded-lg shadow-sm ${className} bg-white dark:bg-gray-800`}>
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400">Brak danych.</p>
      </div>
    );
  }

  // Helper to combine address parts, can be expanded
  const getFullAddress = () => {
    const parts: string[] = [];
    if (contractor.street) parts.push(contractor.street);
    if (contractor.buildingNumber) parts.push(contractor.buildingNumber);
    if (contractor.apartmentNumber) parts.push(`/${contractor.apartmentNumber}`);
    return parts.join(' ').trim();
  };

  const getPostalCity = () => {
    const parts: string[] = [];
    if (contractor.postalCode) parts.push(contractor.postalCode);
    if (contractor.city) parts.push(contractor.city);
    return parts.join(' ').trim();
  };

  const fields = [
    { label: 'Nazwa', value: contractor.name },
    { label: 'NIP / ID', value: contractor.nip },
    { label: 'Adres', value: getFullAddress() },
    { label: 'Miejscowość', value: getPostalCity() },
    { label: 'Email', value: contractor.email },
    { label: 'Telefon', value: contractor.phone },
    { label: 'Nr konta', value: contractor.bankAccount }, 
  ].filter(field => field.value && String(field.value).trim() !== ''); // Ensure value exists and is not empty string

  return (
    <div className={`p-4 border rounded-lg shadow-sm ${className} bg-white dark:bg-gray-800`}>
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">{title}</h3>
      {fields.length > 0 ? (
        <dl className="space-y-1">
          {fields.map((field, index) => (
            <div key={index} className="flex justify-between items-start py-1.5">
              <dt className="text-sm text-gray-500 dark:text-gray-400 mr-2 whitespace-nowrap">{field.label}:</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right break-words min-w-0">{String(field.value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Brak danych.</p>
      )}
    </div>
  );
};

export default ContractorCard;
