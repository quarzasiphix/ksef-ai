import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Download, CheckCircle, XCircle, Clock, FileText, AlertTriangle } from 'lucide-react';

interface InvoiceVersion {
  version_id: string;
  version_number: number;
  change_type: string;
  change_reason: string | null;
  changed_by: string;
  changed_at: string;
  snapshot_hash: string;
  chain_hash: string;
  snapshot_data: any;
}

interface InvoiceEvent {
  event_id: string;
  event_type: string;
  actor_id: string;
  created_at: string;
  entity_version_id: string;
  payload: any;
  payload_hash: string;
}

interface Verification {
  valid: boolean;
  invoice_id: string;
  version_count: number;
  errors: any[];
  verified_at: string;
  verified_by: string;
}

interface AuditTrail {
  invoice_id: string;
  invoice_number: string;
  current_status: string;
  is_locked: boolean;
  current_version_number: number;
  versions: InvoiceVersion[];
  events: InvoiceEvent[];
  verification: Verification;
  retrieved_at: string;
}

interface InvoiceAuditTabProps {
  invoiceId: string;
}

export const InvoiceAuditTab: React.FC<InvoiceAuditTabProps> = ({ invoiceId }) => {
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  useEffect(() => {
    loadAuditTrail();
  }, [invoiceId]);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('rpc_get_invoice_audit_trail', {
        p_invoice_id: invoiceId
      });

      if (rpcError) throw rpcError;

      setAuditTrail(data);
    } catch (err: any) {
      console.error('Failed to load audit trail:', err);
      setError(err.message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const exportAuditProof = async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('rpc_export_invoice_audit_proof', {
        p_invoice_id: invoiceId
      });

      if (rpcError) throw rpcError;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${auditTrail?.invoice_number || invoiceId}-audit-proof.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export audit proof:', err);
      alert('Failed to export audit proof: ' + err.message);
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'draft_saved':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'issued':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'unpaid':
        return <XCircle className="w-4 h-4 text-orange-500" />;
      case 'corrected':
      case 'modified':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleVersionExpand = (versionId: string) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading audit trail...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <XCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">Error: {error}</span>
        </div>
        <button
          onClick={loadAuditTrail}
          className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!auditTrail) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-gray-600">No audit trail available</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Audit Trail</h2>
          <p className="text-sm text-gray-600 mt-1">
            Invoice: {auditTrail.invoice_number} • Status: {auditTrail.current_status}
            {auditTrail.is_locked && ' • 🔒 Locked'}
          </p>
        </div>
        <button
          onClick={exportAuditProof}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Proof
        </button>
      </div>

      {/* Verification Status */}
      <div
        className={`p-4 rounded-lg border-2 ${
          auditTrail.verification.valid
            ? 'bg-green-50 border-green-300'
            : 'bg-red-50 border-red-300'
        }`}
      >
        <div className="flex items-center">
          {auditTrail.verification.valid ? (
            <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600 mr-3" />
          )}
          <div>
            <h3 className="font-semibold text-lg">
              Chain Integrity: {auditTrail.verification.valid ? 'Valid ✓' : 'Invalid ✗'}
            </h3>
            <p className="text-sm text-gray-600">
              {auditTrail.verification.version_count} versions verified •
              Last verified: {formatDate(auditTrail.verification.verified_at)}
            </p>
          </div>
        </div>

        {!auditTrail.verification.valid && auditTrail.verification.errors.length > 0 && (
          <div className="mt-3 p-3 bg-red-100 rounded">
            <p className="font-semibold text-red-800 mb-2">Verification Errors:</p>
            <ul className="list-disc list-inside space-y-1">
              {auditTrail.verification.errors.map((error: any, idx: number) => (
                <li key={idx} className="text-sm text-red-700">
                  Version {error.version_number}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Version Timeline */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Version History ({auditTrail.versions.length} versions)
        </h3>

        <div className="space-y-3">
          {auditTrail.versions.map((version, index) => (
            <div
              key={version.version_id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
            >
              <div
                className="p-4 bg-white cursor-pointer"
                onClick={() => toggleVersionExpand(version.version_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getChangeTypeIcon(version.change_type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          Version {version.version_number}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {version.change_type}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(version.changed_at)}
                      </p>
                      {version.change_reason && (
                        <p className="text-sm text-gray-700 mt-1 italic">
                          "{version.change_reason}"
                        </p>
                      )}
                    </div>
                  </div>
                  <button className="text-blue-600 text-sm hover:text-blue-800">
                    {expandedVersion === version.version_id ? 'Hide' : 'Show'} Details
                  </button>
                </div>
              </div>

              {expandedVersion === version.version_id && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                        Snapshot Hash
                      </p>
                      <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 break-all">
                        {version.snapshot_hash}
                      </code>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                        Chain Hash
                      </p>
                      <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 break-all">
                        {version.chain_hash}
                      </code>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                        Snapshot Data
                      </p>
                      <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto max-h-64 overflow-y-auto">
                        {JSON.stringify(version.snapshot_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Events Timeline */}
      {auditTrail.events && auditTrail.events.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Related Events ({auditTrail.events.length})
          </h3>

          <div className="space-y-2">
            {auditTrail.events.map((event) => (
              <div
                key={event.event_id}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{event.event_type}</span>
                    <p className="text-sm text-gray-600">{formatDate(event.created_at)}</p>
                  </div>
                  <code className="text-xs text-gray-500">
                    {event.payload_hash?.substring(0, 16)}...
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>About Audit Trail:</strong> This tamper-evident audit trail uses cryptographic
          hash chaining to ensure invoice history cannot be modified without detection. Each
          version is immutably recorded with SHA-256 hashing.
        </p>
      </div>
    </div>
  );
};
