import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { error: "Missing authorization" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json(500, { error: "Server configuration error" });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authError } = await userClient.auth.getUser();
  const user = userData?.user;
  if (authError || !user) {
    return json(401, { error: "Invalid user" });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return json(403, { error: "Admin access required" });
  }

  let body: { enabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  if (typeof body.enabled !== "boolean") {
    return json(400, { error: "enabled must be a boolean" });
  }
  const enabled = body.enabled;

  const ghToken = Deno.env.get("GH_ACTIONS_TOKEN");
  const ghRepo = Deno.env.get("GH_REPO");
  if (!ghToken || !ghRepo) {
    return json(500, { error: "Holiday mode is not configured on the server" });
  }

  const ghHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${ghToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  const workflowPath = "supabase-keepalive.yml";
  const workflowBase = `https://api.github.com/repos/${ghRepo}/actions/workflows/${workflowPath}`;

  try {
    if (enabled) {
      const enableRes = await fetch(`${workflowBase}/enable`, {
        method: "PUT",
        headers: ghHeaders,
      });
      if (!enableRes.ok) {
        return json(enableRes.status, { error: "Failed to enable keepalive workflow" });
      }

      const repoRes = await fetch(`https://api.github.com/repos/${ghRepo}`, {
        headers: ghHeaders,
      });
      if (!repoRes.ok) {
        return json(repoRes.status, { error: "Failed to read repository default branch" });
      }
      const repoData = await repoRes.json();
      const defaultBranch = typeof repoData?.default_branch === "string" ? repoData.default_branch : "";
      if (!defaultBranch) {
        return json(500, { error: "Repository default branch not found" });
      }

      const dispatchRes = await fetch(`${workflowBase}/dispatches`, {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ ref: defaultBranch }),
      });
      if (!dispatchRes.ok) {
        return json(dispatchRes.status, { error: "Failed to dispatch keepalive workflow" });
      }
    } else {
      const disableRes = await fetch(`${workflowBase}/disable`, {
        method: "PUT",
        headers: ghHeaders,
      });
      if (!disableRes.ok) {
        return json(disableRes.status, { error: "Failed to disable keepalive workflow" });
      }
    }

    const { error: upsertError } = await serviceClient
      .from("app_flags")
      .upsert({
        key: "holiday_mode",
        enabled,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, { onConflict: "key" });

    if (upsertError) {
      console.error("[holiday-mode] app_flags upsert failed", upsertError.message);
      return json(500, { error: "Failed to update holiday mode flag" });
    }

    return json(200, { enabled });
  } catch (err) {
    console.error("[holiday-mode] unexpected error", err instanceof Error ? err.message : String(err));
    return json(500, { error: "Failed to update holiday mode" });
  }
});
