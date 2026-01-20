import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Download, 
  Edit, 
  Trash2, 
  Share2,
  FilePlus,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Invoice } from '@/shared/types';
import { useOpenTab } from '@/shared/hooks/useOpenTab';
import { PostInvoiceDialog } from '@/modules/invoices/components/PostInvoiceDialog';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ProfessionalInvoiceRowProps {
  invoice: Invoice;
  isIncome: boolean;
  onView: (id: string) => void;
  onPreview: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  onDuplicate: (id: string) => void;
  onTogglePaid: (id: string, invoice: Invoice) => void;
}

const ProfessionalInvoiceRow: React.FC<ProfessionalInvoiceRowProps> = ({
  invoice,
  isIncome,
  onView,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onShare,
  onDuplicate,
  onTogglePaid,
}) => {
  const navigate = useNavigate();
  const { openInvoiceTab, openExpenseTab } = useOpenTab();
  const { profiles: businessProfiles } = useBusinessProfile();
  const queryClient = useQueryClient();
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  const [showPostDialog, setShowPostDialog] = React.useState(false);
  
  // Calculate state
  const isPaid = invoice.isPaid || invoice.paid;
  const isBooked = (invoice as any).booked_to_ledger;
  const hasDecision = !!invoice.decisionId;
  const isOverdue = invoice.dueDate && !isPaid && new Date(invoice.dueDate) < new Date();
  const isVatExempt = invoice.fakturaBezVAT || invoice.vat === false;
  
  // Calculate time pressure
  const getDueDateStatus = () => {
    if (!invoice.dueDate || isPaid) return null;
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return { label: 'Zaległa', color: 'text-red-600 dark:text-red-400', urgent: true };
    }
    if (daysUntilDue <= 7) {
      return { label: `Termin za ${daysUntilDue}d`, color: 'text-amber-600 dark:text-amber-400', urgent: false };
    }
    return { label: `Termin: ${format(dueDate, 'dd.MM.yyyy', { locale: pl })}`, color: 'text-muted-foreground', urgent: false };
  };
  
  const dueDateStatus = getDueDateStatus();

  // Get payment status
  const getPaymentStatus = () => {
    if (isPaid && isBooked) {
      return { label: 'Rozliczona', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle };
    }
    if (isPaid && !isBooked) {
      return { label: 'Opłacona', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle };
    }
    if (isOverdue) {
      return { label: 'Po terminie', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: AlertCircle };
    }
    return { label: 'Nieopłacona', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock };
  };

  const paymentStatus = getPaymentStatus();
  const StatusIcon = paymentStatus.icon;

  // Get contractor name
  const contractorName = isIncome ? invoice.customerName : invoice.businessName;

  // Handle right-click to open context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuOpen(true);
  };

  // Handle post button click
  const handlePostClick = () => {
    console.log('🔍 Post button clicked for invoice:', invoice.id);
    console.log('🔍 Invoice businessProfileId:', invoice.businessProfileId);
    console.log('🔍 Available business profiles:', businessProfiles.length);
    console.log('🔍 Matching business profile:', businessProfiles.find(p => p.id === invoice.businessProfileId));
    
    setContextMenuOpen(false);
    setShowPostDialog(true);
  };

  // Handle row click to open in tab
  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[role="menu"]') || (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Open in tab instead of navigating
    if (isIncome) {
      openInvoiceTab(invoice.id, invoice.number);
    } else {
      openExpenseTab(invoice.id, invoice.number);
    }
    
    // Track in recent documents
    const recentDoc = {
      id: invoice.id,
      title: invoice.number,
      path: isIncome ? `/income/${invoice.id}` : `/expense/${invoice.id}`,
      entityId: invoice.id,
      entityType: isIncome ? 'invoice' as const : 'expense' as const,
      timestamp: Date.now(),
    };
    
    const recent = JSON.parse(localStorage.getItem('recent_documents') || '[]');
    const updated = [recentDoc, ...recent.filter((r: any) => r.id !== invoice.id)].slice(0, 20);
    localStorage.setItem('recent_documents', JSON.stringify(updated));
  };

  return (
    <div
      className="group relative py-3 px-4 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border last:border-0"
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
    >
      {/* 3-column horizontal layout: DETAILS | ACTIONS | PRICE */}
      <div className="flex items-center justify-between gap-6">
        {/* COLUMN 1: DETAILS (left, flexible, multiline) */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Line 1: Invoice number (bold) */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{invoice.number}</span>
            <span className="text-sm text-muted-foreground truncate">
              {contractorName}
              {isVatExempt && <span className="ml-1.5">• Bez VAT</span>}
            </span>
          </div>
          
          {/* Line 2: Issue date + due date + status pill */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{format(new Date(invoice.issueDate), 'dd.MM.yyyy', { locale: pl })}</span>
            {dueDateStatus && (
              <span className={`flex items-center gap-1 ${dueDateStatus.color}`}>
                {dueDateStatus.urgent && <AlertCircle className="h-3 w-3" />}
                {dueDateStatus.label}
              </span>
            )}
            <Badge className={`${paymentStatus.color} flex items-center gap-1 text-xs`}>
              <StatusIcon className="h-3 w-3" />
              {paymentStatus.label}
            </Badge>
          </div>
        </div>

        {/* COLUMN 2: ACTIONS (middle, compact, always visible on desktop) */}
        <div className="hidden md:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-sm inline-flex items-center gap-1.5 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              if (isIncome) {
                openInvoiceTab(invoice.id, invoice.number);
              } else {
                openExpenseTab(invoice.id, invoice.number);
              }
            }}
          >
            Otwórz
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-sm inline-flex items-center gap-1.5 hover:bg-muted"
            onClick={() => onPreview(invoice)}
          >
            <Eye className="h-3.5 w-3.5" />
            Podgląd
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-sm inline-flex items-center gap-1.5 hover:bg-muted"
            onClick={() => onEdit(invoice.id)}
          >
            Edytuj
          </Button>
          <DropdownMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => { 
                setContextMenuOpen(false); 
                setTimeout(() => onDuplicate(invoice.id), 100);
              }}>
                <FilePlus className="h-4 w-4 mr-2" />
                Duplikuj
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { 
                setContextMenuOpen(false);
                setTimeout(() => onTogglePaid(invoice.id, invoice), 100);
              }}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {isPaid ? 'Oznacz nieopłacone' : 'Oznacz opłacone'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePostClick}>
                <BookOpen className="h-4 w-4 mr-2" />
                Zaksięguj
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { 
                setContextMenuOpen(false);
                setTimeout(() => onDelete(invoice.id), 100);
              }} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* COLUMN 3: PRICE (right, strong visual anchor) */}
        <div className="hidden md:block flex-shrink-0 min-w-[140px] text-right">
          <div className="text-2xl font-semibold">
            {formatCurrency(isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0), invoice.currency || 'PLN')}
          </div>
          {invoice.currency && invoice.currency !== 'PLN' && invoice.exchangeRate && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatCurrency((isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0)) * invoice.exchangeRate, 'PLN')}
            </div>
          )}
        </div>

        {/* Mobile: Kebab menu + price */}
        <div className="md:hidden flex items-center gap-3">
          <div>
            <div className="text-xl font-semibold">
              {formatCurrency(isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0), invoice.currency || 'PLN')}
            </div>
            {invoice.currency && invoice.currency !== 'PLN' && invoice.exchangeRate && (
              <div className="text-xs text-muted-foreground">
                {formatCurrency((isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0)) * invoice.exchangeRate, 'PLN')}
              </div>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {
                  setTimeout(() => onView(invoice.id), 100);
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  Otwórz
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setTimeout(() => onPreview(invoice), 100);
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  Podgląd PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setTimeout(() => onDownload(invoice), 100);
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Pobierz PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setTimeout(() => onEdit(invoice.id), 100);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edytuj
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setTimeout(() => onDuplicate(invoice.id), 100);
                }}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Duplikuj
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setTimeout(() => onTogglePaid(invoice.id, invoice), 100);
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isPaid ? 'Oznacz nieopłacone' : 'Oznacz opłacone'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePostClick}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Zaksięguj
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setTimeout(() => onDelete(invoice.id), 100);
                }} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            onSuccess={async (accountInfo) => {
              await queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
              await queryClient.invalidateQueries({ queryKey: ["invoices"] });
              
              // Show custom toast for ryczałt posting
              if (accountInfo) {
                toast.success(
                  `Dodano do ryczałtu: ${accountInfo.accountName} (${accountInfo.accountRate}%)`,
                  {
                    duration: 4000,
                    icon: '📋'
                  }
                );
              }
            }}
          />
        );
      })()}
    </div>
  );
};

export default ProfessionalInvoiceRow;
