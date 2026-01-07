/**
 * Email Notification Helpers
 * Convenience functions for sending emails on specific user actions
 */

import {
  sendTransactionalEmail,
  sendTeamMemberInviteEmail,
  sendTeamMemberAddedEmail,
  sendDocumentUploadedEmail,
  sendDocumentSharedEmail,
  sendContractCreatedEmail,
  sendContractExpiringEmail,
  sendInboxNotificationEmail,
  sendEmployeeAddedEmail,
  formatEmailDate,
  formatEmailCurrency,
  getAppUrl,
} from './emailService';

// ============================================================================
// TEAM MEMBER NOTIFICATIONS
// ============================================================================

export async function notifyTeamMemberAdded(params: {
  memberName: string;
  role: string;
  addedBy: string;
  companyName: string;
}) {
  return sendTeamMemberAddedEmail({
    member_name: params.memberName,
    role: params.role,
    added_by: params.addedBy,
    company_name: params.companyName,
  });
}

export async function notifyTeamMemberInvited(params: {
  recipientEmail: string;
  inviterName: string;
  companyName: string;
  role: string;
  inviteUrl: string;
}) {
  return sendTeamMemberInviteEmail(params.recipientEmail, {
    inviter_name: params.inviterName,
    company_name: params.companyName,
    role: params.role,
    invite_url: params.inviteUrl,
  });
}

// ============================================================================
// DOCUMENT NOTIFICATIONS
// ============================================================================

export async function notifyDocumentUploaded(params: {
  documentName: string;
  documentType: string;
  uploadedBy: string;
  documentId: string;
  category?: string;
}) {
  return sendDocumentUploadedEmail({
    document_name: params.documentName,
    document_type: params.documentType,
    uploaded_by: params.uploadedBy,
    document_url: getAppUrl(`/documents/${params.documentId}`),
    category: params.category,
  });
}

export async function notifyDocumentShared(params: {
  recipientEmail: string;
  documentName: string;
  sharedBy: string;
  documentId: string;
  message?: string;
}) {
  return sendDocumentSharedEmail(params.recipientEmail, {
    document_name: params.documentName,
    shared_by: params.sharedBy,
    document_url: getAppUrl(`/documents/${params.documentId}`),
    message: params.message,
  });
}

// ============================================================================
// CONTRACT NOTIFICATIONS
// ============================================================================

export async function notifyContractCreated(params: {
  contractNumber: string;
  contractType: string;
  counterpartyName: string;
  startDate: string | Date;
  endDate?: string | Date;
  contractId: string;
}) {
  return sendContractCreatedEmail({
    contract_number: params.contractNumber,
    contract_type: params.contractType,
    counterparty_name: params.counterpartyName,
    start_date: formatEmailDate(params.startDate),
    end_date: params.endDate ? formatEmailDate(params.endDate) : undefined,
    contract_url: getAppUrl(`/contracts/${params.contractId}`),
  });
}

export async function notifyContractExpiring(params: {
  contractNumber: string;
  contractType: string;
  counterpartyName: string;
  expiryDate: string | Date;
  daysUntilExpiry: number;
  contractId: string;
}) {
  return sendContractExpiringEmail({
    contract_number: params.contractNumber,
    contract_type: params.contractType,
    counterparty_name: params.counterpartyName,
    expiry_date: formatEmailDate(params.expiryDate),
    days_until_expiry: params.daysUntilExpiry,
    contract_url: getAppUrl(`/contracts/${params.contractId}`),
  });
}

// ============================================================================
// INBOX NOTIFICATIONS
// ============================================================================

export async function notifyNewInboxMessage(params: {
  senderName: string;
  subject: string;
  preview: string;
  messageCount?: number;
}) {
  return sendInboxNotificationEmail({
    sender_name: params.senderName,
    subject: params.subject,
    preview: params.preview,
    inbox_url: getAppUrl('/inbox'),
    message_count: params.messageCount,
  });
}

// ============================================================================
// EMPLOYEE NOTIFICATIONS
// ============================================================================

export async function notifyEmployeeAdded(params: {
  employeeName: string;
  position: string;
  department?: string;
  startDate: string | Date;
  addedBy: string;
}) {
  return sendEmployeeAddedEmail({
    employee_name: params.employeeName,
    position: params.position,
    department: params.department,
    start_date: formatEmailDate(params.startDate),
    added_by: params.addedBy,
  });
}

// ============================================================================
// SETTINGS CHANGE NOTIFICATIONS
// ============================================================================

export async function notifySettingsChanged(params: {
  settingName: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
}) {
  return sendTransactionalEmail({
    templateName: 'settings_changed',
    variables: {
      setting_name: params.settingName,
      old_value: params.oldValue,
      new_value: params.newValue,
      changed_by: params.changedBy,
      settings_url: getAppUrl('/settings'),
    },
  });
}

// ============================================================================
// BATCH NOTIFICATIONS
// ============================================================================

/**
 * Send multiple notifications without failing if one fails
 */
export async function sendBatchNotifications(
  notifications: Array<() => Promise<any>>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = await Promise.allSettled(notifications.map(fn => fn()));
  
  const success = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason?.message || String(r.reason));

  return { success, failed, errors };
}
