import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.168.0/node/crypto.ts'
import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { token, signature_data, method, signer_name } = await req.json()

    if (!token || !signature_data || !method) {
      throw new Error('token, signature_data, and method are required')
    }

    // Validate token
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const { data: tokenRecord, error: tokenError } = await supabaseClient
      .from('contract_signer_tokens')
      .select('*, contracts(*)')
      .eq('token_hash', tokenHash)
      .eq('is_valid', true)
      .is('used_at', null)
      .single()

    if (tokenError || !tokenRecord) {
      throw new Error('Invalid or expired token')
    }

    // Check token expiry
    if (new Date() > new Date(tokenRecord.expires_at)) {
      throw new Error('Token has expired')
    }

    const contract = tokenRecord.contracts
    const contractId = contract.id

    // Get client IP and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Fetch original contract PDF
    let originalPdfBytes: Uint8Array
    if (contract.file_url) {
      const pdfResponse = await fetch(contract.file_url)
      originalPdfBytes = new Uint8Array(await pdfResponse.arrayBuffer())
    } else {
      throw new Error('Contract PDF not found')
    }

    // Calculate hash of original PDF
    const originalPdfHash = createHash('sha256').update(originalPdfBytes).digest('hex')

    // Load PDF
    const pdfDoc = await PDFDocument.load(originalPdfBytes)
    
    // Add signature page
    const signaturePage = pdfDoc.addPage([595, 842]) // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Add signature section
    signaturePage.drawText('SIGNATURE PAGE', {
      x: 50,
      y: 750,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    })

    signaturePage.drawText('This document has been electronically signed', {
      x: 50,
      y: 720,
      size: 12,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    })

    // Add signer information
    const signedAt = new Date()
    signaturePage.drawText(`Signed by: ${signer_name || tokenRecord.signer_email}`, {
      x: 50,
      y: 680,
      size: 11,
      font: font,
    })

    signaturePage.drawText(`Email: ${tokenRecord.signer_email}`, {
      x: 50,
      y: 660,
      size: 11,
      font: font,
    })

    signaturePage.drawText(`Date: ${signedAt.toISOString()}`, {
      x: 50,
      y: 640,
      size: 11,
      font: font,
    })

    signaturePage.drawText(`Method: ${method === 'drawn' ? 'Hand-drawn signature' : 'Typed signature'}`, {
      x: 50,
      y: 620,
      size: 11,
      font: font,
    })

    signaturePage.drawText(`IP Address: ${ipAddress}`, {
      x: 50,
      y: 600,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Embed signature image
    let signatureImage
    try {
      const signatureBytes = Uint8Array.from(atob(signature_data.split(',')[1]), c => c.charCodeAt(0))
      signatureImage = await pdfDoc.embedPng(signatureBytes)
      
      const signatureDims = signatureImage.scale(0.3)
      signaturePage.drawImage(signatureImage, {
        x: 50,
        y: 450,
        width: signatureDims.width,
        height: signatureDims.height,
      })
    } catch (error) {
      console.error('Error embedding signature image:', error)
    }

    // Add document hash
    signaturePage.drawText('Document Verification', {
      x: 50,
      y: 350,
      size: 12,
      font: boldFont,
    })

    signaturePage.drawText(`Original Document Hash (SHA-256):`, {
      x: 50,
      y: 330,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })

    signaturePage.drawText(originalPdfHash, {
      x: 50,
      y: 315,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Add legal disclaimer
    signaturePage.drawText('This signature is legally binding and has the same legal effect as a handwritten signature.', {
      x: 50,
      y: 280,
      size: 8,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    })

    // Save signed PDF
    const signedPdfBytes = await pdfDoc.save()
    const signedPdfHash = createHash('sha256').update(signedPdfBytes).digest('hex')

    // Upload signed PDF to storage
    const fileName = `contract-${contractId}-signed-${Date.now()}.pdf`
    const filePath = `signed-contracts/${fileName}`

    const { error: uploadError } = await supabaseClient.storage
      .from('documents')
      .upload(filePath, signedPdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Failed to upload signed PDF: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('documents')
      .getPublicUrl(filePath)

    // Mark token as used
    await supabaseClient
      .from('contract_signer_tokens')
      .update({ used_at: signedAt.toISOString() })
      .eq('id', tokenRecord.id)

    // Create or update signer record
    const signerPayload = {
      contract_id: contractId,
      signer_email: tokenRecord.signer_email,
      signer_name: signer_name || tokenRecord.signer_email,
      signer_role: 'client',
      method,
      status: 'signed',
      signature_data,
      signed_at: signedAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      document_hash: originalPdfHash,
      verification_status: contract.simple_auto_accept ? 'accepted' : 'pending_review',
    }

    const { data: existingSigner } = await supabaseClient
      .from('contract_signers')
      .select('id')
      .eq('contract_id', contractId)
      .eq('signer_email', tokenRecord.signer_email)
      .single()

    if (existingSigner) {
      await supabaseClient
        .from('contract_signers')
        .update(signerPayload)
        .eq('id', existingSigner.id)
    } else {
      await supabaseClient
        .from('contract_signers')
        .insert(signerPayload)
    }

    // Update contract with signed PDF (SOURCE OF TRUTH)
    await supabaseClient
      .from('contracts')
      .update({
        status: contract.simple_auto_accept ? 'signed' : 'pending_review',
        signed_pdf_storage_path: filePath,
        signed_pdf_sha256: signedPdfHash,
        signed_at: signedAt.toISOString(),
        signed_method: method,
      })
      .eq('id', contractId)

    // Log audit event
    await supabaseClient
      .from('contract_audit_events')
      .insert({
        contract_id: contractId,
        event_type: 'contract_signed',
        event_data: {
          method,
          signer_email: tokenRecord.signer_email,
          signer_name,
          auto_accepted: contract.simple_auto_accept,
        },
        actor_email: tokenRecord.signer_email,
        ip_address: ipAddress,
        user_agent: userAgent,
        document_sha256_at_time: originalPdfHash,
      })

    return new Response(
      JSON.stringify({
        success: true,
        contract_id: contractId,
        signed_pdf_url: publicUrl,
        signed_at: signedAt.toISOString(),
        requires_admin_approval: !contract.simple_auto_accept,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error completing contract signing:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
