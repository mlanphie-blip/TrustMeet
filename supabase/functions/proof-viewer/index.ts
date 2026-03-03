import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const shareId = url.searchParams.get("id");

  if (!shareId) {
    return new Response(renderHTML(null, "Missing proof ID"), {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: share, error } = await supabase
    .from("proof_shares")
    .select("*")
    .eq("id", shareId)
    .single();

  if (error || !share) {
    return new Response(renderHTML(null, "Proof not found"), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const now = new Date();
  const expiresAt = new Date(share.expires_at);

  if (expiresAt < now) {
    return new Response(renderHTML(null, "This proof has expired"), {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(renderHTML(share, null), {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});

interface ProofShare {
  id: string;
  user_id: string;
  photo_url: string | null;
  handle: string | null;
  share_type: string;
  created_at: string;
  expires_at: string;
}

function renderHTML(share: ProofShare | null, errorMsg: string | null): string {
  if (errorMsg) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChatVerify - Proof Unavailable</title>
  <meta property="og:title" content="ChatVerify - Proof Unavailable">
  <meta property="og:description" content="${errorMsg}">
  ${baseStyles()}
</head>
<body>
  <div class="card">
    <div class="logo">ChatVerify</div>
    <div class="error-icon">✕</div>
    <h1 class="error-title">${errorMsg}</h1>
    <p class="subtitle">This verification proof is no longer available.</p>
  </div>
</body>
</html>`;
  }

  const isIncognito = share!.share_type === "incognito";
  const handle = share!.handle ? `@${share!.handle}` : "Anonymous";
  const sharedAt = new Date(share!.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const expiresAt = new Date(share!.expires_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const ogDescription = isIncognito
    ? `${handle} is a verified human on ChatVerify.`
    : `${handle} is ID verified on ChatVerify.`;

  const avatarSection = isIncognito
    ? `<div class="avatar-placeholder">
        <span class="avatar-icon">✓</span>
      </div>`
    : share!.photo_url
      ? `<img class="avatar" src="${share!.photo_url}" alt="Profile photo">`
      : `<div class="avatar-placeholder">
          <span class="avatar-icon">✓</span>
        </div>`;

  const proofLabel = isIncognito ? "Verified Human" : "ID Verified";
  const proofDescription = isIncognito
    ? "This user has been verified as a real person on ChatVerify. No personal photo was shared with this proof."
    : "This user has completed full identity verification on ChatVerify, including a photo match.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChatVerify - ${proofLabel}</title>
  <meta property="og:title" content="${handle} - ${proofLabel} on ChatVerify">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:type" content="profile">
  ${share!.photo_url && !isIncognito ? `<meta property="og:image" content="${share!.photo_url}">` : ""}
  ${baseStyles()}
</head>
<body>
  <div class="card">
    <div class="logo">ChatVerify</div>

    ${avatarSection}

    <h1 class="handle">${handle}</h1>

    <div class="badge">
      <span class="badge-check">✓</span>
      <span>${proofLabel}</span>
    </div>

    <p class="description">${proofDescription}</p>

    <div class="meta">
      <div class="meta-row">
        <span class="meta-label">Shared</span>
        <span class="meta-value">${sharedAt}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Expires</span>
        <span class="meta-value">${expiresAt}</span>
      </div>
    </div>

    <div class="footer">
      <p>Verified by ChatVerify</p>
    </div>
  </div>
</body>
</html>`;
}

function baseStyles(): string {
  return `<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .card {
      background: #1a1a1a;
      border-radius: 20px;
      padding: 40px 30px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      border: 1px solid #333;
    }
    .logo {
      font-size: 14px;
      font-weight: 700;
      color: #00e676;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 30px;
    }
    .avatar {
      width: 120px;
      height: 120px;
      border-radius: 60px;
      border: 3px solid #00e676;
      object-fit: cover;
      margin-bottom: 16px;
    }
    .avatar-placeholder {
      width: 120px;
      height: 120px;
      border-radius: 60px;
      background: #0d2e1a;
      border: 3px solid #00e676;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 16px;
    }
    .avatar-icon {
      font-size: 48px;
      color: #00e676;
    }
    .handle {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0d2e1a;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      color: #00e676;
      margin-bottom: 20px;
    }
    .badge-check {
      font-weight: bold;
    }
    .description {
      color: #aaa;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .meta {
      background: #111;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
    }
    .meta-label {
      color: #888;
      font-size: 13px;
    }
    .meta-value {
      color: #ccc;
      font-size: 13px;
    }
    .footer {
      color: #555;
      font-size: 12px;
    }
    .error-icon {
      width: 80px;
      height: 80px;
      border-radius: 40px;
      background: #2a1a1a;
      border: 3px solid #ff5252;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      font-size: 36px;
      color: #ff5252;
      margin-bottom: 16px;
    }
    .error-title {
      font-size: 20px;
      color: #ff5252;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #888;
      font-size: 14px;
    }
  </style>`;
}
