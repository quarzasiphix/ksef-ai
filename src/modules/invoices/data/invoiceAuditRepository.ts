import { supabase } from '../../../lib/supabase';
import {
  InvoiceAuditTrail,
  AuditProof,
  ChainVerification,
  InvoiceStateChangeResult
} from '../types/auditTrail';

/**
 * Repository for invoice audit trail and provenance operations
 */
export const invoiceAuditRepository = {
  /**
   * Save draft invoice (creates version snapshot)
   */
  async saveDraft(
    invoiceId: string,
    changeReason?: string
  ): Promise<InvoiceStateChangeResult> {
    const { data, error } = await supabase.rpc('rpc_invoice_save_draft', {
      p_invoice_id: invoiceId,
      p_change_reason: changeReason || null
    });

    if (error) throw error;
    return data;
  },

  /**
   * Issue invoice (locks it and creates version)
   */
  async issueInvoice(
    invoiceId: string,
    invoiceNumber: string,
    issueDate?: string,
    changeReason?: string
  ): Promise<InvoiceStateChangeResult> {
    const { data, error } = await supabase.rpc('rpc_invoice_issue', {
      p_invoice_id: invoiceId,
      p_invoice_number: invoiceNumber,
      p_issue_date: issueDate || new Date().toISOString().split('T')[0],
      p_change_reason: changeReason || null
    });

    if (error) throw error;
    return data;
  },

  /**
   * Mark invoice as paid
   */
  async markPaid(
    invoiceId: string,
    paymentDate?: string,
    paymentMethod?: string,
    changeReason?: string
  ): Promise<InvoiceStateChangeResult> {
    const { data, error } = await supabase.rpc('rpc_invoice_mark_paid', {
      p_invoice_id: invoiceId,
      p_payment_date: paymentDate || new Date().toISOString().split('T')[0],
      p_payment_method: paymentMethod || null,
      p_change_reason: changeReason || null
    });

    if (error) throw error;
    return data;
  },

  /**
   * Unmark invoice as paid (requires reason)
   */
  async unmarkPaid(
    invoiceId: string,
    changeReason: string
  ): Promise<InvoiceStateChangeResult> {
    if (!changeReason || changeReason.trim() === '') {
      throw new Error('Change reason is required when unmarking invoice as paid');
    }

    const { data, error } = await supabase.rpc('rpc_invoice_unmark_paid', {
      p_invoice_id: invoiceId,
      p_change_reason: changeReason
    });

    if (error) throw error;
    return data;
  },

  /**
   * Apply change to locked invoice (corrections, modifications, cancellations)
   */
  async applyChange(
    invoiceId: string,
    changeType: 'corrected' | 'modified' | 'cancelled',
    changeReason: string,
    changes: Record<string, any>
  ): Promise<InvoiceStateChangeResult> {
    if (!changeReason || changeReason.trim() === '') {
      throw new Error('Change reason is required when modifying locked invoice');
    }

    const { data, error } = await supabase.rpc('rpc_invoice_apply_change', {
      p_invoice_id: invoiceId,
      p_change_type: changeType,
      p_change_reason: changeReason,
      p_changes: changes
    });

    if (error) throw error;
    return data;
  },

  /**
   * Verify invoice chain integrity
   */
  async verifyChain(invoiceId: string): Promise<ChainVerification> {
    const { data, error } = await supabase.rpc('rpc_verify_invoice_chain', {
      p_invoice_id: invoiceId
    });

    if (error) throw error;
    return data;
  },

  /**
   * Get complete audit trail for invoice
   */
  async getAuditTrail(invoiceId: string): Promise<InvoiceAuditTrail> {
    const { data, error } = await supabase.rpc('rpc_get_invoice_audit_trail', {
      p_invoice_id: invoiceId
    });

    if (error) throw error;
    return data;
  },

  /**
   * Export audit proof for external verification
   */
  async exportAuditProof(invoiceId: string): Promise<AuditProof> {
    const { data, error } = await supabase.rpc('rpc_export_invoice_audit_proof', {
      p_invoice_id: invoiceId
    });

    if (error) throw error;
    return data;
  },

  /**
   * Download audit proof as JSON file
   */
  async downloadAuditProof(invoiceId: string, invoiceNumber?: string): Promise<void> {
    const proof = await this.exportAuditProof(invoiceId);

    const blob = new Blob([JSON.stringify(proof, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceNumber || invoiceId}-audit-proof.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
