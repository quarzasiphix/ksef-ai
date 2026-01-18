-- ============================================
-- Standardized Invoice Variables System
-- ============================================
-- This creates a centralized system for invoice variables
-- that can be reused across all invoice-related email templates

-- Step 1: Add invoice_variables JSONB column to email_templates
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS invoice_variables JSONB DEFAULT NULL;

-- Step 2: Create a function to get standardized invoice variables
CREATE OR REPLACE FUNCTION get_standardized_invoice_variables(
  p_invoice_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- Basic invoice info
    'invoice_id', i.id,
    'invoice_number', COALESCE(i.invoice_number, i.id::text),
    'invoice_date', TO_CHAR(i.created_at, 'DD.MM.YYYY'),
    'issue_date', TO_CHAR(i.created_at, 'DD.MM.YYYY'),
    'due_date', COALESCE(TO_CHAR(i.due_date, 'DD.MM.YYYY'), ''),
    'payment_date', COALESCE(TO_CHAR(i.payment_date, 'DD.MM.YYYY'), ''),
    'created_at', TO_CHAR(i.created_at, 'DD.MM.YYYY HH24:MI'),
    
    -- Status and amounts
    'status', i.status,
    'currency', COALESCE(i.currency, 'PLN'),
    'subtotal_amount', COALESCE(i.subtotal_amount, 0),
    'tax_amount', COALESCE(i.tax_amount, 0),
    'total_amount', COALESCE(i.total_amount, 0),
    'paid_amount', COALESCE(i.paid_amount, 0),
    'remaining_amount', COALESCE(i.total_amount - i.paid_amount, i.total_amount),
    
    -- Formatted amounts for display
    'total_amount_formatted', COALESCE(i.total_amount::text || ' ' || i.currency, '0 PLN'),
    'subtotal_amount_formatted', COALESCE(i.subtotal_amount::text || ' ' || i.currency, '0 PLN'),
    'tax_amount_formatted', COALESCE(i.tax_amount::text || ' ' || i.currency, '0 PLN'),
    'remaining_amount_formatted', COALESCE((i.total_amount - i.paid_amount)::text || ' ' || i.currency, '0 PLN'),
    
    -- Notes and descriptions
    'notes', COALESCE(i.notes, ''),
    'description', COALESCE(i.description, ''),
    'payment_terms', COALESCE(i.payment_terms, ''),
    
    -- Customer information
    'customer_id', c.id,
    'customer_name', c.name,
    'customer_email', COALESCE(c.email, ''),
    'customer_tax_id', COALESCE(c.tax_id, ''),
    'customer_address', COALESCE(c.address, ''),
    'customer_city', COALESCE(c.city, ''),
    'customer_postal_code', COALESCE(c.postal_code, ''),
    'customer_country', COALESCE(c.country, 'Polska'),
    'customer_phone', COALESCE(c.phone, ''),
    
    -- Business profile (issuer) information
    'business_id', bp.id,
    'business_name', bp.name,
    'business_email', COALESCE(bp.email, ''),
    'business_phone', COALESCE(bp.phone, ''),
    'business_tax_id', COALESCE(bp.tax_id, ''),
    'business_address', COALESCE(bp.address, ''),
    'business_city', COALESCE(bp.city, ''),
    'business_postal_code', COALESCE(bp.postal_code, ''),
    'business_country', COALESCE(bp.country, 'Polska'),
    'business_bank_account', COALESCE(bp.bank_account, ''),
    
    -- Invoice items (as JSON array)
    'items', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'name', ii.name,
          'description', COALESCE(ii.description, ''),
          'quantity', ii.quantity,
          'unit', COALESCE(ii.unit, 'szt.'),
          'unit_price', ii.unit_price,
          'tax_rate', COALESCE(ii.tax_rate, 0),
          'total_price', ii.total_price,
          'total_price_formatted', ii.total_price::text || ' ' || COALESCE(i.currency, 'PLN')
        )
      )
      FROM invoice_items ii
      WHERE ii.invoice_id = i.id
      ORDER BY ii.created_at),
      '[]'::jsonb
    ),
    
    -- Calculated fields
    'items_count', (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id),
    'is_paid', CASE WHEN i.status = 'paid' THEN true ELSE false END,
    'is_overdue', CASE WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' THEN true ELSE false END,
    'days_until_due', CASE 
      WHEN i.due_date IS NOT NULL THEN EXTRACT(DAY FROM (i.due_date - CURRENT_DATE))::int
      ELSE NULL
    END,
    
    -- URLs (to be filled by application)
    'invoice_url', '',
    'download_pdf_url', '',
    'payment_url', ''
  )
  INTO v_result
  FROM invoices i
  LEFT JOIN customers c ON c.id = i.customer_id
  LEFT JOIN business_profiles bp ON bp.id = i.business_profile_id
  WHERE i.id = p_invoice_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Insert the new "Send Invoice to Client" template
INSERT INTO email_templates (
  name,
  template_key,
  category,
  description,
  subject_pl,
  subject_en,
  body_html_pl,
  body_html_en,
  variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Wyślij Fakturę do Klienta',
  'send_invoice_to_client',
  'invoicing',
  'Email template for sending invoices to clients - uses standardized invoice variables',
  'Otrzymałeś fakturę nr {{invoice_number}} od {{business_name}}',
  'You received invoice #{{invoice_number}} from {{business_name}}',
  '<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Faktura {{invoice_number}}</title>
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .px { padding-left: 16px !important; padding-right: 16px !important; }
        .py { padding-top: 16px !important; padding-bottom: 16px !important; }
      }
    </style>
  </head>

  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;color:#333;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:28px 0;">
      <tr>
        <td align="center">
          <!-- Container -->
          <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

            <!-- Header -->
            <tr>
              <td class="px py" style="padding:24px 28px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);">
                <div style="font-size:24px;font-weight:700;color:#ffffff;">{{business_name}}</div>
                <div style="margin-top:4px;font-size:14px;color:rgba(255,255,255,0.9);">
                  {{business_address}}, {{business_city}} {{business_postal_code}}
                </div>
                <div style="margin-top:2px;font-size:13px;color:rgba(255,255,255,0.85);">
                  NIP: {{business_tax_id}}
                </div>
              </td>
            </tr>

            <!-- Main Content -->
            <tr>
              <td class="px" style="padding:28px;">
                <div style="font-size:16px;line-height:1.6;color:#333;">
                  Dzień dobry,
                </div>
                
                <div style="margin-top:16px;font-size:15px;line-height:1.7;color:#555;">
                  Otrzymałeś fakturę od <strong style="color:#2563eb;">{{business_name}}</strong>.
                </div>

                {{#custom_message}}
                <div style="margin-top:16px;padding:16px;background:#f0f9ff;border-left:4px solid #2563eb;border-radius:4px;">
                  <div style="font-size:14px;line-height:1.6;color:#333;">
                    {{custom_message}}
                  </div>
                </div>
                {{/custom_message}}

                <!-- Invoice Details Card -->
                <div style="margin-top:24px;padding:20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                  <div style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:16px;">
                    Faktura nr {{invoice_number}}
                  </div>
                  
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#64748b;">Data wystawienia:</td>
                      <td align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:#1e293b;">{{invoice_date}}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#64748b;border-top:1px solid #e2e8f0;">Termin płatności:</td>
                      <td align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:#dc2626;border-top:1px solid #e2e8f0;">{{due_date}}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#64748b;border-top:1px solid #e2e8f0;">Kwota do zapłaty:</td>
                      <td align="right" style="padding:8px 0;font-size:18px;font-weight:700;color:#2563eb;border-top:1px solid #e2e8f0;">{{total_amount_formatted}}</td>
                    </tr>
                  </table>
                </div>

                <!-- Invoice Items -->
                <div style="margin-top:24px;">
                  <div style="font-size:16px;font-weight:600;color:#1e293b;margin-bottom:12px;">
                    Pozycje faktury:
                  </div>
                  
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                    <thead>
                      <tr style="background:#f8fafc;">
                        <th style="padding:12px;text-align:left;font-size:13px;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">Nazwa</th>
                        <th style="padding:12px;text-align:center;font-size:13px;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">Ilość</th>
                        <th style="padding:12px;text-align:right;font-size:13px;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">Cena jedn.</th>
                        <th style="padding:12px;text-align:right;font-size:13px;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">Wartość</th>
                      </tr>
                    </thead>
                    <tbody>
                      {{#items}}
                      <tr>
                        <td style="padding:12px;font-size:14px;color:#1e293b;border-bottom:1px solid #f1f5f9;">
                          <div style="font-weight:500;">{{item.name}}</div>
                          {{#item.description}}
                          <div style="font-size:12px;color:#64748b;margin-top:2px;">{{item.description}}</div>
                          {{/item.description}}
                        </td>
                        <td style="padding:12px;text-align:center;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9;">{{item.quantity}} {{item.unit}}</td>
                        <td style="padding:12px;text-align:right;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9;">{{item.unit_price}} {{currency}}</td>
                        <td style="padding:12px;text-align:right;font-size:14px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">{{item.total_price_formatted}}</td>
                      </tr>
                      {{/items}}
                    </tbody>
                  </table>
                </div>

                <!-- Payment Details -->
                <div style="margin-top:24px;padding:16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;">
                  <div style="font-size:14px;font-weight:600;color:#92400e;margin-bottom:8px;">
                    Dane do przelewu:
                  </div>
                  <div style="font-size:13px;color:#78350f;line-height:1.6;">
                    <strong>{{business_name}}</strong><br/>
                    {{#business_bank_account}}
                    Numer konta: <strong>{{business_bank_account}}</strong><br/>
                    {{/business_bank_account}}
                    Tytuł przelewu: <strong>Faktura {{invoice_number}}</strong>
                  </div>
                </div>

                {{#notes}}
                <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:6px;">
                  <div style="font-size:13px;font-weight:600;color:#64748b;margin-bottom:6px;">Uwagi:</div>
                  <div style="font-size:13px;color:#475569;line-height:1.6;">{{notes}}</div>
                </div>
                {{/notes}}

                <div style="margin-top:24px;font-size:14px;line-height:1.6;color:#64748b;">
                  W razie pytań prosimy o kontakt:<br/>
                  Email: <a href="mailto:{{business_email}}" style="color:#2563eb;text-decoration:none;">{{business_email}}</a><br/>
                  {{#business_phone}}
                  Telefon: {{business_phone}}
                  {{/business_phone}}
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="px" style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <div style="font-size:12px;color:#94a3b8;line-height:1.5;">
                  Ten email został wygenerowany automatycznie. Prosimy nie odpowiadać na tę wiadomość.
                </div>
                <div style="margin-top:8px;font-size:11px;color:#cbd5e1;">
                  © {{business_name}} • Faktura wygenerowana przez KsięgaI
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>',
  '<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Invoice {{invoice_number}}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:28px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;">
            <tr>
              <td style="padding:24px 28px;background:#2563eb;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;">{{business_name}}</h1>
                <p style="margin:4px 0 0 0;font-size:14px;">Invoice #{{invoice_number}}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p>Dear {{customer_name}},</p>
                <p>You have received an invoice from <strong>{{business_name}}</strong>.</p>
                <p><strong>Amount Due:</strong> {{total_amount_formatted}}<br/>
                <strong>Due Date:</strong> {{due_date}}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>',
  ARRAY[
    'invoice_id', 'invoice_number', 'invoice_date', 'issue_date', 'due_date', 'payment_date',
    'status', 'currency', 'subtotal_amount', 'tax_amount', 'total_amount', 'paid_amount', 'remaining_amount',
    'total_amount_formatted', 'subtotal_amount_formatted', 'tax_amount_formatted', 'remaining_amount_formatted',
    'notes', 'description', 'payment_terms',
    'customer_id', 'customer_name', 'customer_email', 'customer_tax_id', 'customer_address', 'customer_city', 'customer_postal_code', 'customer_country', 'customer_phone',
    'business_id', 'business_name', 'business_email', 'business_phone', 'business_tax_id', 'business_address', 'business_city', 'business_postal_code', 'business_country', 'business_bank_account',
    'items', 'items_count', 'is_paid', 'is_overdue', 'days_until_due',
    'custom_message'
  ],
  true,
  NOW(),
  NOW()
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  body_html_pl = EXCLUDED.body_html_pl,
  body_html_en = EXCLUDED.body_html_en,
  subject_pl = EXCLUDED.subject_pl,
  subject_en = EXCLUDED.subject_en,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Step 4: Update existing invoice_generated template to use standardized variables
UPDATE email_templates 
SET invoice_variables = jsonb_build_object(
  'use_standardized', true,
  'additional_variables', ARRAY['year']
)
WHERE template_key = 'invoice_generated';

COMMENT ON COLUMN email_templates.invoice_variables IS 'JSONB field indicating if template uses standardized invoice variables. Set {"use_standardized": true} to enable automatic invoice variable injection.';
COMMENT ON FUNCTION get_standardized_invoice_variables IS 'Returns a standardized JSONB object with all invoice-related variables for email templates. Call this function with an invoice_id to get all variables in one place.';
