import React from "react";
import { Link } from "react-router-dom";
import { Contract } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, FileText, Clock } from "lucide-react";

interface ContractCardProps {
  contract: Contract;
  customerName?: string;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract, customerName }) => {
  const getStatusBadge = () => (
    contract.isActive ? (
      <Badge className="bg-green-600 text-xs">Aktywna</Badge>
    ) : (
      <Badge className="bg-red-600 text-xs">Nieaktywna</Badge>
    )
  );

  return (
    <Link to={`/contracts/${contract.id}`} className="block no-underline">
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
    </Link>
  );
};

export default ContractCard; 