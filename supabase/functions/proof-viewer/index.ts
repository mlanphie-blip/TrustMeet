import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const shareId = url.searchParams.get("id");

  if (!shareId) {
    return jsonResponse({ error: "Missing proof ID" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: share, error } = await supabase
    .from("proof_shares")
    .select("*")
    .eq("id", shareId)
    .single();

  if (error || !share) {
    return jsonResponse({ error: "Proof not found" }, 404);
  }

  const now = new Date();
  const expiresAt = new Date(share.expires_at);

  if (expiresAt < now) {
    return jsonResponse({ error: "This proof has expired" }, 410);
  }

  return jsonResponse({
    id: share.id,
    handle: share.handle,
    photo_url: share.photo_url,
    share_type: share.share_type,
    created_at: share.created_at,
    expires_at: share.expires_at,
  });
});
