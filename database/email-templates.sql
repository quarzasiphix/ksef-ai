-- Email template for sending invoices to clients
-- This should be inserted into the email_templates table using the same structure as admin system

INSERT INTO email_templates (
  name,
  template_key,
  subject,
  subject_pl,
  html_content,
  body_html_pl,
  text_content,
  is_active,
  category,
  description,
  variables,
  created_at,
  updated_at
) VALUES (
  'Invoice Email Template',
  'invoice_email',
  'Invoice {{invoice_number}} from {{business_name}}',
  'Faktura nr {{invoice_number}} od {{business_name}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{invoice_number}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; }
        .invoice-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 25px; }
        .section h3 { color: #007bff; margin-bottom: 10px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .items-table th { background-color: #f8f9fa; font-weight: bold; }
        .items-table .amount { text-align: right; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 15px; }
        .footer { border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #666; }
        .custom-message { background: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">{{business_name}}</div>
            <p>{{business_address}}, {{business_city}} {{business_postal_code}}</p>
            <p>{{business_country}} | NIP: {{business_tax_id}}</p>
            <p>Email: {{business_email}} | Phone: {{business_phone}}</p>
        </div>

        <div class="invoice-info">
            <h2>Invoice #{{invoice_number}}</h2>
            <p><strong>Date:</strong> {{invoice_date}}</p>
            <p><strong>Due Date:</strong> {{due_date}}</p>
            <p><strong>Status:</strong> {{status}}</p>
        </div>

        <div class="section">
            <h3>Bill To:</h3>
            <p><strong>{{customer_name}}</strong></p>
            {{#customer_address}}<p>{{customer_address}}</p>{{/customer_address}}
            {{#customer_city}}<p>{{customer_city}} {{customer_postal_code}}</p>{{/customer_city}}
            {{#customer_country}}<p>{{customer_country}}</p>{{/customer_country}}
            {{#customer_tax_id}}<p>NIP: {{customer_tax_id}}</p>{{/customer_tax_id}}
            <p>Email: {{customer_email}}</p>
        </div>

        {{#custom_message}}
        <div class="custom-message">
            <h3>Message:</h3>
            <p>{{custom_message}}</p>
        </div>
        {{/custom_message}}

        <div class="section">
            <h3>Invoice Items:</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th class="amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {{#items}}
                    <tr>
                        <td>{{item.description}}</td>
                        <td>{{item.quantity}}</td>
                        <td>{{currency}} {{item.unit_price}}</td>
                        <td class="amount">{{currency}} {{item.total_price}}</td>
                    </tr>
                    {{/items}}
                </tbody>
            </table>
            
            <div class="total">
                Total: {{currency}} {{total_amount}}
            </div>
        </div>

        {{#notes}}
        <div class="section">
            <h3>Notes:</h3>
            <p>{{notes}}</p>
        </div>
        {{/notes}}

        <div class="footer">
            <p>This is an automatically generated invoice from {{business_name}}.</p>
            <p>If you have any questions, please contact us at {{business_email}}.</p>
        </div>
    </div>
</body>
</html>',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faktura {{invoice_number}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; }
        .invoice-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 25px; }
        .section h3 { color: #007bff; margin-bottom: 10px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .items-table th { background-color: #f8f9fa; font-weight: bold; }
        .items-table .amount { text-align: right; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 15px; }
        .footer { border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #666; }
        .custom-message { background: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">{{business_name}}</div>
            <p>{{business_address}}, {{business_city}} {{business_postal_code}}</p>
            <p>{{business_country}} | NIP: {{business_tax_id}}</p>
            <p>Email: {{business_email}} | Phone: {{business_phone}}</p>
        </div>

        <div class="invoice-info">
            <h2>Faktura nr {{invoice_number}}</h2>
            <p><strong>Data:</strong> {{invoice_date}}</p>
            <p><strong>Termin płatności:</strong> {{due_date}}</p>
            <p><strong>Status:</strong> {{status}}</p>
        </div>

        <div class="section">
            <h3>Odbiorca:</h3>
            <p><strong>{{customer_name}}</strong></p>
            {{#customer_address}}<p>{{customer_address}}</p>{{/customer_address}}
            {{#customer_city}}<p>{{customer_city}} {{customer_postal_code}}</p>{{/customer_city}}
            {{#customer_country}}<p>{{customer_country}}</p>{{/customer_country}}
            {{#customer_tax_id}}<p>NIP: {{customer_tax_id}}</p>{{/customer_tax_id}}
            <p>Email: {{customer_email}}</p>
        </div>

        {{#custom_message}}
        <div class="custom-message">
            <h3>Wiadomość:</h3>
            <p>{{custom_message}}</p>
        </div>
        {{/custom_message}}

        <div class="section">
            <h3>Pozycje faktury:</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Opis</th>
                        <th>Ilość</th>
                        <th>Cena jednostkowa</th>
                        <th class="amount">Wartość</th>
                    </tr>
                </thead>
                <tbody>
                    {{#items}}
                    <tr>
                        <td>{{item.description}}</td>
                        <td>{{item.quantity}}</td>
                        <td>{{currency}} {{item.unit_price}}</td>
                        <td class="amount">{{currency}} {{item.total_price}}</td>
                    </tr>
                    {{/items}}
                </tbody>
            </table>
            
            <div class="total">
                Razem: {{currency}} {{total_amount}}
            </div>
        </div>

        {{#notes}}
        <div class="section">
            <h3>Uwagi:</h3>
            <p>{{notes}}</p>
        </div>
        {{/notes}}

        <div class="footer">
            <p>To jest automatycznie wygenerowana faktura od {{business_name}}.</p>
            <p>W przypadku pytań prosimy o kontakt pod adresem {{business_email}}.</p>
        </div>
    </div>
</body>
</html>',
  'Invoice #{{invoice_number}} from {{business_name}}

Date: {{invoice_date}}
Due Date: {{due_date}}
Status: {{status}}

Bill To:
{{customer_name}}
{{customer_address}}
{{customer_city}} {{customer_postal_code}}
{{customer_country}}
NIP: {{customer_tax_id}}
Email: {{customer_email}}

{{#custom_message}}
Message:
{{custom_message}}

{{/custom_message}}
Invoice Items:
{{#items}}
- {{item.description}} ({{item.quantity}} x {{currency}} {{item.unit_price}}) = {{currency}} {{item.total_price}}
{{/items}}

Total: {{currency}} {{total_amount}}

{{#notes}}
Notes:
{{notes}}
{{/notes}}

---
This is an automatically generated invoice from {{business_name}}.
If you have any questions, please contact us at {{business_email}}.',
  true,
  'invoice',
  'Template for sending invoices to clients with all invoice details and items',
  ARRAY['invoice_number', 'invoice_date', 'due_date', 'total_amount', 'currency', 'status', 'notes', 'custom_message', 'customer_name', 'customer_email', 'customer_tax_id', 'customer_address', 'customer_city', 'customer_postal_code', 'customer_country', 'business_name', 'business_address', 'business_city', 'business_postal_code', 'business_country', 'business_tax_id', 'business_email', 'business_phone', 'email', 'items'],
  NOW(),
  NOW()
);

-- Create email_send_logs table for audit purposes
CREATE TABLE IF NOT EXISTS email_send_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  recipient_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_send_logs_invoice_id ON email_send_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_user_id ON email_send_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_workspace_id ON email_send_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_sent_at ON email_send_logs(sent_at);
