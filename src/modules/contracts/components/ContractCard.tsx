import React from "react";
import { Contract } from "@/shared/types";
import { Badge } from "@/shared/ui/badge";
import { Calendar, User, FileText, Clock } from "lucide-react";
import { useOpenTab } from "@/shared/hooks/useOpenTab";

interface ContractCardProps {
  contract: Contract;
  customerName?: string;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract, customerName }) => {
  const { openContractTab } = useOpenTab();
  
  const getStatusBadge = () => (
    contract.isActive ? (
      <Badge className="bg-green-600 text-xs">Aktywna</Badge>
    ) : (
      <Badge className="bg-red-600 text-xs">Nieaktywna</Badge>
    )
  );

  const handleClick = () => {
    openContractTab(contract.id, contract.number);
    
    // Track in recent documents
    const recentDoc = {
      id: contract.id,
      title: contract.number,
      path: `/contracts/${contract.id}`,
      entityId: contract.id,
      entityType: 'contract' as const,
      timestamp: Date.now(),
    };
    
    const recent = JSON.parse(localStorage.getItem('recent_documents') || '[]');
    const updated = [recentDoc, ...recent.filter((r: any) => r.id !== contract.id)].slice(0, 20);
    localStorage.setItem('recent_documents', JSON.stringify(updated));
  };

  return (
    <div 
      onClick={handleClick}
      className="block no-underline cursor-pointer"
    >
      <div className="bg-[#1A1F2C] text-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-sm truncate" title={contract.number}>{contract.number}</h3>
          {getStatusBadge()}
        </div>

        <div className="space-y-1.5 text-xs text-gray-300">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>Data: {new Date(contract.issueDate).toLocaleDateString("pl-PL")}</span>
          </div>
          {contract.validFrom && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Od: {new Date(contract.validFrom).toLocaleDateString("pl-PL")}</span>
            </div>
          )}
          {contract.validTo && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Do: {new Date(contract.validTo).toLocaleDateString("pl-PL")}</span>
            </div>
          )}
          {customerName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              <span className="truncate" title={customerName}>{customerName}</span>
            </div>
          )}
          {contract.subject && (
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              <span className="truncate" title={contract.subject}>{contract.subject}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractCard; 