import React, { useState } from "react";
import { formatCurrency } from "@/shared/lib/invoice-utils";
import { Invoice, InvoiceType } from "@/shared/types";
import { Badge } from "@/shared/ui/badge";
import { Calendar, FileText, User, CreditCard, Share2, MessageSquare, AlertCircle, MoreHorizontal, Eye, Edit, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOpenTab } from "@/shared/hooks/useOpenTab";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { PostInvoiceDialog } from "@/modules/invoices/components/PostInvoiceDialog";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalData } from "@/shared/hooks/use-global-data";

type InvoiceCardProps = {
  invoice: Invoice;
  currency?: string;
};

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, currency = invoice.currency || 'PLN' }) => {
  const { openInvoiceTab, openExpenseTab } = useOpenTab();
  const { profiles: businessProfiles } = useBusinessProfile();
  const { refreshAllData } = useGlobalData();
  const queryClient = useQueryClient();
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Check if invoice has discussion threads
  const { data: hasDiscussion } = useQuery({
    queryKey: ["invoice-discussion", invoice.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("discussion_threads")
        .select("*", { count: "exact", head: true })
        .eq("invoice_id", invoice.id);
      
      if (error) {
        console.error("Error checking discussion:", error);
        return false;
      }
      
      return (count || 0) > 0;
    },
    staleTime: 30000, // Cache for 30 seconds
    enabled: !!invoice.id, // Only run if invoice ID exists
  });

  // Helper function to determine status badge color
  const getStatusBadge = () => {
    const invoiceAny = invoice as any;
    const isPaid = invoice.paid || invoice.isPaid;
    const isBooked = invoiceAny.booked_to_ledger;
    const isOverdue = new Date(invoice.dueDate) < new Date() && !isPaid;
    
    // Get business profile to check if it's JDG
    const businessProfile = businessProfiles.find(p => p.id === invoice.businessProfileId);
    const isJDG = businessProfile?.entityType === 'dzialalnosc';
    
    // Critical: Paid but not booked
    if (isPaid && !isBooked) {
      return (
        <div className="flex gap-1">
          <Badge className="bg-yellow-500 text-xs flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Opłacona, niezaksięgowana
          </Badge>
        </div>
      );
    }
    
    // Booked
    if (isBooked) {
      return <Badge className="bg-blue-500 text-xs">📘 Zaksięgowana</Badge>;
    }
    
    // Paid
    if (isPaid) {
      return <Badge className="bg-green-500 text-xs">💰 Zapłacono</Badge>;
    }
    
    // Overdue
    if (isOverdue) {
      return <Badge className="bg-red-500 text-xs">Zaległa</Badge>;
    }
    
    // For JDG entities, don't show "Oczekuje" - show a more appropriate status
    if (isJDG) {
      // For JDG, show "Do zapłaty" (To be paid) instead of "Oczekuje"
      return <Badge className="bg-amber-500 text-xs">Do zapłaty</Badge>;
    }
    
    // For company entities, show "Oczekuje" (pending decision/approval)
    return <Badge className="bg-orange-500 text-xs">Oczekuje</Badge>;
  };

  // Helper function to get the document type title
  const getDocumentTypeTitle = () => {
    switch (invoice.type) {
      case InvoiceType.SALES:
        return "Faktura VAT";
      case InvoiceType.RECEIPT:
        return "Rachunek";
      case InvoiceType.PROFORMA:
        return "Faktura proforma";
      case InvoiceType.CORRECTION:
        return "Faktura korygująca";
      default:
        return "Dokument";
    }
  };

  // Helper function to determine card color based on document type
  const getCardColorClass = () => {
    switch (invoice.type) {
      case InvoiceType.SALES:
        return "bg-[#1A1F2C]"; // Dark blue for invoices
      case InvoiceType.RECEIPT:
        return "bg-[#1E2A3B]"; // Dark blue-gray for receipts
      case InvoiceType.PROFORMA:
        return "bg-[#2C243B]"; // Dark purple for proforma
      case InvoiceType.CORRECTION:
        return "bg-[#2D2226]"; // Dark red for corrections
      default:
        return "bg-[#1A1F2C]";
    }
  };

  // Check if document type is a receipt (rachunek) - hide VAT info
  const isReceipt = invoice.type === InvoiceType.RECEIPT;

  // Determine the correct route based on transaction type (income/expense)
  const getInvoiceRoute = () => {
    const basePath = invoice.transactionType === 'expense' ? '/expense' : '/income';
    return `${basePath}/${invoice.id}`;
  };

  // Handle share button click
  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // This will be handled by the parent component
    const event = new CustomEvent('share-invoice', { 
      detail: { invoiceId: invoice.id },
      bubbles: true 
    });
    document.dispatchEvent(event);
  };

  // Handle post button click
  const handlePostClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(false);
    setShowPostDialog(true);
  };

  // Check if invoice is already posted
  const isPosted = (invoice as any).accounting_status === 'posted' || (invoice as any).booked_to_ledger;

  // Handle card click to open in tab
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (invoice.transactionType === 'expense') {
      openExpenseTab(invoice.id, invoice.number);
    } else {
      openInvoiceTab(invoice.id, invoice.number);
    }
    
    // Track in recent documents
    const recentDoc = {
      id: invoice.id,
      title: invoice.number,
      path: getInvoiceRoute(),
      entityId: invoice.id,
      entityType: invoice.transactionType === 'expense' ? 'expense' : 'invoice',
      timestamp: Date.now(),
    };
    
    const recent = JSON.parse(localStorage.getItem('recent_documents') || '[]');
    const updated = [recentDoc, ...recent.filter((r: any) => r.id !== invoice.id)].slice(0, 20);
    localStorage.setItem('recent_documents', JSON.stringify(updated));
  };

  return (
    <div 
      onClick={handleCardClick}
      className="block no-underline cursor-pointer"
    >
      <div className={`${getCardColorClass()} text-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all h-full`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">{invoice.number}</h3>
            {hasDiscussion && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border-blue-500/30">
                <MessageSquare className="h-3 w-3 mr-1" />
                Dyskusja
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleShareClick}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              title="Udostępnij"
            >
              <Share2 className="h-3.5 w-3.5 text-gray-300" />
            </button>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 p-0 hover:bg-white/10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {!isPosted && (
                  <DropdownMenuItem onClick={handlePostClick}>
                    <FileText className="h-4 w-4 mr-2" />
                    Zaksięguj
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {getStatusBadge()}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <Calendar className="h-3 w-3" />
            <span>Data: {new Date(invoice.issueDate).toLocaleDateString("pl-PL")}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <User className="h-3 w-3" />
            <span className="truncate">{invoice.customerName || invoice.buyer?.name || "Klient nieznany"}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <FileText className="h-3 w-3" />
            <span>{getDocumentTypeTitle()}</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <CreditCard className="h-3 w-3" />
            <span>{invoice.paymentMethod === "transfer" ? "Przelew" : 
                  invoice.paymentMethod === "cash" ? "Gotówka" : 
                  invoice.paymentMethod === "card" ? "Karta" : "Inna"}</span>
          </div>
          
          <div className="pt-1.5 border-t border-gray-700 mt-1">
            <div className="flex justify-between">
              {!isReceipt && invoice.totalVatValue !== undefined && (
                <span className="text-xs text-gray-300">
                  VAT: {formatCurrency(invoice.totalVatValue >= 0 ? invoice.totalVatValue : 0, currency)}
                </span>
              )}
              <span className="font-bold text-base">
                {formatCurrency(
                  // If VAT is 0 or less, use net value
                  // Otherwise use gross value if it's valid
                  invoice.totalVatValue <= 0 
                    ? (invoice.totalNetValue || invoice.totalAmount || 0)
                    : (invoice.totalGrossValue || invoice.totalAmount || 0),
                  currency
                )}
              </span>
            </div>
          </div>

          {/* Action Buttons - Mobile Friendly */}
          <div className="pt-2 border-t border-gray-700 mt-2">
            <div className="grid grid-cols-4 gap-1">
              {/* Open Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCardClick(e);
                }}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition-colors group"
                title="Otwórz w nowej karcie"
              >
                <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-white mb-1" />
                <span className="text-xs text-gray-300 group-hover:text-white">Otwórz</span>
              </button>

              {/* View Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(getInvoiceRoute(), '_blank');
                }}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition-colors group"
                title="Podgląd w nowym oknie"
              >
                <Eye className="h-4 w-4 text-gray-300 group-hover:text-white mb-1" />
                <span className="text-xs text-gray-300 group-hover:text-white">Podgląd</span>
              </button>

              {/* Edit Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Navigate to edit page
                  const editRoute = invoice.transactionType === 'expense' 
                    ? `/expense/${invoice.id}/edit` 
                    : `/income/${invoice.id}/edit`;
                  window.location.href = editRoute;
                }}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition-colors group"
                title="Edytuj"
              >
                <Edit className="h-4 w-4 text-gray-300 group-hover:text-white mb-1" />
                <span className="text-xs text-gray-300 group-hover:text-white">Edytuj</span>
              </button>

              {/* Kebab Menu */}
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition-colors group"
                    title="Więcej opcji"
                  >
                    <MoreHorizontal className="h-4 w-4 text-gray-300 group-hover:text-white mb-1" />
                    <span className="text-xs text-gray-300 group-hover:text-white">Więcej</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="bg-gray-800 border-gray-700 text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem 
                    onClick={handleShareClick}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Udostępnij
                  </DropdownMenuItem>
                  {!isPosted && (
                    <DropdownMenuItem 
                      onClick={handlePostClick}
                      className="text-gray-300 hover:text-white hover:bg-gray-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Zaksięguj
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Copy invoice link to clipboard
                      navigator.clipboard.writeText(`${window.location.origin}${getInvoiceRoute()}`);
                      // Show toast or notification
                      const toast = document.createElement('div');
                      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
                      toast.textContent = 'Link skopiowany do schowka!';
                      document.body.appendChild(toast);
                      setTimeout(() => document.body.removeChild(toast), 2000);
                    }}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Kopiuj link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Post Invoice Dialog */}
      {showPostDialog && (() => {
        const businessProfile = businessProfiles.find(p => p.id === invoice.businessProfileId);
        return (
          <PostInvoiceDialog
            open={showPostDialog}
            onOpenChange={setShowPostDialog}
            invoice={invoice}
            businessProfile={{
              id: invoice.businessProfileId || '',
              entityType: businessProfile?.entityType || 'dzialalnosc',
              tax_type: businessProfile?.tax_type
            }}
            onSuccess={async () => {
              await refreshAllData();
              await queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
              await queryClient.invalidateQueries({ queryKey: ["invoices"] });
            }}
          />
        );
      })()}
    </div>
  );
};

export default InvoiceCard;