import { supabase } from "../../../integrations/supabase/client";

const BUCKET = "filed.taxes";

export interface UploadTaxFormInput {
  businessProfileId: string;
  year: number; // e.g. 2024
  month: number; // 1-12 (January = 1)
  formType: string; // e.g. "VAT", "PIT-36"
  file: Blob;
}

/**
 * Uploads a generated tax-form PDF or XML to the private `tax-forms` bucket.
 * Returns the storage path (not a signed URL).
 */
export async function uploadTaxForm({ businessProfileId, year, month, formType, file }: UploadTaxFormInput): Promise<string> {
  const ext = file.type.includes("pdf") ? "pdf" : file.type.includes("xml") ? "xml" : "bin";
  const paddedMonth = month.toString().padStart(2, "0");
  const storagePath = `${businessProfileId}/${year}/${paddedMonth}/${formType}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  return storagePath;
}

/**
 * Generates a time-limited signed URL (defaults to 1 hour) for a stored tax form.
 */
export async function getTaxFormSignedUrl(storagePath: string, expiresInSeconds = 60 * 60): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) throw error || new Error("Failed to create signed URL");
  return data.signedUrl;
}

export interface SaveFiledTaxFormInput {
  businessProfileId: string;
  userId: string;
  month: string; // YYYY-MM
  formType: string;
  storagePath: string;
  status?: "generated" | "filed" | "zalegly";
  filedAt?: string | null; // ISO8601
}

/**
 * Persists a record in the `filed_tax_forms` table so we can track what was filed/generated.
 */
export async function saveFiledTaxForm({ businessProfileId, userId, month, formType, storagePath, status = "generated", filedAt = null, }: SaveFiledTaxFormInput) {
  const { error } = await (supabase as any)
    .from("filed_tax_forms")
    .insert({
      business_profile_id: businessProfileId,
      user_id: userId,
      month,
      form_type: formType,
      file_url: storagePath, // we store the storage path; resolve signed URL on demand
      status,
      filed_at: filedAt,
    });
  if (error) throw error;
} 