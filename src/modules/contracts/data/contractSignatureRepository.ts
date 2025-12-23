import { supabase } from "../../../integrations/supabase/client";

export async function signContract(contractId: string, dataUrl: string): Promise<string> {
  // Convert dataURL to Blob
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  const filePath = `contracts/${contractId}.png`;
  // Upload / overwrite
  const { error: uploadError } = await supabase.storage.from("signatures").upload(filePath, blob, {
    contentType: "image/png",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from("signatures").getPublicUrl(filePath);

  // Update contract row
  const { error: updateError } = await (supabase as any)
    .from("contracts")
    .update({ is_signed: true, signed_at: new Date().toISOString(), signature_url: publicUrl })
    .eq("id", contractId);
  if (updateError) throw updateError;

  return publicUrl;
} 