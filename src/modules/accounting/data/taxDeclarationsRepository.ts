import { supabase } from "../../../integrations/supabase/client";
import { createTaxDeclarationGenerator, type TaxDeclarationData } from "@/shared/utils/tax/taxDeclarationGenerator";
import type { Invoice } from "@/shared/types";

export interface TaxDeclaration {
  id: string;
  business_profile_id: string;
  user_id: string;
  month: string; // YYYY-MM
  declaration_type: string; // JPK_V7M, PIT_zaliczka, ZUS_DRA, etc.
  file_name: string;
  file_url?: string;
  xml_content: string;
  status: "generated" | "filed" | "error";
  generated_at: string;
  filed_at?: string;
  metadata?: {
    total_income: number;
    total_expenses: number;
    vat_total: number;
    invoice_count: number;
  };
}

/**
 * Generate and save a tax declaration
 */
export async function generateTaxDeclaration(
  businessProfileId: string,
  userId: string,
  month: string,
  declarationType: string,
  invoices: Invoice[]
): Promise<TaxDeclaration> {
  try {
    // Calculate totals from invoices
    const monthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.issueDate);
      const [year, monthNum] = month.split('-');
      return invDate.getFullYear() === parseInt(year) && 
             invDate.getMonth() === parseInt(monthNum) - 1;
    });

    const totalIncome = monthInvoices
      .filter(inv => inv.transactionType === 'income')
      .reduce((sum, inv) => sum + (inv.totalGrossValue || 0), 0);

    const totalExpenses = monthInvoices
      .filter(inv => inv.transactionType === 'expense')
      .reduce((sum, inv) => sum + (inv.totalGrossValue || 0), 0);

    const vatTotal = monthInvoices
      .reduce((sum, inv) => sum + (inv.totalVatValue || 0), 0);

    // Create declaration data
    const declarationData: TaxDeclarationData = {
      month,
      businessProfileId,
      userId,
      invoices: monthInvoices,
      totalIncome,
      totalExpenses,
      vatTotal
    };

    // Generate XML
    const generator = createTaxDeclarationGenerator(declarationData);
    const generated = generator.generateDeclaration(declarationType);

    // Upload to storage
    const fileName = `${declarationType}_${month}_${Date.now()}.xml`;
    const storagePath = `tax-declarations/${userId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('tax-declarations')
      .upload(storagePath, new Blob([generated.xmlContent], { type: 'application/xml' }), {
        upsert: true,
        contentType: 'application/xml'
      });

    if (uploadError) {
      throw new Error(`Failed to upload declaration: ${uploadError.message}`);
    }

    // Get signed URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from('tax-declarations')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30); // 30 days

    if (urlError) {
      throw new Error(`Failed to create signed URL: ${urlError.message}`);
    }

    // Save to database
    const { data, error } = await supabase
      .from('tax_declarations')
      .insert({
        business_profile_id: businessProfileId,
        user_id: userId,
        month,
        declaration_type: declarationType,
        file_name: fileName,
        file_url: urlData.signedUrl,
        xml_content: generated.xmlContent,
        status: 'generated',
        generated_at: new Date().toISOString(),
        metadata: {
          total_income: totalIncome,
          total_expenses: totalExpenses,
          vat_total: vatTotal,
          invoice_count: monthInvoices.length
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save declaration: ${error.message}`);
    }

    return data as TaxDeclaration;
  } catch (error) {
    console.error('Error generating tax declaration:', error);
    throw error;
  }
}

/**
 * List all tax declarations for a business profile
 */
export async function listTaxDeclarations(businessProfileId: string): Promise<TaxDeclaration[]> {
  const { data, error } = await supabase
    .from('tax_declarations')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('generated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list declarations: ${error.message}`);
  }

  return (data || []) as TaxDeclaration[];
}

/**
 * Get a specific tax declaration
 */
export async function getTaxDeclaration(id: string): Promise<TaxDeclaration> {
  const { data, error } = await supabase
    .from('tax_declarations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to get declaration: ${error.message}`);
  }

  return data as TaxDeclaration;
}

/**
 * Update declaration status
 */
export async function updateDeclarationStatus(
  id: string, 
  status: "generated" | "filed" | "error",
  filedAt?: string
): Promise<void> {
  const updateData: any = { status };
  if (filedAt) {
    updateData.filed_at = filedAt;
  }

  const { error } = await supabase
    .from('tax_declarations')
    .update(updateData)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update declaration status: ${error.message}`);
  }
}

/**
 * Delete a tax declaration
 */
export async function deleteTaxDeclaration(id: string): Promise<void> {
  // Get declaration to get file path
  const declaration = await getTaxDeclaration(id);
  
  // Delete from storage
  if (declaration.file_name) {
    const storagePath = `tax-declarations/${declaration.user_id}/${declaration.file_name}`;
    await supabase.storage
      .from('tax-declarations')
      .remove([storagePath]);
  }

  // Delete from database
  const { error } = await supabase
    .from('tax_declarations')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete declaration: ${error.message}`);
  }
}

/**
 * Get download URL for a declaration
 */
export async function getDeclarationDownloadUrl(id: string): Promise<string> {
  const declaration = await getTaxDeclaration(id);
  
  if (!declaration.file_name) {
    throw new Error('Declaration file not found');
  }

  const storagePath = `tax-declarations/${declaration.user_id}/${declaration.file_name}`;
  const { data, error } = await supabase.storage
    .from('tax-declarations')
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create download URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Check if declaration exists for given month and type
 */
export async function checkDeclarationExists(
  businessProfileId: string,
  month: string,
  declarationType: string
): Promise<TaxDeclaration | null> {
  const { data, error } = await supabase
    .from('tax_declarations')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('month', month)
    .eq('declaration_type', declarationType)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Failed to check declaration: ${error.message}`);
  }

  return data as TaxDeclaration | null;
} 