import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";

const ALLOWED_ROLES = ["director", "lead"];

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

async function roleCheck(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ allowed: false, error: "missing_token" }, 401, req.headers.get("origin"));

  const supabaseUrl = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return json({ allowed: false, error: "invalid_token" }, 401, req.headers.get("origin"));
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: roles, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .in("role", ALLOWED_ROLES);
  if (roleError || !roles?.length) {
    return json({ allowed: false, error: "role_not_allowed" }, 403, req.headers.get("origin"));
  }
  return json({ allowed: true }, 200, req.headers.get("origin"));
}

function page(req: Request) {
  const supabaseUrl = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");
  const endpoint = new URL(req.url);
  endpoint.search = "";

  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>เธญเธเธธเธเธฒเธ• Woranat MCP</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f4f7fb; color: #14213d; }
    main { max-width: 520px; margin: 8vh auto; background: white; padding: 32px; border-radius: 18px; box-shadow: 0 18px 50px rgba(21,45,80,.12); }
    h1 { margin-top: 0; color: #163b6d; }
    label { display: block; margin: 14px 0 6px; font-weight: 650; }
    input { box-sizing: border-box; width: 100%; padding: 12px; border: 1px solid #b9c5d6; border-radius: 9px; font-size: 16px; }
    button { border: 0; border-radius: 9px; padding: 11px 18px; font-size: 15px; font-weight: 700; cursor: pointer; }
    .primary { background: #1769aa; color: white; }
    .secondary { background: #e8eef6; color: #243b55; }
    .danger { background: #8f1d2c; color: white; }
    .actions { display: flex; gap: 10px; margin-top: 22px; }
    .notice { background: #edf5ff; border-left: 4px solid #1769aa; padding: 12px 14px; border-radius: 6px; }
    .error { color: #8f1d2c; white-space: pre-wrap; }
    .muted { color: #5c677d; font-size: 14px; }
    .hidden { display: none; }
    ul { padding-left: 22px; }
  </style>
</head>
<body>
<main>
  <h1>Woranat School MCP</h1>
  <p class="notice">เธฃเธฐเธเธเธเธตเนเนเธซเน ChatGPT Workspace เธญเนเธฒเธเธเนเธญเธกเธนเธฅเธเธฃเธดเธซเธฒเธฃ ATLAS เนเธฅเธฐเธญเธเธธเธเธฒเธฅ เนเธ”เธขเนเธกเนเธฃเธงเธก Special Care เนเธเธเธฒเธฃเธเธณเธเธงเธ“ Gap เนเธฅเธฐเธญเธเธธเธเธฒเธ•เน€เธเธเธฒเธฐเธเธนเนเธเธฃเธดเธซเธฒเธฃเธซเธฃเธทเธญเธซเธฑเธงเธซเธเนเธฒเธเธฒเธ</p>
  <p id="status" class="muted">เธเธณเธฅเธฑเธเธ•เธฃเธงเธเธชเธญเธเธเธณเธเธญโ€ฆ</p>
  <p id="error" class="error hidden"></p>

  <form id="login" class="hidden">
    <label for="email">เธญเธตเน€เธกเธฅเธเธฑเธเธเธตเนเธฃเธเน€เธฃเธตเธขเธ</label>
    <input id="email" type="email" autocomplete="username" required>
    <label for="password">เธฃเธซเธฑเธชเธเนเธฒเธ</label>
    <input id="password" type="password" autocomplete="current-password" required>
    <div class="actions"><button class="primary" type="submit">เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ</button></div>
  </form>

  <section id="consent" class="hidden">
    <h2>เธขเธทเธเธขเธฑเธเธเธฒเธฃเน€เธเธทเนเธญเธกเธ•เนเธญ</h2>
    <p><strong>เนเธญเธ:</strong> <span id="client-name"></span></p>
    <p><strong>เธชเธดเธ—เธเธดเนเธ—เธตเนเธฃเนเธญเธเธเธญ:</strong></p>
    <ul id="scopes"></ul>
    <p class="muted">เน€เธเธฃเธทเนเธญเธเธกเธทเธญเธฃเธฒเธขเธเธธเธเธเธฅเธเธญเธเน€เธ”เนเธเธ–เธนเธเธเธดเธ”เน€เธเนเธเธเนเธฒเน€เธฃเธดเนเธกเธ•เนเธ เนเธฅเธฐเธเธฒเธฃเน€เธฃเธตเธขเธเน€เธเธฃเธทเนเธญเธเธกเธทเธญเธขเธฑเธเธญเธขเธนเนเธ เธฒเธขเนเธ•เนเธชเธดเธ—เธเธดเนเธเธญเธ Workspace</p>
    <div class="actions">
      <button id="approve" class="primary" type="button">เธญเธเธธเธเธฒเธ•</button>
      <button id="deny" class="danger" type="button">เธเธเธดเน€เธชเธ</button>
      <button id="logout" class="secondary" type="button">เธญเธญเธเธเธฒเธเธฃเธฐเธเธ</button>
    </div>
  </section>
</main>

<script type="module">
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
  const supabase = createClient(${JSON.stringify(supabaseUrl)}, ${JSON.stringify(anonKey)});
  const roleCheckUrl = ${JSON.stringify(endpoint.toString())};
  const authorizationId = new URLSearchParams(location.search).get("authorization_id");
  const statusEl = document.getElementById("status");
  const errorEl = document.getElementById("error");
  const loginEl = document.getElementById("login");
  const consentEl = document.getElementById("consent");

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    statusEl.classList.add("hidden");
  }
  async function verifyRole(accessToken) {
    const response = await fetch(roleCheckUrl, {
      method: "POST",
      headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
      body: "{}"
    });
    return response.ok;
  }
  async function loadConsent() {
    if (!authorizationId) return showError("เนเธกเนเธเธ authorization_id");
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data.session;
    if (!session) {
      statusEl.textContent = "เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธ”เนเธงเธขเธเธฑเธเธเธตเธ—เธตเนเธกเธตเธเธ—เธเธฒเธ— director เธซเธฃเธทเธญ lead";
      loginEl.classList.remove("hidden");
      return;
    }
    if (!(await verifyRole(session.access_token))) {
      await supabase.auth.signOut();
      loginEl.classList.remove("hidden");
      return showError("เธเธฑเธเธเธตเธเธตเนเนเธกเนเนเธ”เนเธฃเธฑเธเธชเธดเธ—เธเธดเนเน€เธเธทเนเธญเธก Woranat MCP (เธ•เนเธญเธเน€เธเนเธ director เธซเธฃเธทเธญ lead)");
    }

    const detailsResult = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (detailsResult.error || !detailsResult.data) {
      return showError(detailsResult.error?.message || "เธเธณเธเธญเธญเธเธธเธเธฒเธ•เนเธกเนเธ–เธนเธเธ•เนเธญเธ");
    }
    if (!("authorization_id" in detailsResult.data)) {
      location.href = detailsResult.data.redirect_url;
      return;
    }
    document.getElementById("client-name").textContent = detailsResult.data.client?.name || "ChatGPT Workspace";
    const scopes = String(detailsResult.data.scope || "openid email profile").split(/\s+/).filter(Boolean);
    const list = document.getElementById("scopes");
    for (const scope of scopes) {
      const item = document.createElement("li");
      item.textContent = scope;
      list.appendChild(item);
    }
    statusEl.classList.add("hidden");
    errorEl.classList.add("hidden");
    consentEl.classList.remove("hidden");
  }

  loginEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.classList.add("hidden");
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) return showError(result.error.message);
    loginEl.classList.add("hidden");
    statusEl.classList.remove("hidden");
    statusEl.textContent = "เธเธณเธฅเธฑเธเธ•เธฃเธงเธเธชเธญเธเธชเธดเธ—เธเธดเนโ€ฆ";
    await loadConsent();
  });

  document.getElementById("approve").addEventListener("click", async () => {
    const result = await supabase.auth.oauth.approveAuthorization(authorizationId);
    if (result.error) return showError(result.error.message);
    location.href = result.data.redirect_url;
  });
  document.getElementById("deny").addEventListener("click", async () => {
    const result = await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (result.error) return showError(result.error.message);
    location.href = result.data.redirect_url;
  });
  document.getElementById("logout").addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.reload();
  });

  loadConsent().catch((error) => showError(error?.message || "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”"));
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'unsafe-inline' https://esm.sh; connect-src https://*.supabase.co; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
  }
  if (req.method === "POST") return await roleCheck(req);
  if (req.method === "GET" || req.method === "HEAD") return page(req);
  return json({ error: "Method not allowed" }, 405, req.headers.get("origin"));
});


