import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const url = new URL(req.url)
    const documentId = url.searchParams.get('documentId')
    const fileId = url.searchParams.get('fileId')
    const action = url.searchParams.get('action') || 'view'

    if (!documentId && !fileId) {
      return new Response(JSON.stringify({ error: 'Document ID or File ID required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    let filePath: string | null = null
    let fileName: string | null = null
    const bucket = 'documents'

    if (documentId) {
      const { data: document, error: docError } = await supabaseClient
        .from('documents')
        .select('file_path, file_name, business_profile_id')
        .eq('id', documentId)
        .single()

      if (docError || !document) {
        return new Response(JSON.stringify({ error: 'Document not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      const { data: profile } = await supabaseClient
        .from('business_profiles')
        .select('id')
        .eq('id', document.business_profile_id)
        .eq('user_id', user.id)
        .single()

      if (!profile) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }

      filePath = document.file_path
      fileName = document.file_name
    } else if (fileId) {
      const { data: file, error: fileError } = await supabaseClient
        .from('storage_files')
        .select('file_path, file_name, business_profile_id')
        .eq('id', fileId)
        .single()

      if (fileError || !file) {
        return new Response(JSON.stringify({ error: 'File not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      const { data: profile } = await supabaseClient
        .from('business_profiles')
        .select('id')
        .eq('id', file.business_profile_id)
        .eq('user_id', user.id)
        .single()

      if (!profile) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }

      filePath = file.file_path
      fileName = file.file_name
    }

    if (!filePath) {
      return new Response(JSON.stringify({ error: 'File path not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const expiresIn = action === 'download' ? 60 : 3600
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient
      .storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn, {
        download: action === 'download' ? fileName || true : false
      })

    if (signedUrlError || !signedUrlData) {
      return new Response(JSON.stringify({ error: 'Failed to generate URL' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ url: signedUrlData.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
